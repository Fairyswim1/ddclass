import React from 'react';

const ShortAnswerEditor = ({ slide, onChange }) => {
    const { question = '', answer = '' } = slide;

    const handleQuestionChange = (e) => onChange({ question: e.target.value });
    const handleAnswerChange = (e) => onChange({ answer: e.target.value });

    return (
        <div className="sa-editor">
            <div className="editor-group">
                <label>질문</label>
                <textarea
                    placeholder="학생들에게 물어볼 주관식 질문을 입력하세요..."
                    value={question}
                    onChange={handleQuestionChange}
                    className="slide-textarea"
                />
            </div>

            <div className="editor-group">
                <label>모범 정답 (선택사항)</label>
                <input
                    type="text"
                    placeholder="채점의 기준이 될 정답이나 키워드를 입력하세요"
                    value={answer}
                    onChange={handleAnswerChange}
                    className="slide-input"
                />
                <p className="help-text">
                    학생이 입력한 답과 비교하여 채점할 때 활용됩니다.
                </p>
            </div>
        </div>
    );
};

export default ShortAnswerEditor;
