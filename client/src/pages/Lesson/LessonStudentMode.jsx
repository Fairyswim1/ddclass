import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveApiUrl } from '../../utils/url';

// Import the specific student mode components
import StudentMode from '../FillBlanks/StudentMode';
import OrderStudentMode from '../OrderMatching/OrderStudentMode';
import FreeStudentMode from '../Free/FreeStudentMode';
import MultipleChoiceStudent from './MultipleChoiceStudent';
import ShortAnswerStudent from './ShortAnswerStudent';
import WhiteboardStudent from './WhiteboardStudent';
import PollStudent from './PollStudent';

const LessonStudentMode = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [socket, setSocket] = useState(null);
    const [lessonData, setLessonData] = useState(null);
    const [currentProblemData, setCurrentProblemData] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [maxAllowedStep, setMaxAllowedStep] = useState(0);
    const [loading, setLoading] = useState(true);

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
            // 방금 들어왔으니 교사에게 현재 내 step 위치를 알림
            newSocket.emit('changeStudentStep', {
                lessonId,
                studentName: nickname,
                stepIndex: currentStepIndex
            });
        };

        if (newSocket.connected) joinLessonRoom();
        newSocket.on('connect', joinLessonRoom);

        // Listen for pacing changes from teacher
        newSocket.on('maxAllowedStepUpdated', ({ maxAllowedStep }) => {
            console.log('Teacher changed max allowed step to:', maxAllowedStep);
            setMaxAllowedStep(maxAllowedStep);
        });

        return () => newSocket.disconnect();
    }, [lessonId, nickname, navigate, currentStepIndex]);

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
    const socketWrapper = socket ? {
        ...socket,
        emit: (event, data) => {
            if (event === 'submitLessonAnswer') {
                data.stepIndex = currentStepIndex;
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
            default:
                return <div>지원하지 않는 문제 유형입니다.</div>;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#FAFAFA' }}>
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
