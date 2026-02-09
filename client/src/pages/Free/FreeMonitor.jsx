import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, Users, Layout, Send } from 'lucide-react';
import './FreeMonitor.css';

const FreeMonitor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [problem, setProblem] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudentName, setSelectedStudentName] = useState(null);
    const [message, setMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const [detailWidth, setDetailWidth] = useState(1000);
    const detailCanvasRef = useRef(null);

    const selectedStudent = students.find(s => s.name === selectedStudentName);

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const response = await fetch(`http://localhost:3000/api/free-drop/${id}`);
                const data = await response.json();
                if (data.success) {
                    setProblem(data.problem);
                } else {
                    alert('문제를 찾을 수 없습니다.');
                    navigate('/');
                }
            } catch (error) {
                console.error(error);
                navigate('/');
            }
        };
        fetchProblem();
    }, [id, navigate]);

    useEffect(() => {
        if (!problem) return;

        const newSocket = io('http://localhost:3000');
        setSocket(newSocket);

        newSocket.emit('joinProblem', {
            problemId: id,
            studentName: 'TEACHER_MONITOR'
        });

        newSocket.on('studentJoined', (student) => {
            if (student.name === 'TEACHER_MONITOR') return;
            setStudents(prev => {
                if (prev.find(s => s.name === student.name)) return prev;
                return [...prev, { ...student, answer: problem.items }];
            });
        });

        newSocket.on('answerUpdated', (data) => {
            if (data.name === 'TEACHER_MONITOR') return;
            setStudents(prev => {
                const exists = prev.find(s => s.name === data.name);
                if (exists) {
                    return prev.map(s => s.name === data.name ? { ...s, answer: data.answer } : s);
                } else {
                    return [...prev, { id: data.id, name: data.name, answer: data.answer }];
                }
            });
        });

        return () => newSocket.disconnect();
    }, [problem, id]);

    const getFontScale = (currentW) => {
        if (!problem?.baseWidth) return 1;
        return currentW / problem.baseWidth;
    };

    useEffect(() => {
        if (!detailCanvasRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setDetailWidth(entry.contentRect.width);
            }
        });
        observer.observe(detailCanvasRef.current);
        return () => observer.disconnect();
    }, [selectedStudentName]);

    const handleSendMessage = () => {
        if (!socket || !selectedStudent || !message.trim()) return;
        socket.emit('sendMessage', {
            studentSocketId: selectedStudent.id,
            message: message.trim(),
            teacherName: '교사'
        });
        setMessage('');
        alert('메시지를 전송했습니다.');
    };

    return (
        <div className="free-monitor-container">
            <nav className="game-nav">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={20} /> 종료
                </button>
                <h2>모니터링: {problem?.title}</h2>
            </nav>

            <div className="monitor-stats">
                <div className="stat-card">
                    <Users size={20} />
                    <span>{students.length}명 접속 중</span>
                </div>
                <div className="pin-tag">PIN: {problem?.pinNumber}</div>
            </div>

            <div className="student-grid">
                {students.map(student => (
                    <div
                        key={student.name}
                        className="student-thumbnail clickable"
                        onClick={() => setSelectedStudentName(student.name)}
                    >
                        <div className="thumb-header">{student.name}</div>
                        <div
                            className="thumb-canvas-container"
                            style={{
                                position: 'relative',
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                backgroundColor: '#f1f5f9',
                                overflow: 'hidden'
                            }}
                        >
                            <img
                                src={problem?.backgroundUrl}
                                alt="thumb"
                                style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }}
                            />
                            <div
                                className="thumb-canvas"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%'
                                }}
                            >
                                {student.answer && student.answer.filter(i => i.isPlaced).map((item, idx) => {
                                    const originalItem = problem?.items.find(i => i.id === item.id);
                                    return (
                                        <div
                                            key={item.id || idx}
                                            className={`mini-item ${originalItem?.type || 'text'}`}
                                            style={{
                                                left: `${item.x}%`,
                                                top: `${item.y}%`,
                                                width: originalItem?.type === 'image' ? `${(item.width || 15) * 0.25}%` : 'auto',
                                                fontSize: (originalItem?.type === 'text') ? `${originalItem.fontSize * 0.25}px` : 'inherit',
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                        >
                                            {originalItem?.type === 'image' ? (
                                                <img src={originalItem.imageUrl} alt="img" style={{ width: '100%' }} />
                                            ) : (
                                                originalItem?.content
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="thumb-footer">
                            배치율: {Math.round((student.answer.filter(i => i.isPlaced).length / (problem?.items.length || 1)) * 100)}%
                        </div>
                    </div>
                ))}
            </div>

            {selectedStudent && (
                <div className="modal-overlay" onClick={() => setSelectedStudentName(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedStudent.name}의 상세 화면</h3>
                            <button className="btn-close" onClick={() => setSelectedStudentName(null)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-tray-view">
                                <div className="detail-label"><Layout size={12} /> 남은 카드</div>
                                <div className="mini-tray">
                                    {selectedStudent.answer.filter(i => !i.isPlaced).map(item => {
                                        const originalItem = problem?.items.find(pi => pi.id === item.id);
                                        return (
                                            <div key={item.id} className="mini-tray-item">
                                                {originalItem?.type === 'text' ? originalItem.content : '이미지'}
                                            </div>
                                        );
                                    })}
                                    {selectedStudent.answer.filter(i => !i.isPlaced).length === 0 && <span>없음</span>}
                                </div>
                            </div>

                            <div
                                className="detail-canvas-container"
                                style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    margin: '0 auto 2rem',
                                    backgroundColor: '#f1f5f9',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    borderRadius: '12px',
                                    overflow: 'hidden'
                                }}
                            >
                                <img
                                    src={problem?.backgroundUrl}
                                    alt="detail"
                                    style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }}
                                />
                                <div
                                    className="detail-canvas"
                                    ref={detailCanvasRef}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%'
                                    }}
                                >
                                    {selectedStudent.answer.filter(i => i.isPlaced).map((item, idx) => {
                                        const originalItem = problem?.items.find(i => i.id === item.id);
                                        const fs = originalItem?.type === 'text' ? originalItem.fontSize * getFontScale(detailWidth) : 0;

                                        return (
                                            <div
                                                key={item.id || idx}
                                                className={`detail-item ${originalItem?.type || 'text'}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${item.x}%`,
                                                    top: `${item.y}%`,
                                                    width: originalItem?.type === 'image' ? `${item.width || 15}%` : 'auto',
                                                    fontSize: fs ? `${fs}px` : 'inherit',
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                            >
                                                {originalItem?.type === 'image' ? (
                                                    <img src={originalItem.imageUrl} alt="item" style={{ width: '100%' }} />
                                                ) : (
                                                    <div className="detail-text-card">
                                                        {originalItem?.content}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="feedback-section">
                                <textarea
                                    placeholder="학생에게 보낼 피드백을 입력하세요..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <button className="btn-send-feedback" onClick={handleSendMessage}>
                                    <Send size={18} /> 전송하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FreeMonitor;
