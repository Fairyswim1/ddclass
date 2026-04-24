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

            <div className="lesson-controls">
                <button
                    className="btn-step-control prev"
                    onClick={() => handleStepChange(currentStepIndex - 1)}
                    disabled={currentStepIndex === 0}
                >
                    <ArrowLeft size={20} /> 이전 문제
                </button>
                <div className="step-indicator" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
                    <span className="step-text" style={{ fontSize: '0.9rem' }}>모니터링 뷰: {currentStepIndex + 1} / {problems.length}</span>
                    <div className="step-progress" style={{ position: 'relative', width: '100%', marginTop: '0.5rem', background: '#e2e8f0', height: '6px', borderRadius: '3px' }}>
                        <div
                            className="step-progress-fill"
                            style={{ width: `${((currentStepIndex + 1) / problems.length) * 100}%`, background: 'var(--color-brand-orange)', height: '100%', borderRadius: '3px' }}
                        />
                        {/* Students positions on the progress bar */}
                        {problems.map((_, idx) => {
                            const studentsHere = students.filter(s => s.currentStep === idx);
                            if (studentsHere.length === 0) return null;
                            const leftPos = problems.length > 1 ? `${(idx / (problems.length - 1)) * 100}%` : '50%';
                            return (
                                <div key={`pos-${idx}`} style={{ position: 'absolute', left: leftPos, top: '-8px', display: 'flex', transform: 'translateX(-50%)', zIndex: 10 }}>
                                    {studentsHere.slice(0, 3).map((s, i) => (
                                        <div key={s.id} title={s.name} style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#3b82f6', border: '2px solid white', marginLeft: i > 0 ? '-6px' : '0', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                                    ))}
                                    {studentsHere.length > 3 && (
                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#64748b', color: 'white', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', marginLeft: '-6px' }}>
                                            +{studentsHere.length - 3}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <button
                    className="btn-step-control next"
                    onClick={() => handleStepChange(currentStepIndex + 1)}
                    disabled={currentStepIndex === problems.length - 1}
                >
                    다음 문제 <ArrowRight size={20} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 'auto', padding: '0.4rem 0.8rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px dashed #fbbf24' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#b45309' }}>학생 접근 허용선</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                        <button onClick={() => updateMaxAllowedStep(maxAllowedStep - 1)} disabled={maxAllowedStep === 0} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.25rem', background: 'white', border: '1px solid #d1d5db', cursor: maxAllowedStep === 0 ? 'not-allowed' : 'pointer' }}>잠그기</button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{maxAllowedStep + 1}번</span>
                        <button onClick={() => updateMaxAllowedStep(maxAllowedStep + 1)} disabled={maxAllowedStep === problems.length - 1} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.25rem', background: maxAllowedStep === problems.length - 1 ? '#e5e7eb' : '#F58220', color: maxAllowedStep === problems.length - 1 ? '#9ca3af' : 'white', border: 'none', cursor: maxAllowedStep === problems.length - 1 ? 'not-allowed' : 'pointer' }}>열어주기</button>
                    </div>
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
                            answer: s.answers?.[currentStepIndex] !== undefined ? s.answers[currentStepIndex] : s.answer
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
                                    <div className="monitor-card text-center p-8 text-slate-500">
                                        순서 맞추기 문제는 현재 개별 모니터링 뷰를 지원하지 않습니다.
                                    </div>
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
                            </>
                        );
                    })()}
                </div>
            </main>
        </div>
    );
};

export default LessonMonitor;
