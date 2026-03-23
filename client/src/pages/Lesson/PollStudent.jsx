import React, { useState, useEffect } from 'react';
import './LessonShared.css';

const PollStudent = ({ lessonProblemData, lessonRoomId, lessonNickname, lessonSocket }) => {
    const [selectedOption, setSelectedOption] = useState(null);
    const { question, options } = lessonProblemData;

    useEffect(() => {
        setSelectedOption(null);
    }, [lessonProblemData.id]);

    const handleSelect = (idx) => {
        setSelectedOption(idx);

        if (lessonSocket && lessonRoomId) {
            lessonSocket.emit('submitLessonAnswer', {
                roomId: lessonRoomId,
                nickname: lessonNickname,
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
                        style={{ textAlign: 'center', justifyContent: 'center' }}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            {selectedOption !== null && (
                <div className="waiting-msg">
                    투표가 완료되었습니다. 다른 친구들을 기다려주세요!
                </div>
            )}
        </div>
    );
};

export default PollStudent;
