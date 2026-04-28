import React, { useState, useEffect } from 'react';
import './LessonShared.css';

const MultipleChoiceStudent = ({ lessonProblemData, lessonRoomId, lessonNickname, lessonSocket }) => {
    const [selectedOption, setSelectedOption] = useState(null);
    const { question, options } = lessonProblemData;

    // Reset selection when problem changes
    useEffect(() => {
        setSelectedOption(null);
    }, [lessonProblemData.id]);

    const handleSelect = (idx) => {
        setSelectedOption(idx);

        // Submit answer to teacher
        if (lessonSocket && lessonRoomId) {
            lessonSocket.emit('submitLessonAnswer', {
                lessonId: lessonRoomId,
                studentName: lessonNickname,
                answer: idx
            });
        }
    };

    return (
        <div className="student-container">
            <h2 className="question-card">
                {question}
            </h2>

            <div className="flex flex-col gap-4">
                {options && options.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        className={`option-btn ${selectedOption === idx ? 'selected' : ''}`}
                    >
                        <span className="option-index">{idx + 1}.</span>
                        {opt}
                    </button>
                ))}
            </div>

            {selectedOption !== null && (
                <div className="waiting-msg">
                    답안이 제출되었습니다. 선생님을 기다려주세요.
                </div>
            )}
        </div>
    );
};

export default MultipleChoiceStudent;
