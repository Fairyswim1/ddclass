import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, User, X, Check } from 'lucide-react';
import './OrderStudentMode.css';

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
    const [draggedStep, setDraggedStep] = useState(null);
    const [draggedFromSource, setDraggedFromSource] = useState(null); // 'userOrder' | 'shuffledSteps'
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

        // Optional: Receive correctness feedback immediately? 
        // For now, client-side check or just completion check

        return () => socket.off('messageReceived');
    }, [socket]);

    // Auto Join if redirected
    useEffect(() => {
        if (location.state?.autoJoin && location.state?.pin && location.state?.nickname) {
            // Set state for display in input fields, but use direct args for joinGame
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
                // If type is not order-matching, warn or redirect?
                // Assuming find-problem returns correct type, or we handle robustly.
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
                    // Try fill-blanks fallback just in case? Or error
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

    // --- DnD Logic (Refined for Split Layout) ---

    const handleDragStart = (e, step, source, index) => {
        setDraggedStep(step);
        setDraggedFromSource(source);
        // source가 userOrder일 때만 index가 의미 있음
        e.dataTransfer.setData('text/plain', String(step.id));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setTimeout(() => {
            setDraggedStep(null);
            setDraggedFromSource(null);
        }, 100);
    };

    const handleDropAtIndex = (targetIndex) => {
        if (!draggedStep) return;

        let newUserOrder = [...userOrder];
        let newShuffledSteps = [...shuffledSteps];

        if (draggedFromSource === 'userOrder') {
            // Reorder within Answer
            const sourceIndex = userOrder.findIndex(s => s.id === draggedStep.id);
            if (sourceIndex === -1) return; // Error case

            const [removed] = newUserOrder.splice(sourceIndex, 1);
            // Adjust target index if shifting affects it
            const adjustedIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
            newUserOrder.splice(adjustedIndex, 0, removed);
        } else {
            // Move Bank -> Answer
            newShuffledSteps = shuffledSteps.filter(s => s.id !== draggedStep.id);
            newUserOrder.splice(targetIndex, 0, draggedStep);
        }

        setUserOrder(newUserOrder);
        setShuffledSteps(newShuffledSteps);
        updateAnswerToServer(newUserOrder);
        setDraggedStep(null);
    };

    const handleRemoveStep = (stepId) => {
        const item = userOrder.find(s => s.id === stepId);
        if (item) {
            const newUserOrder = userOrder.filter(s => s.id !== stepId);
            const newShuffledSteps = [...shuffledSteps, item];
            setUserOrder(newUserOrder);
            setShuffledSteps(newShuffledSteps);
            updateAnswerToServer(newUserOrder);

            // Clear drag state immediately (element might be removed)
            setDraggedStep(null);
            setDraggedFromSource(null);
        }
    };

    // Drop handler for Bank (return card)
    const handleDropToBank = (e) => {
        e.preventDefault();
        if (!draggedStep || draggedFromSource !== 'userOrder') return;
        handleRemoveStep(draggedStep.id);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // --- Components ---

    const DropSlot = ({ index }) => {
        const [isHovering, setIsHovering] = useState(false);

        const handleDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsHovering(true);
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsHovering(false);
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Parent의 generic drop 무시
            setIsHovering(false);
            handleDropAtIndex(index);
        };

        return (
            <div
                className={`drop-slot ${isHovering ? 'active' : ''} ${draggedStep ? 'visible' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isHovering && draggedStep && (
                    <div className="drop-guide">
                        <span>여기 놓기</span>
                    </div>
                )}
            </div>
        );
    };

    const updateAnswerToServer = (newOrder) => {
        // Send current answer state to teacher
        // reusing 'submitAnswer' event. 
        // ProblemMonitor uses 'answer' as object/map for fill-blanks.
        // For order-matching, we should send an array. 
        // Monitor needs to handle this difference.

        socket?.emit('submitAnswer', {
            problemId: problem.id,
            studentName: nickname,
            answer: newOrder // Array of step objects
        });

        // Check completion (All steps used)
        if (newOrder.length === problem.steps.length) {
            // Simple Client-side check for now (Teacher sets order)
            // Ideally server validates, but current API stores steps in order.

            // Reconstruct IDs string for comparison
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
                    <h2 className="problem-title">{problem.title}</h2>
                    <p className="instruction">오른쪽의 카드를 왼쪽으로 드래그하여 순서를 맞추세요.</p>
                </div>

                <div className="split-layout">
                    {/* Left: Answer Zone */}
                    <div className="scan-zone answer-zone">
                        <h3 className="zone-title">답안 영역 ({userOrder.length})</h3>

                        <div
                            className="scroll-area"
                            onDragOver={handleDragOver}
                            onDrop={(e) => {
                                e.preventDefault();
                                // DropSlot이나 다른 요소에서 이미 처리된 경우 무시하려면
                                // DropSlot의 stopPropagation이 필요함.
                                // 현재 구조상 DropSlot이 위에 있으므로 stopPropagation하면 여기로 안 옴.
                                // 하지만 만약 놓친 경우엔 맨 뒤로.
                                handleDropAtIndex(userOrder.length);
                            }}
                        >
                            <DropSlot index={0} />

                            {userOrder.length === 0 && (
                                <div className="empty-placeholder" style={{ pointerEvents: 'none' }}>
                                    카드를 이곳으로 끌어오세요
                                </div>
                            )}

                            {userOrder.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <div
                                        className={`order-card filled ${draggedStep?.id === item.id ? 'dragging' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item, 'userOrder', index)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => e.stopPropagation()} // Prevent bubble
                                    >
                                        <div className="card-index">{index + 1}</div>
                                        <div className="card-text">{item.text}</div>
                                        <button className="btn-return" onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveStep(item.id);
                                        }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <DropSlot index={index + 1} />
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Right: Resource Bank */}
                    <div
                        className={`scan-zone resource-zone ${draggedFromSource === 'userOrder' ? 'drop-target-active' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={handleDropToBank}
                    >
                        <h3 className="zone-title">카드 보관함</h3>

                        <div className="scroll-area cards-grid-scroll">
                            {draggedFromSource === 'userOrder' && (
                                <div className="return-guide-overlay">
                                    <div className="guide-content">
                                        <X size={32} />
                                        <span>카드를 놓아서 되돌리기</span>
                                    </div>
                                </div>
                            )}

                            {shuffledSteps.length === 0 && draggedFromSource !== 'userOrder' ? (
                                <div className="empty-placeholder">
                                    <Check size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                    모든 카드를 사용했습니다
                                </div>
                            ) : (
                                shuffledSteps.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`order-card bank-item ${draggedStep?.id === item.id ? 'dragging' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item, 'shuffledSteps', index)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        {item.text}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

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
