import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, User, X } from 'lucide-react';
import './StudentMode.css';
import LatexRenderer from '../../components/LatexRenderer';

const StudentMode = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [step, setStep] = useState('login'); // login, game
    const [pin, setPin] = useState(location.state?.pin || '');
    const [nickname, setNickname] = useState('');
    const [problem, setProblem] = useState(null);
    const [userAnswers, setUserAnswers] = useState({}); // { blankId: word }
    const [draggedWord, setDraggedWord] = useState(null);
    const [shuffledWords, setShuffledWords] = useState([]);

    // 5. 메시지 수신 (Toast Notification)
    const [lastMessage, setLastMessage] = useState(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('messageReceived', (data) => {
            setLastMessage(data);
            // 5초 후 자동 숨김
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

    // 1. 소켓 연결 및 방 입장
    const joinGame = async (targetPin, targetNick) => {
        if (!targetPin || !targetNick) {
            alert('PIN 번호와 닉네임을 모두 입력해주세요.');
            return;
        }

        try {
            // PIN으로 문제 ID 찾기
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/find-problem/${targetPin}`);
            const data = await response.json();

            if (data.success) {
                // 문제 데이터 로드
                const probResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fill-blanks/${data.id}`);
                const probData = await probResponse.json();

                if (probData.success) {
                    setProblem(probData.problem);
                    // 정답 단어들 섞어서 준비
                    const words = probData.problem.blanks.map(b => b.word);
                    setShuffledWords(shuffleArray(words));

                    // 소켓 연결
                    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');
                    setSocket(newSocket);

                    newSocket.emit('joinProblem', {
                        problemId: data.id,
                        studentName: targetNick
                    });

                    // Set state just in case input was empty (auto join)
                    setPin(targetPin);
                    setNickname(targetNick);

                    setStep('game');
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

    // 2. Drag & Drop 핸들러 (ProofGame.js 로직 응용)
    const handleDragStart = (e, word) => {
        setDraggedWord(word);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, blankId) => {
        e.preventDefault();
        if (draggedWord) {
            const newAnswers = { ...userAnswers, [blankId]: draggedWord };
            setUserAnswers(newAnswers);
            setDraggedWord(null);

            // 정답 제출 (실시간)
            socket?.emit('submitAnswer', {
                problemId: problem.id,
                studentName: nickname,
                answer: newAnswers
            });
        }
    };

    const handleRemoveAnswer = (blankId) => {
        const newAnswers = { ...userAnswers };
        delete newAnswers[blankId];
        setUserAnswers(newAnswers);

        // 정답 수정 (실시간)
        socket?.emit('submitAnswer', {
            problemId: problem.id,
            studentName: nickname,
            answer: newAnswers
        });
    };

    // 3. 본문 렌더링 (빈칸 포함)
    const renderTextWithBlanks = () => {
        if (!problem) return null;

        const words = problem.originalText.split(/\s+/);
        const blankMap = new Map(problem.blanks.map(b => [b.index, b]));

        return (
            <div className="text-content">
                {words.map((word, index) => {
                    if (blankMap.has(index)) {
                        const blank = blankMap.get(index);
                        const userAnswer = userAnswers[blank.id];

                        return (
                            <span
                                key={index}
                                className={`blank-slot ${userAnswer ? 'filled' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, blank.id)}
                                onClick={() => userAnswer && handleRemoveAnswer(blank.id)}
                            >
                                {userAnswer ? (
                                    <>
                                        <LatexRenderer text={userAnswer} />
                                        <button className="btn-remove-word" aria-label="단어 되돌리기">
                                            <X size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <span className="placeholder">&nbsp;</span>
                                )}
                            </span>
                        );
                    }
                    return <span key={index} className="normal-word"><LatexRenderer text={word} /> </span>;
                })}
            </div>
        );
    };

    // 4. 단어 뱅크 렌더링
    const renderWordBank = () => {
        if (!problem) return null;

        let visibleWords = [];

        if (problem.allowDuplicates) {
            // 중복 허용 시: 고유 단어만 보여줌 (무한 사용)
            const uniqueWords = [...new Set(shuffledWords)];
            visibleWords = uniqueWords.map(word => ({ word, id: word })); // id를 word로 사용
        } else {
            // 중복 불가(소모성) 시:
            // 전체 섞인 단어 목록에서, 현재 사용된 단어들(userAnswers의 값들)을 하나씩 차감하며 보여줌

            const usedValues = Object.values(userAnswers);

            // 셔플된 목록 복사본 생성
            const remainingWords = [...shuffledWords];

            // 사용된 단어들 하나씩 제거
            usedValues.forEach(used => {
                const idx = remainingWords.indexOf(used);
                if (idx > -1) {
                    remainingWords.splice(idx, 1);
                }
            });

            visibleWords = remainingWords.map((word, i) => ({ word, id: `${word}-${i}` }));
        }

        return (
            <div className="word-bank">
                <h3>
                    단어 카드
                    {problem.allowDuplicates
                        ? ' (팁: 같은 단어를 여러 번 쓸 수 있습니다)'
                        : ' (드래그하여 빈칸을 채우세요)'}
                </h3>
                <div className="cards-grid">
                    {visibleWords.map((item) => (
                        <div
                            key={item.id}
                            className="word-card draggable"
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.word)}
                        >
                            <LatexRenderer text={item.word} />
                        </div>
                    ))}
                    {visibleWords.length === 0 && (
                        <div className="empty-bank-message">모든 카드를 사용했습니다! 🎉</div>
                    )}
                </div>
            </div>
        );
    };

    if (step === 'login') {
        return (
            <div className="student-login-container">
                <div className="login-card glass-panel">
                    <div className="icon-circle">
                        <User size={32} color="white" />
                    </div>
                    <h2>학생 입장</h2>
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

            <main className="game-content">
                <div className="problem-area">
                    <h2 className="problem-title"><LatexRenderer text={problem.title} /></h2>
                    <div className="text-display">
                        {renderTextWithBlanks()}
                    </div>
                </div>

                {/* 결과 확인 (모두 채웠을 때) */}
                {Object.keys(userAnswers).length === problem?.blanks.length && (
                    <div className="result-card fade-in">
                        <h3>🎉 문제 풀이 완료!</h3>
                        <div className="score-display">
                            <span>총 {problem.blanks.length}문제 중</span>
                            <span className="score-number">
                                {problem.blanks.filter(b => userAnswers[b.id] === b.word).length}
                            </span>
                            <span>개 정답</span>
                        </div>
                    </div>
                )}

                {renderWordBank()}

                {/* 메시지 알림 (Toast) */}
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

export default StudentMode;
