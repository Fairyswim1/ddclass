import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Send, Volume2, BarChart2, Save } from 'lucide-react';
import { io } from 'socket.io-client';
import { db } from '../../firebase';
import { doc, getDoc, getDocs, collection, query, documentId, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import ProblemMonitor from '../FillBlanks/ProblemMonitor';
import FreeMonitor from '../Free/FreeMonitor';
import MultipleChoiceMonitor from './MultipleChoiceMonitor';
import ShortAnswerMonitor from './ShortAnswerMonitor';
import WhiteboardMonitor from './WhiteboardMonitor';
import PollMonitor from './PollMonitor';
import LatexRenderer from '../../components/LatexRenderer';
import SessionStatsPanel from '../../components/SessionStatsPanel';
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

    const { currentUser } = useAuth();
    const [socket, setSocket] = useState(null);
    const [students, setStudents] = useState([]);
    const [broadcastText, setBroadcastText] = useState('');
    const [broadcastSent, setBroadcastSent] = useState(false);
    const [liveVideoModes, setLiveVideoModes] = useState({});
    const [showStats, setShowStats] = useState(false);
    const [saving, setSaving] = useState(false);

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
                    return prev.map(s => s.name === studentData.name
                        ? {
                            ...s,
                            answers: studentData.answers,
                            answer: studentData.answer,
                            id: studentData.id,
                            slideSubmitCounts: studentData.slideSubmitCounts ?? s.slideSubmitCounts
                          }
                        : s
                    );
                }
                return [...prev, {
                    id: studentData.id,
                    name: studentData.name,
                    answers: studentData.answers,
                    answer: studentData.answer,
                    slideSubmitCounts: studentData.slideSubmitCounts ?? {}
                }];
            });
        });

        // The teacher controls their OWN view, but we don't need to force students anymore.
        // We can just keep it for multiple teachers syncing or just remove our own listener.
        // newSocket.on('lessonStateChanged', ({ stepIndex }) => { ... });

        return () => newSocket.disconnect();
    }, [id]);

    // 세션 저장 (Firestore sessions 컬렉션)
    const handleSaveSession = async () => {
        if (!currentUser) { alert('로그인이 필요합니다.'); return; }
        if (students.length === 0) { alert('참여 학생이 없습니다.'); return; }
        try {
            setSaving(true);

            // 문제 스냅샷 (평가에 필요한 필드만)
            const problemsSnapshot = problems.map(p => ({
                id: p.id,
                type: p.type,
                title: p.title || '',
                blanks: p.blanks || null,
                steps: p.steps || null,
                options: p.options || null,
                answerIndices: p.answerIndices || null,
                answerIndex: p.answerIndex || null,
                answer: p.answer || null,
            }));

            // 전체 정답률 계산
            const evalAnswer = (prob, answer) => {
                if (!prob || !answer) return { correct: 0, total: 0 };
                if (prob.type === 'fill-blanks') {
                    const blanks = prob.blanks || [];
                    return { correct: blanks.filter(b => answer[b.id] === b.word).length, total: blanks.length };
                }
                if (prob.type === 'order-matching') {
                    const steps = prob.steps || [];
                    if (!Array.isArray(answer)) return { correct: 0, total: steps.length };
                    return { correct: steps.filter((s, i) => answer[i]?.id === s.id).length, total: steps.length };
                }
                if (prob.type === 'multiple-choice') {
                    const ai = Array.isArray(prob.answerIndices) ? prob.answerIndices : (prob.answerIndex !== undefined ? [prob.answerIndex] : [0]);
                    const si = Array.isArray(answer) ? answer.map(Number) : [parseInt(answer, 10)].filter(n => !isNaN(n));
                    const ok = ai.every(i => si.includes(i)) && si.every(i => ai.includes(i));
                    return { correct: ok ? 1 : 0, total: 1 };
                }
                if (prob.type === 'short-answer') {
                    const ca = prob.answer;
                    if (!ca) return { correct: 0, total: 0 };
                    const ok = typeof answer === 'string' && answer.toLowerCase().includes(String(ca).toLowerCase());
                    return { correct: ok ? 1 : 0, total: 1 };
                }
                return { correct: 0, total: 0 };
            };

            let totalCorrect = 0, totalPossible = 0;
            students.forEach(student => {
                problems.forEach((prob, idx) => {
                    const answer = student.answers?.[idx] ?? null;
                    const r = evalAnswer(prob, answer);
                    totalCorrect += r.correct;
                    totalPossible += r.total;
                });
            });
            const overallAccuracy = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : null;

            await addDoc(collection(db, 'sessions'), {
                teacherId: currentUser.uid,
                type: 'lesson',
                sourceId: id,
                title: lessonData.title || '제목 없음',
                slideCount: problems.length,
                studentCount: students.length,
                problems: problemsSnapshot,
                students: students.map(s => ({
                    name: s.name,
                    answers: s.answers || {},
                    submitCount: s.submitCount || 0,
                    slideSubmitCounts: s.slideSubmitCounts || {},
                })),
                totalCorrect,
                totalPossible,
                overallAccuracy,
                createdAt: serverTimestamp(),
            });

            alert('수업 기록이 저장되었습니다!');
        } catch (e) {
            alert('저장 실패: ' + e.message);
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleStepChange = (newIndex) => {
        if (!socket || newIndex < 0 || newIndex >= problems.length) return;
        setCurrentStepIndex(newIndex);
    };

    const updateMaxAllowedStep = (newMax) => {
        if (!socket || newMax < 0 || newMax >= problems.length) return;
        socket.emit('updateMaxAllowedStep', { lessonId: id, maxAllowedStep: newMax });
        setMaxAllowedStep(newMax); // Optimistic update
    };

    const handleBroadcast = () => {
        if (!socket || !broadcastText.trim()) return;
        socket.emit('broadcastMessage', { roomId: id, message: broadcastText.trim(), teacherName: '교사' });
        setBroadcastText('');
        setBroadcastSent(true);
        setTimeout(() => setBroadcastSent(false), 2000);
    };

    const handleSetVideoMode = (stepIndex, mode) => {
        if (!socket) return;
        setLiveVideoModes(prev => ({ ...prev, [stepIndex]: mode }));
        socket.emit('setVideoMode', { lessonId: id, stepIndex, videoMode: mode });
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
                <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={handleSaveSession}
                        disabled={saving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.45rem 1rem', background: saving ? '#94a3b8' : '#16a34a', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
                            fontWeight: 700, fontSize: '0.85rem'
                        }}
                    >
                        <Save size={16} /> {saving ? '저장 중...' : '수업 기록 저장'}
                    </button>
                    <button
                        onClick={() => setShowStats(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.45rem 1rem', background: '#6366f1', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.85rem'
                        }}
                    >
                        <BarChart2 size={16} /> 수업 통계
                    </button>
                    <div className="pin-pill">
                        <span className="label">학생 참여 PIN</span>
                        <span className="value">{lessonData.pinNumber}</span>
                    </div>
                </div>
            </nav>

            {showStats && (
                <SessionStatsPanel
                    mode="lesson"
                    students={students}
                    problems={problems}
                    title={lessonData.title}
                    onClose={() => setShowStats(false)}
                />
            )}

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

            {/* 전체 공지 메시지 바 */}
            <div style={{ background: '#1e293b', padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Volume2 size={18} color="#94a3b8" />
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', whiteSpace: 'nowrap', fontWeight: 600 }}>전체 공지</span>
                <input
                    value={broadcastText}
                    onChange={e => setBroadcastText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
                    placeholder="모든 학생에게 공지사항을 보냅니다..."
                    style={{ flex: 1, padding: '0.4rem 0.75rem', background: '#334155', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                />
                <button
                    onClick={handleBroadcast}
                    disabled={!broadcastText.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', background: broadcastSent ? '#22c55e' : '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'background 0.2s' }}
                >
                    <Send size={14} /> {broadcastSent ? '전송됨!' : '전송'}
                </button>
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
                                        socket={socket}
                                        lessonId={id}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'short-answer' && (
                                    <ShortAnswerMonitor
                                        problemData={currentProblem}
                                        parentStudents={activeStudents}
                                        socket={socket}
                                        lessonId={id}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'whiteboard' && (
                                    <WhiteboardMonitor
                                        problemData={currentProblem}
                                        parentStudents={activeStudents}
                                        socket={socket}
                                        lessonId={id}
                                    />
                                )}
                                {currentProblem && currentProblem.type === 'poll' && (
                                    <PollMonitor
                                        problemData={currentProblem}
                                        parentStudents={activeStudents}
                                        socket={socket}
                                        lessonId={id}
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
                                    const currentMode = liveVideoModes[currentStepIndex] ?? (currentProblem.videoMode || 'class');
                                    return (
                                        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem' }}>
                                            {/* 실시간 모드 전환 컨트롤 */}
                                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                <span style={{ fontWeight: 'bold', color: '#334155', marginRight: '0.5rem', alignSelf: 'center' }}>📺 학생 재생 모드:</span>
                                                <button
                                                    onClick={() => handleSetVideoMode(currentStepIndex, 'class')}
                                                    style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '2px solid', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', background: currentMode === 'class' ? '#1e293b' : 'white', color: currentMode === 'class' ? 'white' : '#64748b', borderColor: currentMode === 'class' ? '#1e293b' : '#e2e8f0', transition: 'all 0.2s' }}
                                                >
                                                    📺 수업 모드 (선생님 화면 보기)
                                                </button>
                                                <button
                                                    onClick={() => handleSetVideoMode(currentStepIndex, 'homework')}
                                                    style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '2px solid', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', background: currentMode === 'homework' ? '#16a34a' : 'white', color: currentMode === 'homework' ? 'white' : '#64748b', borderColor: currentMode === 'homework' ? '#16a34a' : '#e2e8f0', transition: 'all 0.2s' }}
                                                >
                                                    📱 과제 모드 (각자 재생)
                                                </button>
                                                <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: '#94a3b8', marginLeft: 'auto' }}>
                                                    현재: {currentMode === 'class' ? '수업 모드' : '과제 모드'} · 클릭하면 학생 화면이 즉시 바뀝니다
                                                </span>
                                            </div>
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
