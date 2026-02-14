import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, User, Layout, MessageCircle } from 'lucide-react';
import './FreeStudentMode.css';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const FreeStudentMode = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [step, setStep] = useState('login');
    const [pin, setPin] = useState(location.state?.pin || '');
    const [nickname, setNickname] = useState('');
    const [problem, setProblem] = useState(null);
    const [items, setItems] = useState([]);
    const [currentWidth, setCurrentWidth] = useState(1000);
    const [draggingId, setDraggingId] = useState(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const canvasRef = useRef(null);
    const [feedback, setFeedback] = useState(null);

    const fontScale = problem ? currentWidth / (problem.baseWidth || 1000) : 1;

    useEffect(() => {
        if (!socket) return;
        socket.on('messageReceived', (data) => {
            setFeedback(data.message);
            setTimeout(() => setFeedback(null), 5000);
        });
        return () => socket.disconnect();
    }, [socket]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setCurrentWidth(entry.contentRect.width);
            }
        });
        observer.observe(canvasRef.current);
        return () => observer.disconnect();
    }, [step]);

    useEffect(() => {
        // Auto-join if state exists (from StudentLogin)
        if (location.state?.pin && location.state?.nickname && location.state?.autoJoin && step === 'login') {
            setPin(location.state.pin);
            setNickname(location.state.nickname);
            // We need a small delay or use the values directly to avoid closure issues
            performJoin(location.state.pin, location.state.nickname);
        }
    }, [location.state]);

    const performJoin = async (targetPin, targetNickname) => {
        try {
            // Firestore에서 PIN으로 직접 문제 찾기
            const q = query(
                collection(db, 'problems'),
                where('pinNumber', '==', targetPin)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const problemDoc = querySnapshot.docs[0];
                const probData = problemDoc.data();
                const problemId = problemDoc.id;

                if (probData.type !== 'free-drop') {
                    alert('자유 보드 문제가 아닙니다.');
                    return;
                }

                setProblem({ id: problemId, ...probData });
                setItems((probData.items || []).map(item => ({
                    ...item,
                    isPlaced: item.isPlaced || false
                })));

                // 소켓 연결 (실시간 상호작용은 유지)
                const newSocket = io(import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com');
                setSocket(newSocket);

                newSocket.emit('joinProblem', {
                    problemId: problemId,
                    studentName: targetNickname
                });

                setStep('game');
            } else {
                alert('유효하지 않은 PIN 번호입니다.');
            }
        } catch (error) {
            console.error('Join Error:', error);
            alert('접속 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const handleJoin = () => performJoin(pin, nickname);

    const handleMouseDown = (e, id, fromTray = false) => {
        const item = items.find(i => i.id === id);
        if (!item || !canvasRef.current) return;

        const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0].clientX;
        const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0].clientY;

        if (clientX === undefined || clientY === undefined) return;

        setDraggingId(id);

        if (fromTray || !item.isPlaced) {
            dragOffset.current = { x: 0, y: 0 };
        } else {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const itemXPixels = (item.x / 100) * canvasRect.width;
            const itemYPixels = (item.y / 100) * canvasRect.height;
            dragOffset.current = {
                x: clientX - canvasRect.left - itemXPixels,
                y: clientY - canvasRect.top - itemYPixels
            };
        }
    };

    const handleMouseMove = (e) => {
        if (!draggingId || !canvasRef.current) return;

        // Prevent default behavior to stop text selection/blocks during drag
        if (e.cancelable) e.preventDefault();

        const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0].clientX;
        const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0].clientY;

        if (clientX === undefined || clientY === undefined) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();

        const isOverCanvas = (
            clientX >= canvasRect.left &&
            clientX <= canvasRect.right &&
            clientY >= canvasRect.top &&
            clientY <= canvasRect.bottom
        );

        if (isOverCanvas) {
            const newXPercent = ((clientX - canvasRect.left - dragOffset.current.x) / canvasRect.width) * 100;
            const newYPercent = ((clientY - canvasRect.top - dragOffset.current.y) / canvasRect.height) * 100;

            setItems(prev => prev.map(item =>
                item.id === draggingId ? {
                    ...item,
                    x: Math.max(0, Math.min(newXPercent, 100)),
                    y: Math.max(0, Math.min(newYPercent, 100)),
                    isPlaced: true
                } : item
            ));
        }
    };

    const handleMouseUp = () => {
        if (draggingId) {
            syncAnswerWithServer();
        }
        setDraggingId(null);
    };

    const handleReturnToTray = (id) => {
        const nextItems = items.map(item =>
            item.id === id ? { ...item, isPlaced: false, x: 0, y: 0 } : item
        );
        setItems(nextItems);
        syncAnswerWithServer(nextItems);
    };

    const syncAnswerWithServer = (currentItems = items) => {
        const answerData = currentItems.map(({ id, x, y, isPlaced }) => ({ id, x, y, isPlaced }));
        socket?.emit('submitAnswer', {
            problemId: problem.id,
            studentName: nickname,
            answer: answerData
        });
    };

    if (step === 'login') {
        return (
            <div className="student-login-container">
                <div className="login-card glass-panel">
                    <div className="icon-circle" style={{ background: '#0ea5e9' }}>
                        <User size={32} color="white" />
                    </div>
                    <h2>학생 입장</h2>
                    <input type="text" placeholder="PIN 번호" value={pin} onChange={(e) => setPin(e.target.value)} />
                    <input type="text" placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                    <button className="btn-primary" onClick={handleJoin}>입장하기</button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="free-student-wrapper"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
        >
            <nav className="game-nav">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={20} /> 나가기
                </button>
                <div className="user-info">
                    <User size={16} /> <span>{nickname}</span>
                </div>
            </nav>

            <main className="student-main">
                {/* Item Tray */}
                <section className="student-tray-area">
                    <div className="tray-header">
                        <Layout size={14} /> <span>카드 보관함</span>
                    </div>
                    <div className="student-tray">
                        {items.filter(i => !i.isPlaced).map(item => (
                            <div
                                key={item.id}
                                className={`tray-item ${item.type}`}
                                onMouseDown={(e) => handleMouseDown(e, item.id, true)}
                                onTouchStart={(e) => handleMouseDown(e, item.id, true)}
                                style={{
                                    fontSize: item.type === 'text' ? `${item.fontSize * fontScale}px` : 'inherit',
                                    opacity: draggingId === item.id ? 0.5 : 1
                                }}
                            >
                                {item.type === 'text' ? item.content : <img src={item.imageUrl} alt="img" draggable="false" />}
                            </div>
                        ))}
                        {items.filter(i => !i.isPlaced).length === 0 && (
                            <div className="empty-msg">모든 카드를 배치했습니다!</div>
                        )}
                    </div>
                </section>

                {/* Canvas Area */}
                <section className="student-canvas-workspace">
                    <div
                        className="student-canvas-container"
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            backgroundColor: 'white',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                    >
                        <img
                            src={problem.backgroundUrl}
                            alt="background"
                            style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }}
                        />
                        <div
                            className="student-master-canvas"
                            ref={canvasRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%'
                            }}
                        >
                            {items.filter(i => i.isPlaced).map(item => (
                                <div
                                    key={item.id}
                                    className={`placed-item ${item.type} ${draggingId === item.id ? 'dragging' : ''}`}
                                    onMouseDown={(e) => handleMouseDown(e, item.id)}
                                    onTouchStart={(e) => handleMouseDown(e, item.id)}
                                    style={{
                                        left: `${item.x}%`,
                                        top: `${item.y}%`,
                                        width: item.type === 'image' ? `${item.width || 15}%` : 'auto',
                                        fontSize: item.type === 'text' ? `${item.fontSize * fontScale}px` : 'inherit',
                                        zIndex: draggingId === item.id ? 1000 : 10,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                >
                                    {item.type === 'text' ? item.content : <img src={item.imageUrl} alt="img" style={{ width: '100%' }} draggable="false" />}
                                    <button
                                        className="item-return-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReturnToTray(item.id);
                                        }}
                                        title="보관함으로 되돌리기"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {feedback && (
                <div className="teacher-feedback-toast">
                    <MessageCircle size={18} />
                    <div className="feedback-body">
                        <span className="feedback-label">선생님의 피드백</span>
                        <p className="feedback-content">{feedback}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FreeStudentMode;
