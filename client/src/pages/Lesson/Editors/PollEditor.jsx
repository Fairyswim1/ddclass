import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const PollEditor = ({ slide, onChange }) => {
    const { question = '', options = ['', ''] } = slide;

    const handleQuestionChange = (e) => onChange({ question: e.target.value });

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange({ options: newOptions });
    };

    const handleAddOption = () => {
        if (options.length >= 10) return;
        onChange({ options: [...options, ''] });
    };

    const handleRemoveOption = (index) => {
        if (options.length <= 2) return;
        const newOptions = options.filter((_, i) => i !== index);
        onChange({ options: newOptions });
    };

    return (
        <div className="poll-editor">
            <div className="editor-group">
                <label>투표 주제</label>
                <textarea
                    placeholder="학생들에게 투표를 받을 주제를 입력하세요... (예: 오늘 점심 메뉴는?)"
                    value={question}
                    onChange={handleQuestionChange}
                    className="slide-textarea"
                />
            </div>

            <div className="editor-group options-group">
                <label>투표 항목 (최대 10개)</label>
                <div className="options-list">
                    {options.map((opt, idx) => (
                        <div key={idx} className="option-item">
                            <span className="option-index">{idx + 1}.</span>
                            <input
                                type="text"
                                placeholder={`항목 ${idx + 1}`}
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
                {options.length < 10 && (
                    <button className="btn-add-option" onClick={handleAddOption}>
                        <Plus size={16} /> 항목 추가
                    </button>
                )}
            </div>
        </div>
    );
};

export default PollEditor;
