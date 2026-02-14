import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { X, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './ProblemMonitor.css';
import LatexRenderer from '../../components/LatexRenderer';

const ProblemMonitor = ({ problemData }) => {
    const [socket, setSocket] = useState(null);
    const [students, setStudents] = useState([]); // [{id, name, answer: {}}]
    const [selectedStudent, setSelectedStudent] = useState(null); // For detail view
    const [message, setMessage] = useState(''); // Message to send

    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com');
        setSocket(newSocket);

        newSocket.emit('joinProblem', {
            problemId: problemData.id,
            studentName: 'TEACHER_MONITOR'
        });

        newSocket.on('studentJoined', (student) => {
            if (student.name === 'TEACHER_MONITOR' || !student.name) return; // 교사 및 이름 없는 접속 제외

            setStudents(prev => {
                if (prev.find(s => s.id === student.id)) return prev;
                return [...prev, { ...student, answer: {} }];
            });
        });

        newSocket.on('answerUpdated', (studentData) => {
            if (studentData.name === 'TEACHER_MONITOR') return;

            setStudents(prev => prev.map(s => {
                if (s.name === studentData.name) { // Match by name for persistence
                    const updated = { ...s, answer: studentData.answer, id: studentData.id }; // Update Socket ID too if reconnected
                    // If this is the currently selected student, update them too
                    if (selectedStudent && selectedStudent.name === studentData.name) {
                        setSelectedStudent(updated);
                    }
                    return updated;
                }
                return s;
            }));

            // Add if new
            setStudents(prev => {
                if (prev.find(s => s.name === studentData.name)) return prev; // 이미 있으면 패스
                return [...prev, { id: studentData.id, name: studentData.name, answer: studentData.answer }];
            });
        });

        return () => newSocket.disconnect();
    }, [problemData.id, selectedStudent?.name]); // Dependency on selectedStudent name to keep it communicating

    const calculateProgress = (studentAnswer) => {
        if (!problemData.blanks && !problemData.items) return 0;

        // Free Board (free-drop)
        if (problemData.type === 'free-drop') {
            if (!Array.isArray(studentAnswer)) return 0;
            const placedCount = studentAnswer.filter(item => item.isPlaced).length;
            const totalItems = problemData.items.length;
            return Math.round((placedCount / totalItems) * 100);
        }

        const totalBlanks = problemData.blanks.length;
        // Array check (for Order Matching)
        if (Array.isArray(studentAnswer)) {
            return Math.round((studentAnswer.length / totalBlanks) * 100);
        }
        // Object check (for Fill Blanks)
        const filledCount = Object.keys(studentAnswer || {}).length;
        return Math.round((filledCount / totalBlanks) * 100);
    };

    const getAccuracy = (studentAnswer) => {
        if (problemData.type === 'free-drop') {
            return { correct: 0, total: 0, percentage: 100 }; // 자유 보드는 정답 개념이 없으므로 100%로 표시하거나 무시
        }

        if (!problemData.blanks || !studentAnswer) return { correct: 0, total: 0, percentage: 0 };
        const total = problemData.blanks.length;
        let correctCount = 0;

        if (Array.isArray(studentAnswer)) {
            // Order Matching: Check if items are in correct position
            // problemData.blanks (mockBlanks) contains the correct order
            problemData.blanks.forEach((blank, index) => {
                if (studentAnswer[index] && studentAnswer[index].id === blank.id) {
                    correctCount++;
                }
            });
        } else {
            // Fill Blanks
            problemData.blanks.forEach(blank => {
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
            if (problemData.type === 'free-drop' && val.id) {
                const original = problemData.items.find(pi => pi.id === val.id);
                if (original) {
                    return original.type === 'text' ? original.content : '📷 이미지';
                }
            }
            return val.text || val.word || val.content || '(내용 없음)';
        }
        return val;
    }

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
                        onClick={() => setSelectedStudent(student)}
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
            {selectedStudent && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div>
                                <h2>{selectedStudent.name} 학생의 화면</h2>
                                <span className="accuracy-badge">
                                    정답률: {getAccuracy(selectedStudent.answer).percentage}%
                                    ({getAccuracy(selectedStudent.answer).correct}/{getAccuracy(selectedStudent.answer).total})
                                </span>
                            </div>
                            <button className="btn-close" onClick={() => setSelectedStudent(null)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Mirrored Text View */}
                            <div className="mirrored-text-view">
                                {problemData.type === 'free-drop' ? (
                                    // Free Board View
                                    <div className="free-board-mirror-container">
                                        <div className="mirror-canvas-wrapper">
                                            <img src={problemData.backgroundUrl} alt="bg" className="mirror-bg" />
                                            <div className="mirror-items-layer">
                                                {Array.isArray(selectedStudent.answer) && selectedStudent.answer.filter(i => i.isPlaced).map(item => {
                                                    const originalItem = problemData.items.find(pi => pi.id === item.id);
                                                    if (!originalItem) return null;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`mirror-placed-token ${originalItem.type}`}
                                                            style={{
                                                                left: `${item.x}%`,
                                                                top: `${item.y}%`,
                                                                width: originalItem.type === 'image' ? (originalItem.width ? `${originalItem.width}%` : '15%') : 'auto',
                                                                fontSize: originalItem.type === 'text' ? '14px' : 'inherit',
                                                                zIndex: 10
                                                            }}
                                                        >
                                                            {originalItem.type === 'text' ? originalItem.content : <img src={originalItem.imageUrl} alt="img" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="mirror-tray-status">
                                            <p>남은 카드: {problemData.items.length - (Array.isArray(selectedStudent.answer) ? selectedStudent.answer.filter(i => i.isPlaced).length : 0)}개</p>
                                        </div>
                                    </div>
                                ) : Array.isArray(selectedStudent.answer) ? (
                                    // Order Matching View
                                    <div className="order-matching-view">
                                        <p className="helper-text">학생이 제출한 순서:</p>
                                        <ul className="order-list">
                                            {selectedStudent.answer.map((item, idx) => {
                                                // Check if this position is correct
                                                const correctItem = problemData.blanks[idx];
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
                                        {selectedStudent.answer.length === 0 && <p className="empty-msg">아직 제출한 카드가 없습니다.</p>}
                                    </div>
                                ) : (
                                    // Fill Blanks View
                                    problemData.originalText.split(/\s+/).map((word, index) => {
                                        // Find if this index matches a blank
                                        const blank = problemData.blanks.find(b => b.index === index);

                                        if (blank) {
                                            const studentAnswer = selectedStudent.answer?.[blank.id];
                                            const isCorrect = studentAnswer === blank.word;
                                            const isFilled = !!studentAnswer;

                                            return (
                                                <span
                                                    key={index}
                                                    className={`mirrored-blank ${isFilled ? (isCorrect ? 'correct' : 'incorrect') : 'empty'}`}
                                                >
                                                    <LatexRenderer text={studentAnswer || '(빈칸)'} />
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
