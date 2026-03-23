import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, User, X, Check, Loader2 } from 'lucide-react';
import './OrderStudentMode.css';
import LatexRenderer from '../../components/LatexRenderer';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const OrderStudentMode = ({ lessonProblemData = null, lessonRoomId = null, lessonNickname = null, lessonSocket = null }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLessonMode = !!lessonProblemData;

    const [socket, setSocket] = useState(lessonSocket);
    const [step, setStep] = useState(isLessonMode || location.state?.autoJoin ? 'joining' : 'login');
    const [pin, setPin] = useState(isLessonMode ? (lessonProblemData.pinNumber || '') : (location.state?.pin || ''));
    const [nickname, setNickname] = useState(isLessonMode ? lessonNickname : (location.state?.nickname || ''));
    const [problem, setProblem] = useState(lessonProblemData);

    // Game State
    const [shuffledSteps, setShuffledSteps] = useState([]); // Remaining cards
    const [userOrder, setUserOrder] = useState([]); // User's answer area
    const [isCompleted, setIsCompleted] = useState(false);

    // Message
    const [lastMessage, setLastMessage] = useState(null);

    // Socket Connection
    useEffect(() => {
        if (!socket) return;

        const handleMessage = (data) => {
            setLastMessage(data);
            setTimeout(() => setLastMessage(null), 5000);
        };

        socket.on('messageReceived', handleMessage);
        return () => socket.off('messageReceived', handleMessage);
    }, [socket]);

    // Lesson Mode / Auto Join
    useEffect(() => {
        if (isLessonMode && lessonProblemData) {
            setProblem(lessonProblemData);

            const normalizedSteps = (lessonProblemData.steps || []).map((step, idx) => {
                if (typeof step === 'string') return { id: `step-${idx}`, text: step };
                return step;
            });

            setProblem({ id: lessonProblemData.id, ...lessonProblemData, steps: normalizedSteps });
            setShuffledSteps(shuffleArray(normalizedSteps));
            setUserOrder([]);
            setIsCompleted(false);
            setStep('game');
        } else if (location.state?.autoJoin && location.state?.pin && location.state?.nickname) {
            setPin(location.state.pin);
            setNickname(location.state.nickname);
            joinGame(location.state.pin, location.state.nickname);
        }
    }, [isLessonMode, lessonProblemData, location.state]);

    const handleJoin = () => joinGame(pin, nickname);

    const joinGame = async (targetPin, targetNick) => {
        if (!targetPin || !targetNick) {
            alert('PIN 번호와 닉네임을 모두 입력해주세요.');
            return;
        }

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

                if (probData.type !== 'order-matching') {
                    alert('순서 맞추기 문제가 아닙니다.');
                    return;
                }

                // 데이터가 이전 방식으로 저장되었을 경우를 대비한 방어적 처리
                const normalizedSteps = (probData.steps || []).map((step, idx) => {
                    if (typeof step === 'string') return { id: `step-${idx}`, text: step };
                    return step;
                });

                setProblem({ id: problemId, ...probData, steps: normalizedSteps });
                setShuffledSteps(shuffleArray(normalizedSteps));

                // 소켓 연결 (실시간 상호작용은 유지)
                const newSocket = io(import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com');
                setSocket(newSocket);

                // 연결 시 또는 재연결 시 자동으로 방 입장 수행
                const joinRoom = () => {
                    console.log('Socket Connected. Joining/Re-joining room:', problemId);
                    newSocket.emit('joinProblem', {
                        problemId: problemId,
                        studentName: targetNick
                    });
                };

                if (newSocket.connected) {
                    joinRoom();
                }
                newSocket.on('connect', joinRoom);

                setStep('game');
            } else {
                alert('유효하지 않은 PIN 번호입니다.');
            }
        } catch (error) {
            console.error('Join Error:', error);
            alert('접속 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const shuffleArray = (array) => {
        return [...array].sort(() => Math.random() - 0.5);
    };

    // --- DnD Logic (@hello-pangea/dnd) ---

    const onDragEnd = (result) => {
        const { source, destination } = result;

        // 드롭 위치가 없으면 원위치
        if (!destination) return;

        // 같은 위치면 무시
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const newUserOrder = [...userOrder];
        const newShuffledSteps = [...shuffledSteps];

        // 리스트 간 이동
        if (source.droppableId !== destination.droppableId) {
            // 보관함 -> 답안 영역
            if (source.droppableId === 'bank' && destination.droppableId === 'answer') {
                const [item] = newShuffledSteps.splice(source.index, 1);
                newUserOrder.splice(destination.index, 0, item);
            }
            // 답안 영역 -> 보관함
            else if (source.droppableId === 'answer' && destination.droppableId === 'bank') {
                const [item] = newUserOrder.splice(source.index, 1);
                newShuffledSteps.splice(destination.index, 0, item);
            }
        }
        // 같은 리스트 내에서 순서 변경
        else {
            if (source.droppableId === 'answer') {
                const [removed] = newUserOrder.splice(source.index, 1);
                newUserOrder.splice(destination.index, 0, removed);
            } else {
                const [removed] = newShuffledSteps.splice(source.index, 1);
                newShuffledSteps.splice(destination.index, 0, removed);
            }
        }

        setUserOrder(newUserOrder);
        setShuffledSteps(newShuffledSteps);
        updateAnswerToServer(newUserOrder);
    };

    const handleRemoveStep = (index) => {
        const newUserOrder = [...userOrder];
        const [item] = newUserOrder.splice(index, 1);
        const newShuffledSteps = [...shuffledSteps, item];

        setUserOrder(newUserOrder);
        setShuffledSteps(newShuffledSteps);
        updateAnswerToServer(newUserOrder);
    };

    const updateAnswerToServer = (newOrder) => {
        socket?.emit(isLessonMode ? 'submitLessonAnswer' : 'submitAnswer', {
            [isLessonMode ? 'lessonId' : 'problemId']: isLessonMode ? lessonRoomId : problem.id,
            studentName: nickname,
            answer: newOrder
        });

        // 완료 체크
        if (newOrder.length === problem.steps.length) {
            const correctIds = problem.steps.map(s => s.id).join(',');
            const userIds = newOrder.map(s => s.id).join(',');

            if (userIds === correctIds) {
                setIsCompleted(true);
            } else {
                setIsCompleted(false);
            }
        } else {
            setIsCompleted(false);
        }
    };

    // --- Render ---

    if (step === 'joining') {
        return (
            <div className="student-login-container">
                <div className="login-card-round" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1.5rem' }}>
                    <Loader2 className="animate-spin" size={48} style={{ color: 'var(--color-brand-yellow)' }} />
                    <p style={{ color: '#8D7B75', fontSize: '1.1rem' }}>교실에 입장하고 있어요...</p>
                </div>
            </div>
        );
    }

    if (step === 'login') {
        return (
            <div className="student-login-container">
                <div className="login-card glass-panel">
                    <div className="icon-circle">
                        <User size={32} color="white" />
                    </div>
                    <h2>학생 입장 (순서 맞추기)</h2>
                    <input
                        type="text"
                        placeholder="PIN 번호 (6자리)"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={6}
                    />
                    <input
                        type="text"
                        placeholder="닉네임"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />
                    <button className="btn-primary" onClick={handleJoin}>
                        입장하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="om-student-container">
            <nav className="game-nav">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={20} /> 나가기
                </button>
                <div className="user-info">
                    <User size={16} /> {nickname}
                </div>
            </nav>

            <main className="om-game-content full-height">
                <div className="header-area">
                    <h2 className="problem-title"><LatexRenderer text={problem.title} /></h2>
                    <p className="instruction">오른쪽의 카드를 왼쪽으로 드래그하여 순서를 맞추세요.</p>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="split-layout">
                        {/* Left: Answer Zone */}
                        <div className="scan-zone answer-zone">
                            <h3 className="zone-title">답안 영역 ({userOrder.length})</h3>

                            <Droppable droppableId="answer">
                                {(provided, snapshot) => (
                                    <div
                                        className={`scroll-area ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        {/* 중복된 empty-placeholder 제거 */}

                                        {userOrder.map((item, index) => (
                                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`order-card filled ${snapshot.isDragging ? 'dragging' : ''}`}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                        }}
                                                    >
                                                        <div className="card-index">{index + 1}</div>
                                                        <div className="card-text"><LatexRenderer text={item.text} /></div>
                                                        <button className="btn-return" onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveStep(index);
                                                        }}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}

                                        {/* 카드가 없을 때만 안내 문구 표시 */}
                                        {userOrder.length === 0 && (
                                            <div className="empty-drop-guide-message">
                                                이곳에 카드를 드래그하여 순서를 맞추세요
                                            </div>
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>

                        {/* Right: Resource Bank */}
                        <div className="scan-zone resource-zone">
                            <h3 className="zone-title">카드 보관함</h3>

                            <Droppable droppableId="bank">
                                {(provided, snapshot) => (
                                    <div
                                        className={`scroll-area cards-grid-scroll ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        {shuffledSteps.length === 0 ? (
                                            <div className="empty-placeholder">
                                                <Check size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                                모든 카드를 사용했습니다
                                            </div>
                                        ) : (
                                            shuffledSteps.map((item, index) => (
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`order-card bank-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                            }}
                                                        >
                                                            <div className="card-text">
                                                                <LatexRenderer text={item.text} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    </div>
                </DragDropContext>

                {/* Footer / Status */}
                <div className="game-footer">
                    {isCompleted ? (
                        <div className="status-badge success">
                            🎉 정답입니다!
                        </div>
                    ) : (
                        userOrder.length === problem.steps.length ? (
                            <div className="status-badge warning">
                                ⚠️ 순서를 확인해보세요
                            </div>
                        ) : (
                            <div className="status-badge neutral">
                                {userOrder.length} / {problem.steps.length} 배치됨
                            </div>
                        )
                    )}
                </div>

                {/* Toast */}
                {lastMessage && (
                    <div className="message-toast-overlay">
                        <div className="message-toast">
                            <div className="toast-header">
                                <strong>🔔 {lastMessage.from === '선생님' ? '선생님의' : `${lastMessage.from}님의`} 메시지</strong>
                                <button onClick={() => setLastMessage(null)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="toast-body">
                                {lastMessage.message}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrderStudentMode;

