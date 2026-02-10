import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, User, X, Check } from 'lucide-react';
import './OrderStudentMode.css';
import LatexRenderer from '../../components/LatexRenderer';

const OrderStudentMode = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [step, setStep] = useState('login'); // login, game
    const [pin, setPin] = useState(location.state?.pin || '');
    const [nickname, setNickname] = useState('');
    const [problem, setProblem] = useState(null);

    // Game State
    const [shuffledSteps, setShuffledSteps] = useState([]); // Remaining cards
    const [userOrder, setUserOrder] = useState([]); // User's answer area
    const [isCompleted, setIsCompleted] = useState(false);

    // Message
    const [lastMessage, setLastMessage] = useState(null);

    // Socket Connection
    useEffect(() => {
        if (!socket) return;

        socket.on('messageReceived', (data) => {
            setLastMessage(data);
            setTimeout(() => setLastMessage(null), 5000);
        });

        return () => socket.off('messageReceived');
    }, [socket]);

    // Auto Join if redirected
    useEffect(() => {
        if (location.state?.autoJoin && location.state?.pin && location.state?.nickname) {
            setPin(location.state.pin);
            setNickname(location.state.nickname);
            joinGame(location.state.pin, location.state.nickname);
        }
    }, []);

    const handleJoin = () => joinGame(pin, nickname);

    const joinGame = async (targetPin, targetNick) => {
        if (!targetPin || !targetNick) {
            alert('PIN 번호와 닉네임을 모두 입력해주세요.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/find-problem/${pin}`);
            const data = await response.json();

            if (data.success) {
                const probResponse = await fetch(`http://localhost:3000/api/order-matching/${data.id}`);
                const probData = await probResponse.json();

                if (probData.success) {
                    setProblem(probData.problem);
                    setShuffledSteps(shuffleArray(probData.problem.steps));

                    const newSocket = io('http://localhost:3000');
                    setSocket(newSocket);

                    newSocket.emit('joinProblem', {
                        problemId: data.id,
                        studentName: nickname
                    });

                    setStep('game');
                } else {
                    alert('순서 맞추기 문제가 아닙니다.');
                }
            } else {
                alert('유효하지 않은 PIN 번호입니다.');
            }
        } catch (error) {
            console.error('Join Error:', error);
            alert('접속 중 오류가 발생했습니다.');
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
        socket?.emit('submitAnswer', {
            problemId: problem.id,
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
        <div className="student-game-container">
            <nav className="game-nav">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={20} /> 나가기
                </button>
                <div className="user-info">
                    <User size={16} /> {nickname}
                </div>
            </nav>

            <main className="game-content full-height">
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
                                        {userOrder.length === 0 && (
                                            <div className="empty-placeholder" style={{ pointerEvents: 'none' }}>
                                                카드를 이곳으로 끌어오세요
                                            </div>
                                        )}

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
                                                            <LatexRenderer text={item.text} />
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

