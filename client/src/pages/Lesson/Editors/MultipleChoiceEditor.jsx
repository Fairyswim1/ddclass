import React from 'react';
import { Plus, Trash2, CheckCircle } from 'lucide-react';

const MultipleChoiceEditor = ({ slide, onChange }) => {
    const { question = '', options = ['', ''], answerIndex = 0 } = slide;

    const handleQuestionChange = (e) => onChange({ question: e.target.value });

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange({ options: newOptions });
    };

    const handleAddOption = () => {
        if (options.length >= 5) return;
        onChange({ options: [...options, ''] });
    };

    const handleRemoveOption = (index) => {
        if (options.length <= 2) return;
        const newOptions = options.filter((_, i) => i !== index);
        const newAnswerIndex = answerIndex >= newOptions.length ? 0 : answerIndex;
        onChange({ options: newOptions, answerIndex: newAnswerIndex });
    };

    const handleSetAnswer = (index) => {
        onChange({ answerIndex: index });
    };

    return (
        <div className="mc-editor">
            <div className="editor-group">
                <label>질문</label>
                <textarea
                    placeholder="학생들에게 물어볼 질문을 입력하세요..."
                    value={question}
                    onChange={handleQuestionChange}
                    className="slide-textarea"
                />
            </div>

            <div className="editor-group options-group">
                <label>선택지 (최대 5개)</label>
                <div className="options-list">
                    {options.map((opt, idx) => (
                        <div key={idx} className={`option-item ${answerIndex === idx ? 'is-answer' : ''}`}>
                            <button
                                className="btn-set-answer"
                                onClick={() => handleSetAnswer(idx)}
                                title="정답으로 설정"
                            >
                                <CheckCircle size={20} color={answerIndex === idx ? '#10b981' : '#cbd5e1'} />
                            </button>
                            <input
                                type="text"
                                placeholder={`선택지 ${idx + 1}`}
                                value={opt}
                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                className="option-input"
                            />
                            {options.length > 2 && (
                                <button className="btn-remove-option" onClick={() => handleRemoveOption(idx)}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {options.length < 5 && (
                    <button className="btn-add-option" onClick={handleAddOption}>
                        <Plus size={16} /> 선택지 추가
                    </button>
                )}
            </div>
        </div>
    );
};

export default MultipleChoiceEditor;
