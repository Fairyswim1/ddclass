import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, User, X } from 'lucide-react';
import './StudentMode.css';
import LatexRenderer from '../../components/LatexRenderer';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const StudentMode = ({ lessonProblemData = null, lessonRoomId = null, lessonNickname = null, lessonSocket = null }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLessonMode = !!lessonProblemData;

    const [socket, setSocket] = useState(lessonSocket);
    const [step, setStep] = useState(isLessonMode || location.state?.autoJoin ? 'joining' : 'login');
    const [pin, setPin] = useState(isLessonMode ? (lessonProblemData.pinNumber || '') : (location.state?.pin || ''));
    const [nickname, setNickname] = useState(isLessonMode ? lessonNickname : (location.state?.nickname || ''));
    const [problem, setProblem] = useState(lessonProblemData);
    const [userAnswers, setUserAnswers] = useState({}); // { blankId: word }
    const [draggedWord, setDraggedWord] = useState(null);
    const [sourceBlankId, setSourceBlankId] = useState(null); // 추가: 드래그 시작된 빈칸 ID
    const [shuffledWords, setShuffledWords] = useState([]);

    // 5. 메시지 수신 (Toast Notification)
    const [lastMessage, setLastMessage] = useState(null);

    useEffect(() => {
        if (!socket || isLessonMode) return; // lesson 모드에선 LessonStudentMode가 처리

        const handleMessage = (data) => {
            setLastMessage(data);
            setTimeout(() => setLastMessage(null), 5000);
        };

        socket.on('messageReceived', handleMessage);
        return () => socket.off('messageReceived', handleMessage);
    }, [socket, isLessonMode]);

    // Lesson Mode / Auto Join
    useEffect(() => {
        if (isLessonMode && lessonProblemData) {
            setProblem(lessonProblemData);
            const words = lessonProblemData.blanks.map(b => b.word);
            setShuffledWords(shuffleArray(words));
            setStep('game');
        } else if (location.state?.autoJoin && location.state?.pin && location.state?.nickname) {
            setPin(location.state.pin);
            setNickname(location.state.nickname);
            joinGame(location.state.pin, location.state.nickname);
        }
    }, [isLessonMode, lessonProblemData, location.state]);

    const handleJoin = () => joinGame(pin, nickname);

    // 1. 소켓 연결 및 방 입장
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

                setProblem({ id: problemId, ...probData });

                // 정답 단어들 섞어서 준비
                const words = probData.blanks.map(b => b.word);
                setShuffledWords(shuffleArray(words));

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

                setPin(targetPin);
                setNickname(targetNick);
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

    // 2. Drag & Drop 핸들러 (ProofGame.js 로직 응용)
    const handleDragStart = (e, word, sourceId = null) => {
        setDraggedWord(word);
        setSourceBlankId(sourceId); // 어디서부터 드래그를 시작했는지 (보관함이면 null)
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copyMove';
    };

    const handleDropOnBlank = (e, targetBlankId) => {
        e.preventDefault();
        if (draggedWord) {
            const newAnswers = { ...userAnswers };

            // 1. 다른 빈칸에서 가져온 경우: 원래 빈칸 비우기 (스왑 대신 보관함 반환)
            if (sourceBlankId && sourceBlankId !== targetBlankId) {
                delete newAnswers[sourceBlankId];
            }

            // 2. 타겟 빈칸에 드래그한 단어 넣기 
            // (기존 단어가 있다면 덮어써져서 보관함으로 자동 반환됨)
            newAnswers[targetBlankId] = draggedWord;

            setUserAnswers(newAnswers);
            setDraggedWord(null);
            setSourceBlankId(null);

            // 정답 제출 (실시간)
            socket?.emit(isLessonMode ? 'submitLessonAnswer' : 'submitAnswer', {
                [isLessonMode ? 'lessonId' : 'problemId']: isLessonMode ? lessonRoomId : problem.id,
                studentName: nickname,
                answer: newAnswers
            });
        }
    };

    const handleDropOnTray = (e) => {
        e.preventDefault();
        // 빈칸에서 드래그해온 단어라면 보관함에 놓을 때 취소(제거) 처리
        if (draggedWord && sourceBlankId) {
            handleRemoveAnswer(sourceBlankId);
            setDraggedWord(null);
            setSourceBlankId(null);
        }
    };

    const handleRemoveAnswer = (blankId) => {
        const newAnswers = { ...userAnswers };
        delete newAnswers[blankId];
        setUserAnswers(newAnswers);

        // 정답 수정 (실시간)
        socket?.emit(isLessonMode ? 'submitLessonAnswer' : 'submitAnswer', {
            [isLessonMode ? 'lessonId' : 'problemId']: isLessonMode ? lessonRoomId : problem.id,
            studentName: nickname,
            answer: newAnswers
        });
    };

    // 3. 본문 렌더링 (빈칸 포함)
    const renderTextWithBlanks = () => {
        if (!problem) return null;

        // Detect format: new offset-based blanks have startOffset/endOffset
        const isOffsetBased = problem.blanks.length > 0 && problem.blanks[0].startOffset !== undefined;

        if (isOffsetBased) {
            // --- NEW FORMAT: offset-based blanks from LessonBuilder ---
            const text = problem.originalText;
            const sortedBlanks = [...problem.blanks].sort((a, b) => a.startOffset - b.startOffset);
            const elements = [];
            let currentIndex = 0;

            sortedBlanks.forEach((blank, idx) => {
                // Text segment before this blank
                if (blank.startOffset > currentIndex) {
                    const segment = text.slice(currentIndex, blank.startOffset);
                    // Split by newlines to render <br/>
                    const lines = segment.split('\n');
                    lines.forEach((line, lineIdx) => {
                        if (lineIdx > 0) elements.push(<br key={`br-pre-${idx}-${lineIdx}`} />);
                        if (line) elements.push(<span key={`seg-${currentIndex}-${lineIdx}`} className="normal-word"><LatexRenderer text={line} /></span>);
                    });
                }

                // Blank slot
                const userAnswer = userAnswers[blank.id];
                elements.push(
                    <span
                        key={`blank-${blank.id}`}
                        className={`blank-slot ${userAnswer ? 'filled draggable-filled' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnBlank(e, blank.id)}
                        onClick={() => userAnswer && handleRemoveAnswer(blank.id)}
                        draggable={!!userAnswer}
                        onDragStart={(e) => userAnswer && handleDragStart(e, userAnswer, blank.id)}
                        style={{ cursor: userAnswer ? 'grab' : 'default' }}
                    >
                        {userAnswer ? (
                            <>
                                <LatexRenderer text={userAnswer} />
                                <button className="btn-remove-word" aria-label="\ub2e8\uc5b4 \ub418\ub3cc\ub9ac\uae30" onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAnswer(blank.id);
                                }}>
                                    <X size={12} />
                                </button>
                            </>
                        ) : (
                            <span className="placeholder">&nbsp;</span>
                        )}
                    </span>
                );
                currentIndex = blank.endOffset;
            });

            // Remaining text after last blank
            if (currentIndex < text.length) {
                const segment = text.slice(currentIndex);
                const lines = segment.split('\n');
                lines.forEach((line, lineIdx) => {
                    if (lineIdx > 0) elements.push(<br key={`br-post-${lineIdx}`} />);
                    if (line) elements.push(<span key={`seg-end-${lineIdx}`} className="normal-word"><LatexRenderer text={line} /></span>);
                });
            }

            return <div className="text-content">{elements}</div>;
        }

        // --- OLD FORMAT: index-based blanks from TeacherMode ---
        let words;
        if (problem.words && Array.isArray(problem.words)) {
            words = problem.words;
        } else {
            const regex = /(\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\\$.*?\\$|\$.*?\$|\\begin\{[\s\S]*?\}[\s\S]*?\\end\{[\s\S]*?\}|\n|\S+)/g;
            words = problem.originalText.match(regex) || [];
        }
        const blankMap = new Map(problem.blanks.map(b => [b.index, b]));

        return (
            <div className="text-content" style={{ whiteSpace: 'pre-wrap' }}>
                {words.map((word, index) => {
                    if (word === '\n') {
                        return <br key={index} />;
                    }
                    if (blankMap.has(index)) {
                        const blank = blankMap.get(index);
                        const userAnswer = userAnswers[blank.id];

                        return (
                            <span
                                key={index}
                                className={`blank-slot ${userAnswer ? 'filled draggable-filled' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnBlank(e, blank.id)}
                                onClick={() => userAnswer && handleRemoveAnswer(blank.id)}
                                draggable={!!userAnswer}
                                onDragStart={(e) => userAnswer && handleDragStart(e, userAnswer, blank.id)}
                                style={{ cursor: userAnswer ? 'grab' : 'default' }}
                            >
                                {userAnswer ? (
                                    <>
                                        <LatexRenderer text={userAnswer} />
                                        <button className="btn-remove-word" aria-label="\ub2e8\uc5b4 \ub418\ub3cc\ub9ac\uae30" onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveAnswer(blank.id);
                                        }}>
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
            <div
                className="word-bank"
                onDragOver={handleDragOver}
                onDrop={handleDropOnTray}
            >
                <h3>
                    단어 카드
                    {problem.allowDuplicates
                        ? ' (팁: 같은 단어를 여러 번 쓸 수 있습니다)'
                        : ' (드래그하여 빈칸을 채우거나 보관함으로 돌려보내세요)'}
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
        <div className="fb-student-container">
            <nav className="game-nav">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={20} /> 나가기
                </button>
                <div className="user-info">
                    <User size={16} /> {nickname}
                </div>
            </nav>

            <main className="fb-game-content">
                <div className="problem-area">
                    <h2 className="problem-title"><LatexRenderer text={problem.title} /></h2>
                    <div className="text-display">
                        {renderTextWithBlanks()}
                    </div>
                </div>

                <div className="game-sidebar">
                    {/* 결과 확인 (모두 채웠을 때) */}
                    {Object.keys(userAnswers).length === problem?.blanks.length && (
                        <div className="result-card fade-in">
                            <h3>🎉 문제 풀이 완료!</h3>
                            <div className="score-display">
                                <span>총 {problem.blanks.length}개 중</span>
                                <span className="score-number">
                                    {problem.blanks.filter(b => userAnswers[b.id] === b.word).length}
                                </span>
                                <span>개 정답</span>
                            </div>
                        </div>
                    )}

                    {renderWordBank()}
                </div>

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
        </div >
    );
};

export default StudentMode;
