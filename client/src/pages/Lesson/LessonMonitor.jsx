import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { db } from '../../firebase';
import { doc, getDoc, getDocs, collection, query, documentId, where } from 'firebase/firestore';
import ProblemMonitor from '../FillBlanks/ProblemMonitor';
import FreeMonitor from '../Free/FreeMonitor';
import MultipleChoiceMonitor from './MultipleChoiceMonitor';
import ShortAnswerMonitor from './ShortAnswerMonitor';
import WhiteboardMonitor from './WhiteboardMonitor';
import PollMonitor from './PollMonitor';
import LatexRenderer from '../../components/LatexRenderer';
import './LessonMonitor.css';

const LessonMonitor = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [lessonData, setLessonData] = useState(null);
    const [problems, setProblems] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [maxAllowedStep, setMaxAllowedStep] = useState(0);

    const [socket, setSocket] = useState(null);
    const [students, setStudents] = useState([]);

    useEffect(() => {
        const fetchLessonAndProblems = async () => {
            try {
                setLoading(true);
                const lessonRef = doc(db, 'lessons', id);
                const lessonSnap = await getDoc(lessonRef);

                if (!lessonSnap.exists()) {
                    setError('수업을 찾을 수 없습니다.');
                    setLoading(false);
                    return;
                }

                const data = { id: lessonSnap.id, ...lessonSnap.data() };
                setLessonData(data);
                setCurrentStepIndex(data.currentProblemIndex || 0);

                // Fetch all problems in the problemIds array
                if (data.problemIds && data.problemIds.length > 0) {
                    const problemsRef = collection(db, 'problems');

                    // Firestore 'in' query supports up to 10 elements. If more, need to batch.
                    // Assuming < 10 for basic use. If >= 10, split into chunks.
                    const chunks = [];
                    for (let i = 0; i < data.problemIds.length; i += 10) {
                        chunks.push(data.problemIds.slice(i, i + 10));
                    }

                    let allProblems = [];
                    for (const chunk of chunks) {
                        const q = query(problemsRef, where(documentId(), 'in', chunk));
                        const snapshot = await getDocs(q);
                        const chunkProblems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        allProblems = [...allProblems, ...chunkProblems];
                    }

                    // Sort them according to the order in problemIds
                    const sortedProblems = data.problemIds.map(pid => allProblems.find(p => p.id === pid)).filter(Boolean);
                    setProblems(sortedProblems);
                }
            } catch (err) {
                console.error('Error fetching lesson:', err);
                setError('데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchLessonAndProblems();
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const newSocket = io(import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('LessonMonitor connected.');
            newSocket.emit('joinLesson', {
                lessonId: id,
                studentName: 'TEACHER_MONITOR'
            });
        });

        newSocket.on('currentStudents', (currentStudents) => {
            setStudents(currentStudents || []);
        });

        newSocket.on('studentJoined', (student) => {
            if (student.name === 'TEACHER_MONITOR' || !student.name) return;
            setStudents(prev => {
                if (prev.find(s => s.id === student.id || s.name === student.name)) return prev;
                return [...prev, student];
            });
        });

        newSocket.on('studentLeft', (data) => {
            setStudents(prev => prev.filter(s => s.id !== data.id));
        });

        newSocket.on('maxAllowedStepUpdated', ({ maxAllowedStep }) => {
            setMaxAllowedStep(maxAllowedStep);
        });

        newSocket.on('studentStepChanged', ({ id, name, currentStep }) => {
            setStudents(prev => prev.map(s => s.id === id ? { ...s, currentStep } : s));
        });

        newSocket.on('answerUpdated', (studentData) => {
            if (studentData.name === 'TEACHER_MONITOR') return;
            setStudents(prev => {
                const exists = prev.find(s => s.name === studentData.name);
                if (exists) {
                    return prev.map(s => s.name === studentData.name ? { ...s, answers: studentData.answers, answer: studentData.answer, id: studentData.id } : s);
                }
                return [...prev, { id: studentData.id, name: studentData.name, answers: studentData.answers, answer: studentData.answer }];
            });
        });

        // The teacher controls their OWN view, but we don't need to force students anymore.
        // We can just keep it for multiple teachers syncing or just remove our own listener.
        // newSocket.on('lessonStateChanged', ({ stepIndex }) => { ... });

        return () => newSocket.disconnect();
    }, [id]);

    const handleStepChange = (newIndex) => {
        if (!socket || newIndex < 0 || newIndex >= problems.length) return;
        setCurrentStepIndex(newIndex);
    };

    const updateMaxAllowedStep = (newMax) => {
        if (!socket || newMax < 0 || newMax >= problems.length) return;
        socket.emit('updateMaxAllowedStep', { lessonId: id, maxAllowedStep: newMax });
        setMaxAllowedStep(newMax); // Optimistic update
    };

    if (loading) {
        return (
            <div className="lesson-page-loading">
                <Loader2 className="animate-spin" size={48} />
                <p>수업 모니터링 환경을 준비 중입니다...</p>
            </div>
        );
    }

    if (error || !lessonData || problems.length === 0) {
        return (
            <div className="lesson-page-error">
                <h2>⚠️ 오류</h2>
                <p>{error || '데이터를 불러올 수 없습니다.'}</p>
                <button className="btn-back-dash" onClick={() => navigate('/teacher/dashboard')}>
                    보관함으로 돌아가기
                </button>
            </div>
        );
    }

    const currentProblem = problems[currentStepIndex];

    return (
        <div className="lesson-monitor-page">
            <nav className="lesson-monitor-nav">
                <div className="nav-left">
                    <button onClick={() => navigate('/teacher/dashboard')} className="btn-back-dash">
                        <ArrowLeft size={20} /> 대시보드
                    </button>
                    <h1 className="lesson-title-display">
                        <LatexRenderer text={lessonData.title} />
                        <span className="type-label">수업 (다중 문제)</span>
                    </h1>
                </div>
                <div className="nav-right">
                    <div className="pin-pill">
                        <span className="label">학생 참여 PIN</span>
                        <span className="value">{lessonData.pinNumber}</span>
                    </div>
                </div>
            </nav>

            <div className="desmos-pacing-bar">
                <div className="pacing-track">
                    {problems.map((prob, idx) => {
                        const isCurrent = currentStepIndex === idx;
                        const isAllowed = idx <= maxAllowedStep;
                        const studentsHere = students.filter(s => s.currentStep === idx);

                        return (
                            <div 
                                key={prob.id || idx} 
                                className={`pacing-card ${isCurrent ? 'active' : ''} ${!isAllowed ? 'locked' : ''}`}
                                onClick={() => handleStepChange(idx)}
                                title={prob.title || '제목 없음'}
                            >
                                <div className="card-header">
                                    <span className="card-number">{idx + 1}</span>
                                    <button 
                                        className={`btn-lock-toggle ${!isAllowed ? 'locked' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newMax = isAllowed ? idx - 1 : idx;
                                            updateMaxAllowedStep(newMax);
                                        }}
                                        title={isAllowed ? `클릭시 ${idx}번까지만 허용토록 축소` : `클릭시 ${idx + 1}번까지 모두 허용 (오픈)`}
                                    >
                                        {isAllowed ? '🔓' : '🔒'}
                                    </button>
                                </div>
                                <div className="card-title-preview">
                                    <LatexRenderer text={prob.title || '제목 없음'} />
                                </div>
                                
                                {studentsHere.length > 0 && (
                                    <div className="card-students">
                                        {studentsHere.slice(0, 3).map((s, i) => (
                                            <div key={s.id} title={s.name} className="student-dot" style={{ zIndex: 10 + i }} />
                                        ))}
                                        {studentsHere.length > 3 && (
                                            <div className="student-dot-more">+{studentsHere.length - 3}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <main className="lesson-content-area">
                <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#666', fontSize: '1.2rem' }}>
                    현재 뷰: <span style={{ color: 'var(--color-brand-brown)' }}><LatexRenderer text={currentProblem?.title || ''} /></span>
                </h2>
                <div className="monitor-component-container">
                    {/* Transform students array to map the answer for this specific step */}
                    {(() => {
                        const activeStudents = students.map(s => ({
                            ...s,
                            // 현재 스텝 답안만 사용 (다른 스텝의 답안이 섞이지 않도록)
                            answer: s.answers?.[currentStepIndex]
                        }));
                        
                        return (
                            <>
                                {currentProblem && currentProblem.type === 'fill-blanks' && (
                                    <ProblemMonitor
                                        problemData={currentProblem}
                                        parentSocket={socket}
                                        parentStudents={activeStudents}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'free-drop' && (
                                    <FreeMonitor
                                        problemData={currentProblem}
                                        parentSocket={socket}
                                        parentStudents={activeStudents}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'order-matching' && (
                                    <ProblemMonitor
                                        problemData={currentProblem}
                                        parentSocket={socket}
                                        parentStudents={activeStudents}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'multiple-choice' && (
                                    <MultipleChoiceMonitor
                                        problemData={currentProblem}
                                        parentStudents={activeStudents}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'short-answer' && (
                                    <ShortAnswerMonitor
                                        problemData={currentProblem}
                                        parentStudents={activeStudents}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'whiteboard' && (
                                    <WhiteboardMonitor
                                        problemData={currentProblem}
                                        parentStudents={activeStudents}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'poll' && (
                                    <PollMonitor
                                        problemData={currentProblem}
                                        parentStudents={activeStudents}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'image' && (
                                    <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                                        {currentProblem.imageUrl
                                            ? <img src={currentProblem.imageUrl} alt="이미지 슬라이드" style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px' }} />
                                            : <p style={{ color: '#94a3b8' }}>이미지가 없습니다.</p>}
                                    </div>
                                )}
                                {currentProblem && currentProblem.type === 'video' && (() => {
                                    const match = (currentProblem.videoUrl || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
                                    const videoId = match ? match[1] : null;
                                    return (
                                        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem' }}>
                                            {videoId
                                                ? <div style={{ aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden' }}>
                                                    <iframe src={`https://www.youtube.com/embed/${videoId}`} title="YouTube" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                                                  </div>
                                                : <p style={{ color: '#94a3b8', textAlign: 'center' }}>동영상이 없습니다.</p>}
                                        </div>
                                    );
                                })()}
                                {currentProblem && currentProblem.type === 'ppt' && (
                                    <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', aspectRatio: '16/9' }}>
                                        {currentProblem.pptEmbedUrl
                                            ? <iframe src={currentProblem.pptEmbedUrl} title="PPT" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} allowFullScreen />
                                            : <p style={{ color: '#94a3b8', textAlign: 'center' }}>PPT가 없습니다.</p>}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </main>
        </div>
    );
};

export default LessonMonitor;
