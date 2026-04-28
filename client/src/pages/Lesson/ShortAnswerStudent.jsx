import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import './LessonShared.css';

const ShortAnswerStudent = ({ lessonProblemData, lessonRoomId, lessonNickname, lessonSocket }) => {
    const [answer, setAnswer] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { question } = lessonProblemData;

    // Reset when problem changes
    useEffect(() => {
        setAnswer('');
        setIsSubmitted(false);
    }, [lessonProblemData.id]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!answer.trim()) return;

        setIsSubmitted(true);
        if (lessonSocket && lessonRoomId) {
            lessonSocket.emit('submitLessonAnswer', {
                lessonId: lessonRoomId,
                studentName: lessonNickname,
                answer: answer.trim()
            });
        }
    };

    return (
        <div className="student-container">
            <h2 className="question-card">
                {question}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <textarea
                    className="sa-textarea"
                    placeholder="여기에 정답을 입력하세요..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={isSubmitted}
                />

                <button
                    type="submit"
                    disabled={isSubmitted || !answer.trim()}
                    className="btn-submit-answer"
                >
                    {isSubmitted ? '제출 완료' : (
                        <>
                            <Send size={20} /> 정답 제출하기
                        </>
                    )}
                </button>
            </form>

            {isSubmitted && (
                <div className="waiting-msg">
                    선생님이 확인 중입니다...
                </div>
            )}
        </div>
    );
};

export default ShortAnswerStudent;
