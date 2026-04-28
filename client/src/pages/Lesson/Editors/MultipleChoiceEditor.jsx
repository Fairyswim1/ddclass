import React, { useRef } from 'react';
import { Plus, Trash2, CheckCircle, ImageIcon, X } from 'lucide-react';
import LatexRenderer from '../../../components/LatexRenderer';
import { resolveApiUrl } from '../../../utils/url';

// 선택지는 { text: '', imageUrl: '' } 또는 string (하위 호환)
const toObj = (opt) => typeof opt === 'object' && opt !== null ? opt : { text: String(opt || ''), imageUrl: '' };

const MultipleChoiceEditor = ({ slide, onChange }) => {
    const { question = '', options = ['', ''], answerIndex = 0 } = slide;
    const fileInputRefs = useRef([]);

    const normalizedOptions = options.map(toObj);

    const handleQuestionChange = (e) => onChange({ question: e.target.value });

    const handleOptionTextChange = (index, value) => {
        const newOptions = normalizedOptions.map((o, i) => i === index ? { ...o, text: value } : o);
        onChange({ options: newOptions });
    };

    const handleOptionImageUpload = async (index, file) => {
        if (!file || !file.type.startsWith('image/')) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'lesson-images');
            const res = await fetch(resolveApiUrl('/api/upload'), { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                const newOptions = normalizedOptions.map((o, i) => i === index ? { ...o, imageUrl: data.url } : o);
                onChange({ options: newOptions });
            } else {
                alert('이미지 업로드 실패: ' + data.message);
            }
        } catch (err) {
            alert('업로드 오류: ' + err.message);
        }
    };

    const handleRemoveImage = (index) => {
        const newOptions = normalizedOptions.map((o, i) => i === index ? { ...o, imageUrl: '' } : o);
        onChange({ options: newOptions });
    };

    const handleAddOption = () => {
        if (options.length >= 5) return;
        onChange({ options: [...normalizedOptions, { text: '', imageUrl: '' }] });
    };

    const handleRemoveOption = (index) => {
        if (options.length <= 2) return;
        const newOptions = normalizedOptions.filter((_, i) => i !== index);
        const newAnswerIndex = answerIndex >= newOptions.length ? 0 : answerIndex;
        onChange({ options: newOptions, answerIndex: newAnswerIndex });
    };

    const handleSetAnswer = (index) => onChange({ answerIndex: index });

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
                {question && (question.includes('$') || question.includes('\\[')) && (
                    <div className="option-latex-preview">
                        <LatexRenderer text={question} />
                    </div>
                )}
            </div>

            <div className="editor-group options-group">
                <label>선택지 (최대 5개) — 초록 ✓ 버튼을 눌러 정답 지정</label>
                <div className="options-list">
                    {normalizedOptions.map((opt, idx) => (
                        <div key={idx} className={`option-item ${answerIndex === idx ? 'is-answer' : ''}`}>
                            <button
                                className="btn-set-answer"
                                onClick={() => handleSetAnswer(idx)}
                                title="정답으로 설정"
                            >
                                <CheckCircle size={20} color={answerIndex === idx ? '#10b981' : '#cbd5e1'} />
                            </button>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <input
                                    type="text"
                                    placeholder={`선택지 ${idx + 1} (LaTeX 수식: $x^2$)`}
                                    value={opt.text}
                                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                                    className="option-input"
                                />
                                {opt.text && (opt.text.includes('$') || opt.text.includes('\\[')) && (
                                    <div className="option-latex-preview">
                                        <LatexRenderer text={opt.text} />
                                    </div>
                                )}
                                {opt.imageUrl && (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img src={opt.imageUrl} alt="선택지 이미지" className="option-image-preview" />
                                        <button
                                            onClick={() => handleRemoveImage(idx)}
                                            style={{
                                                position: 'absolute', top: '2px', right: '2px',
                                                background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
                                                borderRadius: '50%', width: '1.2rem', height: '1.2rem',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                className="btn-option-image"
                                onClick={() => fileInputRefs.current[idx]?.click()}
                                title="이미지 추가"
                            >
                                <ImageIcon size={14} />
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                ref={el => fileInputRefs.current[idx] = el}
                                onChange={(e) => handleOptionImageUpload(idx, e.target.files[0])}
                            />

                            {normalizedOptions.length > 2 && (
                                <button className="btn-remove-option" onClick={() => handleRemoveOption(idx)}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {normalizedOptions.length < 5 && (
                    <button className="btn-add-option" onClick={handleAddOption}>
                        <Plus size={16} /> 선택지 추가
                    </button>
                )}
            </div>
        </div>
    );
};

export default MultipleChoiceEditor;
