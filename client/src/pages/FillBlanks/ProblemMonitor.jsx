import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { X, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './ProblemMonitor.css';
import LatexRenderer from '../../components/LatexRenderer';
import { resolveApiUrl } from '../../utils/url';

const ProblemMonitor = ({ problemData }) => {
    const [socket, setSocket] = useState(null);
    const [students, setStudents] = useState([]); // [{id, name, answer: {}}]
    const [selectedStudentName, setSelectedStudentName] = useState(null); // For detail view
    const [message, setMessage] = useState(''); // Message to send
    const [isFullScreen, setIsFullScreen] = useState(false);
    const mirrorRef = useRef(null);
    const [mirrorWidth, setMirrorWidth] = useState(1000);

    const selectedStudent = students.find(s => s.name === selectedStudentName);
    const currentProblemWidth = problemData?.baseWidth || 1000;
    const fontScale = mirrorWidth / currentProblemWidth;

    // 문제 유형에 따른 공통 항목 (blanks 또는 steps)
    const activeBlanks = problemData?.blanks || problemData?.steps || [];

    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com');
        setSocket(newSocket);

        newSocket.emit('joinProblem', {
            problemId: problemData?.id,
            studentName: 'TEACHER_MONITOR'
        });

        newSocket.on('currentStudents', (currentStudents) => {
            setStudents((currentStudents || []).map(s => ({
                ...s,
                answer: s.answer || (problemData?.type === 'fill-blanks' ? {} : [])
            })));
        });

        newSocket.on('studentJoined', (student) => {
            if (student.name === 'TEACHER_MONITOR' || !student.name) return;

            setStudents(prev => {
                if (prev.find(s => s.id === student.id || s.name === student.name)) return prev;
                return [...prev, { ...student, answer: student.answer || (problemData?.type === 'fill-blanks' ? {} : []) }];
            });
        });

        newSocket.on('studentLeft', (data) => {
            setStudents(prev => prev.filter(s => s.id !== data.id));
        });

        newSocket.on('answerUpdated', (studentData) => {
            if (studentData.name === 'TEACHER_MONITOR') return;

            setStudents(prev => {
                const exists = prev.find(s => s.name === studentData.name);
                if (exists) {
                    return prev.map(s => s.name === studentData.name
                        ? { ...s, answer: studentData.answer, id: studentData.id }
                        : s
                    );
                }
                return [...prev, { id: studentData.id, name: studentData.name, answer: studentData.answer }];
            });
        });

        return () => newSocket.disconnect();
    }, [problemData.id]);

    const calculateProgress = (studentAnswer) => {
        if (!problemData) return 0;

        // Free Board (free-drop)
        if (problemData.type === 'free-drop') {
            if (!Array.isArray(studentAnswer)) return 0;
            const placedCount = studentAnswer.filter(item => item?.isPlaced).length;
            const totalItems = (problemData.items || []).length;
            return totalItems > 0 ? Math.round((placedCount / totalItems) * 100) : 0;
        }

        const totalBlanks = activeBlanks.length;
        if (totalBlanks === 0) return 0;

        // Array check (for Order Matching)
        if (Array.isArray(studentAnswer)) {
            return Math.round((studentAnswer.length / totalBlanks) * 100);
        }
        // Object check (for Fill Blanks)
        const filledCount = Object.keys(studentAnswer || {}).length;
        return Math.round((filledCount / totalBlanks) * 100);
    };

    const getAccuracy = (studentAnswer) => {
        if (!problemData) return { correct: 0, total: 0, percentage: 0 };

        if (problemData.type === 'free-drop') {
            return { correct: 0, total: 0, percentage: 100 };
        }

        const total = activeBlanks.length;
        if (total === 0 || !studentAnswer) return { correct: 0, total: 0, percentage: 0 };
        let correctCount = 0;

        if (Array.isArray(studentAnswer)) {
            // Order Matching
            activeBlanks.forEach((blank, index) => {
                if (studentAnswer[index] && studentAnswer[index].id === blank.id) {
                    correctCount++;
                }
            });
        } else {
            // Fill Blanks
            activeBlanks.forEach(blank => {
                if (studentAnswer[blank.id] === blank.word) {
                    correctCount++;
                }
            });
        }

        return {
            correct: correctCount,
            total,
            percentage: Math.round((correctCount / total) * 100)
        };
    };

    useEffect(() => {
        if (!mirrorRef.current || !selectedStudentName) return;
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setMirrorWidth(entry.contentRect.width);
            }
        });
        observer.observe(mirrorRef.current);
        return () => observer.disconnect();
    }, [selectedStudentName]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !selectedStudent) return;

        socket.emit('sendMessage', {
            studentSocketId: selectedStudent.id,
            message: message,
            teacherName: '선생님'
        });

        alert(`'${selectedStudent.name}' 학생에게 메시지를 보냈습니다.`);
        setMessage('');
    };

    const getValueDisplay = (val) => {
        if (typeof val === 'object' && val !== null) {
            // Free Board case: match with problemData.items to show actual content
            if (problemData?.type === 'free-drop' && val.id) {
                const original = (problemData?.items || []).find(pi => pi.id === val.id);
                if (original) {
                    return original.type === 'text' ? original.content : '📷 이미지';
                }
            }
            return val.text || val.word || val.content || '(내용 없음)';
        }
        return val;
    };

    return (
        <div className="monitor-container">
            <div className="monitor-header">
                <div className="stat-card">
                    <span className="label">접속한 학생</span>
                    <span className="value">{students.length}명</span>
                </div>
                <div className="stat-card">
                    <span className="label">평균 진행률</span>
                    <span className="value">
                        {students.length > 0
                            ? Math.round(students.reduce((acc, s) => acc + calculateProgress(s.answer), 0) / students.length)
                            : 0}%
                    </span>
                </div>
            </div>

            <div className="students-grid">
                {students.map((student, idx) => (
                    <div
                        key={idx}
                        className="student-card clickable"
                        onClick={() => setSelectedStudentName(student.name)}
                    >
                        <div className="student-header">
                            <span className="student-name">{student.name}</span>
                            <span className="student-progress">{calculateProgress(student.answer)}%</span>
                        </div>
                        <div className="progress-bar-bg">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${calculateProgress(student.answer)}%` }}
                            ></div>
                        </div>
                        <div className="answer-preview-container">
                            {problemData?.type === 'free-drop' ? (
                                <div className="mini-board-preview">
                                    <div className="mini-canvas" style={{ aspectRatio: problemData?.aspectRatio || '16/9' }}>
                                        <img src={resolveApiUrl(problemData?.backgroundUrl)} alt="bg" className="mini-bg-img" />
                                        <div className="mini-items-layer">
                                            {Array.isArray(student.answer) && student.answer.filter(i => i?.isPlaced).map((item, idx) => {
                                                const originalId = item.id.split('_copy_')[0];
                                                const original = (problemData?.items || []).find(pi => pi.id === originalId);
                                                if (!original) return null;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`mini-token ${original.type}`}
                                                        style={{
                                                            left: `${item.x}%`,
                                                            top: `${item.y}%`,
                                                        }}
                                                    >
                                                        {original.type === 'image' ? '🖼️' : '📝'}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="mini-stats">배치 {Array.isArray(student.answer) ? student.answer.filter(i => i?.isPlaced).length : 0}개</div>
                                </div>
                            ) : (
                                <div className="answer-preview">
                                    {(Array.isArray(student.answer) ? (
                                        problemData.type === 'free-drop'
                                            ? student.answer.filter(i => i.isPlaced)
                                            : student.answer
                                    ) : Object.values(student.answer || {})).slice(-5).map((item, i) => (
                                        <span key={i} className="mini-chip">
                                            <LatexRenderer text={getValueDisplay(item)} />
                                        </span>
                                    ))}
                                    {(Array.isArray(student.answer) ? student.answer.length : Object.keys(student.answer || {}).length) > 5 && <span>...</span>}
                                </div>
                            )}
                        </div>
                        <div className="hover-hint">클릭하여 상세 보기 및 메시지 보내기</div>
                    </div>
                ))}
                {students.length === 0 && (
                    <div className="empty-state">
                        학생들이 접속하면 여기에 표시됩니다.
                    </div>
                )}
            </div>

            {/* Student Detail Modal */}
            {selectedStudentName && (
                <div className={`modal-overlay ${isFullScreen ? 'full-screen-overlay' : ''}`} onClick={() => { setSelectedStudentName(null); setIsFullScreen(false); }}>
                    <div className={`modal-content ${isFullScreen ? 'full-screen-content' : ''}`} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="header-info">
                                <h2>{selectedStudentName} 학생의 화면</h2>
                                <span className="accuracy-badge">
                                    {(problemData.type === 'free-drop')
                                        ? `카드 배치: ${Array.isArray(selectedStudent?.answer) ? selectedStudent.answer.filter(i => i.isPlaced).length : 0}개`
                                        : `정답률: ${getAccuracy(selectedStudent?.answer).percentage}% (${getAccuracy(selectedStudent?.answer).correct}/${getAccuracy(selectedStudent?.answer).total})`
                                    }
                                </span>
                            </div>
                            <div className="header-actions">
                                <button className="btn-fullscreen-toggle" onClick={() => setIsFullScreen(!isFullScreen)}>
                                    {isFullScreen ? '작게 보기' : '전체 화면'}
                                </button>
                                <button className="btn-close" onClick={() => { setSelectedStudentName(null); setIsFullScreen(false); }}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="modal-body">
                            {/* Mirrored Text View */}
                            <div className="mirrored-text-view">
                                {problemData?.type === 'free-drop' ? (
                                    // Free Board View
                                    <div className="free-board-mirror-container">
                                        <div className="mirror-canvas-wrapper" ref={mirrorRef}>
                                            <img src={resolveApiUrl(problemData?.backgroundUrl)} alt="bg" className="mirror-bg" />
                                            <div className="mirror-items-layer">
                                                {Array.isArray(selectedStudent?.answer) && selectedStudent.answer.filter(i => i?.isPlaced).map(item => {
                                                    const originalId = item.id.split('_copy_')[0];
                                                    const originalItem = (problemData?.items || []).find(pi => pi.id === originalId);
                                                    if (!originalItem) return null;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`mirror-placed-token ${originalItem.type}`}
                                                            style={{
                                                                left: `${item.x}%`,
                                                                top: `${item.y}%`,
                                                                width: originalItem.type === 'image' ? (originalItem.width ? `${originalItem.width}%` : '15%') : 'auto',
                                                                fontSize: originalItem.type === 'text' ? `${originalItem.fontSize * fontScale}px` : 'inherit',
                                                                zIndex: 10
                                                            }}
                                                        >
                                                            {originalItem.type === 'text' ? originalItem.content : <img src={resolveApiUrl(originalItem.imageUrl)} alt="img" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="mirror-tray-status">
                                            <p>남은 카드: {(problemData?.items || []).length - (Array.isArray(selectedStudent?.answer) ? selectedStudent.answer.filter(i => i?.isPlaced).length : 0)}개</p>
                                        </div>
                                    </div>
                                ) : (problemData?.type === 'order-matching' || Array.isArray(selectedStudent?.answer)) ? (
                                    // Order Matching View
                                    <div className="order-matching-view">
                                        <p className="helper-text">학생이 제출한 순서:</p>
                                        <ul className="order-list">
                                            {Array.isArray(selectedStudent?.answer) && selectedStudent.answer.map((item, idx) => {
                                                // Check if this position is correct
                                                const correctItem = activeBlanks[idx];
                                                const isCorrect = correctItem && correctItem.id === item.id;

                                                return (
                                                    <li key={idx} className={`order-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                                                        <span className="order-num">{idx + 1}</span>
                                                        <span className="order-text"><LatexRenderer text={getValueDisplay(item)} /></span>
                                                        {!isCorrect && <span className="status-icon"><XCircle size={14} /></span>}
                                                        {isCorrect && <span className="status-icon"><CheckCircle size={14} /></span>}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        {(!selectedStudent?.answer || selectedStudent.answer.length === 0) && <p className="empty-msg">아직 제출한 카드가 없습니다.</p>}
                                    </div>
                                ) : (
                                    // Fill Blanks View
                                    (problemData?.originalText || '').split(/\s+/).map((word, index) => {
                                        // Find if this index matches a blank
                                        const blank = activeBlanks.find(b => b.index === index);

                                        if (blank) {
                                            const studentAns = selectedStudent?.answer?.[blank.id];
                                            const isCorrect = studentAns === blank.word;
                                            const isFilled = !!studentAns;

                                            return (
                                                <span
                                                    key={index}
                                                    className={`mirrored-blank ${isFilled ? (isCorrect ? 'correct' : 'incorrect') : 'empty'}`}
                                                >
                                                    <LatexRenderer text={studentAns || '(빈칸)'} />
                                                    {isFilled && !isCorrect && <span className="correct-answer-hint">(<LatexRenderer text={blank.word} />)</span>}
                                                </span>
                                            );
                                        }
                                        return <span key={index}><LatexRenderer text={word} /> </span>;
                                    })
                                )}
                            </div>

                            {/* Messaging Section */}
                            <div className="messaging-section">
                                <h3>메시지 보내기</h3>
                                <form onSubmit={handleSendMessage} className="message-form">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="칭찬이나 피드백을 입력하세요..."
                                    />
                                    <button type="submit" className="btn-send">
                                        <Send size={16} /> 전송
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default ProblemMonitor;
