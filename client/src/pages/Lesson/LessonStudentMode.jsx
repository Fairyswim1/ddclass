import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, ChevronLeft, ChevronRight, MessageCircle, Volume2 } from 'lucide-react';
import { resolveApiUrl } from '../../utils/url';

// Import the specific student mode components
import StudentMode from '../FillBlanks/StudentMode';
import OrderStudentMode from '../OrderMatching/OrderStudentMode';
import FreeStudentMode from '../Free/FreeStudentMode';
import MultipleChoiceStudent from './MultipleChoiceStudent';
import ShortAnswerStudent from './ShortAnswerStudent';
import WhiteboardStudent from './WhiteboardStudent';
import PollStudent from './PollStudent';
import VideoPlayerWithQuiz from './VideoPlayerWithQuiz';

const extractYoutubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};

const LessonStudentMode = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [socket, setSocket] = useState(null);
    const [lessonData, setLessonData] = useState(null);
    const [currentProblemData, setCurrentProblemData] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [maxAllowedStep, setMaxAllowedStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [incomingMessage, setIncomingMessage] = useState(null);
    // 교사가 실시간으로 바꾼 YouTube 모드 { [stepIndex]: 'class' | 'homework' }
    const [liveVideoModes, setLiveVideoModes] = useState({});

    // ref로 항상 최신 step 값을 추적 — 자식 컴포넌트의 stale closure 문제 방지
    const currentStepIndexRef = useRef(0);
    currentStepIndexRef.current = currentStepIndex;

    const state = location.state || {};
    const { pin, nickname, lessonId } = state;
    const [problemIds, setProblemIds] = useState(state.problemIds || []);

    // 1. problemIds가 없으면 서버에서 수업 정보를 불러온다.
    useEffect(() => {
        if (!lessonId) return;
        if (problemIds.length > 0) return;

        const fetchLessonData = async () => {
            try {
                const res = await fetch(resolveApiUrl(`/api/lessons/${lessonId}`));
                const data = await res.json();
                if (data.success && data.lesson) {
                    setProblemIds(data.lesson.problemIds || []);
                }
            } catch (err) {
                console.error('수업 데이터 로드 실패', err);
            }
        };

        fetchLessonData();
    }, [lessonId, problemIds.length]);

    useEffect(() => {
        if (!lessonId || !nickname) {
            navigate('/join');
            return;
        }

        // Initialize Lesson Socket
        const newSocket = io(import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com');
        setSocket(newSocket);

        const joinLessonRoom = () => {
            console.log('Student joining lesson room:', lessonId);
            newSocket.emit('joinLesson', {
                lessonId,
                studentName: nickname
            });
            // 방금 들어왔으니 교사에게 초기 step 위치(0)를 알림
            newSocket.emit('changeStudentStep', {
                lessonId,
                studentName: nickname,
                stepIndex: 0
            });
        };

        if (newSocket.connected) joinLessonRoom();
        newSocket.on('connect', joinLessonRoom);

        // Listen for pacing changes from teacher
        newSocket.on('maxAllowedStepUpdated', ({ maxAllowedStep }) => {
            console.log('Teacher changed max allowed step to:', maxAllowedStep);
            setMaxAllowedStep(maxAllowedStep);
        });

        // 개별/전체 메시지 수신
        newSocket.on('messageReceived', (data) => {
            setIncomingMessage(data);
            setTimeout(() => setIncomingMessage(null), 6000);
        });

        // 교사가 실시간으로 YouTube 모드 변경
        newSocket.on('videoModeChanged', ({ stepIndex, videoMode }) => {
            setLiveVideoModes(prev => ({ ...prev, [stepIndex]: videoMode }));
        });

        return () => newSocket.disconnect();
    }, [lessonId, nickname, navigate]); // Removed currentStepIndex to prevent reconnect loop

    // Fetch the specific problem data whenever the step index changes
    useEffect(() => {
        const fetchCurrentProblem = async () => {
            if (!problemIds || problemIds.length === 0) return;

            try {
                setLoading(true);
                const targetProblemId = problemIds[currentStepIndex];
                if (!targetProblemId) return;

                const problemRef = doc(db, 'problems', targetProblemId);
                const snap = await getDoc(problemRef);

                if (snap.exists()) {
                    setCurrentProblemData({ id: snap.id, ...snap.data() });
                } else {
                    console.error('Problem not found:', targetProblemId);
                }
            } catch (error) {
                console.error('Error fetching problem data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentProblem();
    }, [currentStepIndex, problemIds]);

    if (loading || !currentProblemData) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: 'var(--color-brand-orange)' }} />
                <p style={{ marginTop: '1rem', color: '#666', fontWeight: 'bold' }}>문제를 준비하고 있습니다. 잠시만 기다려주세요...</p>
            </div>
        );
    }

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            const nextStep = currentStepIndex - 1;
            setCurrentStepIndex(nextStep);
            socket?.emit('changeStudentStep', { lessonId, studentName: nickname, stepIndex: nextStep });
        }
    };

    const handleNext = () => {
        if (currentStepIndex < maxAllowedStep && currentStepIndex < problemIds.length - 1) {
            const nextStep = currentStepIndex + 1;
            setCurrentStepIndex(nextStep);
            socket?.emit('changeStudentStep', { lessonId, studentName: nickname, stepIndex: nextStep });
        }
    };

    // Wrap socket to auto-inject stepIndex for any child components emitting answers
    // currentStepIndexRef.current 를 사용해 자식이 오래된 wrapper를 갖고 있어도 항상 최신 step 반영
    const socketWrapper = socket ? {
        ...socket,
        emit: (event, data) => {
            if (event === 'submitLessonAnswer') {
                data.stepIndex = currentStepIndexRef.current;
                data.lessonId = lessonId;
                data.studentName = nickname;
            }
            socket.emit(event, data);
        },
        on: (...args) => socket.on(...args),
        off: (...args) => socket.off(...args),
        disconnect: (...args) => socket.disconnect(...args),
        connected: socket.connected
    } : null;

    // Render the appropriate component based on type
    const commonProps = {
        lessonProblemData: currentProblemData,
        lessonRoomId: lessonId,
        lessonNickname: nickname,
        lessonSocket: socketWrapper,
        lessonStepIndex: currentStepIndex
    };

    const renderProblemComponent = () => {
        switch (currentProblemData.type) {
            case 'fill-blanks':
                return <StudentMode {...commonProps} />;
            case 'order-matching':
                return <OrderStudentMode {...commonProps} />;
            case 'free-drop':
                return <FreeStudentMode {...commonProps} />;
            case 'multiple-choice':
                return <MultipleChoiceStudent {...commonProps} />;
            case 'short-answer':
                return <ShortAnswerStudent {...commonProps} />;
            case 'whiteboard':
                return <WhiteboardStudent {...commonProps} />;
            case 'poll':
                return <PollStudent {...commonProps} />;
            case 'image':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', minHeight: '60vh' }}>
                        {currentProblemData.title && (
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', textAlign: 'center' }}>
                                {currentProblemData.title}
                            </h2>
                        )}
                        {currentProblemData.imageUrl ? (
                            <img
                                src={currentProblemData.imageUrl}
                                alt={currentProblemData.title || '이미지'}
                                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            />
                        ) : (
                            <p style={{ color: '#94a3b8' }}>이미지가 없습니다.</p>
                        )}
                    </div>
                );
            case 'video': {
                const videoId = extractYoutubeId(currentProblemData.videoUrl);
                // 교사가 실시간으로 바꾼 모드 우선, 없으면 슬라이드 저장값
                const effectiveMode = liveVideoModes[currentStepIndex] ?? (currentProblemData.videoMode || 'class');
                const isClassMode = effectiveMode === 'class';
                const trimStart = currentProblemData.trimStart ?? 0;
                const trimEnd = currentProblemData.trimEnd ?? null;
                const quizPoints = currentProblemData.quizPoints || [];
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '2rem', gap: '1rem' }}>
                        {currentProblemData.title && (
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }}>
                                {currentProblemData.title}
                            </h2>
                        )}
                        {isClassMode ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '1.5rem', background: '#0f0f0f', borderRadius: '16px', padding: '3rem' }}>
                                <div style={{ fontSize: '4rem' }}>📺</div>
                                <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>선생님 화면을 함께 봐주세요!</p>
                                <p style={{ color: '#9ca3af', fontSize: '1rem', textAlign: 'center' }}>교사가 수업 화면으로 영상을 재생합니다.</p>
                            </div>
                        ) : videoId ? (
                            <VideoPlayerWithQuiz
                                key={`${videoId}-${currentStepIndex}`}
                                videoId={videoId}
                                trimStart={trimStart}
                                trimEnd={trimEnd}
                                quizPoints={quizPoints}
                                onQuizAnswer={(quizId, answer, isCorrect) => {
                                    socketWrapper?.emit('submitLessonAnswer', {
                                        answer: `[퀴즈:${quizId}] ${answer}`,
                                        isQuizAnswer: true,
                                        quizId,
                                        isCorrect,
                                    });
                                }}
                            />
                        ) : (
                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>동영상이 없습니다.</p>
                        )}
                    </div>
                );
            }
            case 'ppt':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '2rem', gap: '1rem', height: 'calc(100vh - 120px)' }}>
                        {currentProblemData.title && (
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }}>
                                {currentProblemData.title}
                            </h2>
                        )}
                        {currentProblemData.pptEmbedUrl ? (
                            <iframe
                                src={currentProblemData.pptEmbedUrl}
                                title="PPT"
                                style={{ flex: 1, border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                allowFullScreen
                            />
                        ) : (
                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>PPT가 없습니다.</p>
                        )}
                    </div>
                );
            case 'website': {
                const siteUrl = currentProblemData.websiteUrl;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '0.75rem', height: 'calc(100vh - 120px)' }}>
                        {currentProblemData.title && (
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }}>
                                {currentProblemData.title}
                            </h2>
                        )}
                        {siteUrl ? (
                            <>
                                <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', position: 'relative' }}>
                                    <iframe
                                        src={siteUrl}
                                        title={currentProblemData.title || '웹사이트'}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                        allowFullScreen
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <a
                                        href={siteUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                            padding: '0.45rem 1rem', background: '#f0fdf4',
                                            border: '1px solid #86efac', borderRadius: '999px',
                                            fontSize: '0.82rem', color: '#16a34a',
                                            textDecoration: 'none', fontWeight: 600
                                        }}
                                    >
                                        🌐 새 탭에서 열기
                                    </a>
                                </div>
                            </>
                        ) : (
                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>웹사이트가 없습니다.</p>
                        )}
                    </div>
                );
            }
            default:
                return <div>지원하지 않는 문제 유형입니다.</div>;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#FAFAFA' }}>
            {/* 교사 메시지 토스트 */}
            {incomingMessage && (
                <div style={{
                    position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 9999, maxWidth: '90vw', width: '420px',
                    background: incomingMessage.isBroadcast ? '#1e293b' : '#4f46e5',
                    color: 'white', borderRadius: '14px',
                    padding: '1rem 1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    animation: 'slideDown 0.3s ease'
                }}>
                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                        {incomingMessage.isBroadcast ? '📢' : '💬'}
                    </span>
                    <div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.2rem' }}>
                            {incomingMessage.isBroadcast ? '전체 공지' : '선생님 메시지'}
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{incomingMessage.message}</div>
                    </div>
                    <button
                        onClick={() => setIncomingMessage(null)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
                    >×</button>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {renderProblemComponent()}
            </div>
            
            {/* 페이싱 네비게이션 컨트롤바 */}
            <div style={{ padding: '1rem', background: 'white', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                    onClick={handlePrev} 
                    disabled={currentStepIndex === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: currentStepIndex === 0 ? '#f3f4f6' : '#fff', color: currentStepIndex === 0 ? '#9ca3af' : '#4b5563', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                    <ChevronLeft size={20} /> 이전 문제
                </button>
                <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>
                    문제 {currentStepIndex + 1} / {problemIds.length}
                </div>
                {currentStepIndex >= maxAllowedStep && currentStepIndex < problemIds.length - 1 ? (
                    <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🔒 선생님이 막아두었습니다
                    </div>
                ) : null}
                <button 
                    onClick={handleNext} 
                    disabled={currentStepIndex >= maxAllowedStep || currentStepIndex >= problemIds.length - 1}
                     style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: (currentStepIndex >= maxAllowedStep || currentStepIndex >= problemIds.length - 1) ? '#f3f4f6' : '#F58220', color: (currentStepIndex >= maxAllowedStep || currentStepIndex >= problemIds.length - 1) ? '#9ca3af' : '#fff', border: (currentStepIndex >= maxAllowedStep || currentStepIndex >= problemIds.length - 1) ? '1px solid #d1d5db' : 'none', borderRadius: '0.5rem', cursor: (currentStepIndex >= maxAllowedStep || currentStepIndex >= problemIds.length - 1) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                    다음 문제 <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default LessonStudentMode;
