import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

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
    const [loading, setLoading] = useState(true);

    const state = location.state || {};
    const { pin, nickname, lessonId, problemIds } = state;

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
        };

        if (newSocket.connected) joinLessonRoom();
        newSocket.on('connect', joinLessonRoom);

        // Listen for flow changes from teacher
        newSocket.on('lessonStateChanged', ({ stepIndex }) => {
            console.log('Teacher changed lesson step to:', stepIndex);
            setCurrentStepIndex(stepIndex);
        });

        return () => newSocket.disconnect();
    }, [lessonId, nickname, navigate]);

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

    // Render the appropriate component based on type
    const commonProps = {
        lessonProblemData: currentProblemData,
        lessonRoomId: lessonId,
        lessonNickname: nickname,
        lessonSocket: socket // Pass the shared socket
    };

    switch (currentProblemData.type) {
        case 'fill-blanks':
            // The StudentMode will handle its own logic but use our props
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

export default LessonStudentMode;
