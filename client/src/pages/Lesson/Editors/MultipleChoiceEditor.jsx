import React, { useRef, useState, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, ImageIcon, X, Sigma } from 'lucide-react';
import LatexRenderer from '../../../components/LatexRenderer';
import LatexKeyboard from '../../../components/LatexKeyboard';
import { resolveApiUrl } from '../../../utils/url';

// 선택지는 { text: '', imageUrl: '' } 또는 string (하위 호환)
const toObj = (opt) => typeof opt === 'object' && opt !== null ? opt : { text: String(opt || ''), imageUrl: '' };

const MultipleChoiceEditor = ({ slide, onChange }) => {
    const { question = '', options = ['', ''], answerIndex = 0 } = slide;
    const fileInputRefs = useRef([]);
    const questionRef = useRef(null);
    const optionRefs = useRef([]);

    // LaTeX 키보드 표시 상태: 'question' | 'option-{idx}' | null
    const [latexTarget, setLatexTarget] = useState(null);

    const normalizedOptions = options.map(toObj);

    const handleQuestionChange = (e) => onChange({ question: e.target.value });

    const handleOptionTextChange = (index, value) => {
        const newOptions = normalizedOptions.map((o, i) => i === index ? { ...o, text: value } : o);
        onChange({ options: newOptions });
    };

    const insertIntoField = useCallback((textareaRef, currentValue, insertText, onChangeFn) => {
        const el = textareaRef;
        if (!el) { onChangeFn(currentValue + insertText); return; }
        const start = el.selectionStart ?? currentValue.length;
        const end = el.selectionEnd ?? currentValue.length;
        const before = currentValue.slice(0, start);
        const after = currentValue.slice(end);
        // 수식이 인라인이면 $...$로 감싸기
        const needsDollar = !before.endsWith('$') && !insertText.startsWith('$');
        const newVal = needsDollar
            ? before + '$' + insertText + '$' + after
            : before + insertText + after;
        onChangeFn(newVal);
        setTimeout(() => {
            el.focus();
            const pos = (needsDollar ? start + 1 : start) + insertText.length + (needsDollar ? 1 : 0);
            el.setSelectionRange(pos, pos);
        }, 0);
    }, []);

    const handleInsertLatexToQuestion = (sym) => {
        insertIntoField(questionRef.current, question, sym, (v) => onChange({ question: v }));
    };

    const handleInsertLatexToOption = (idx, sym) => {
        const opt = normalizedOptions[idx];
        insertIntoField(optionRefs.current[idx], opt.text, sym, (v) => {
            const newOptions = normalizedOptions.map((o, i) => i === idx ? { ...o, text: v } : o);
            onChange({ options: newOptions });
        });
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

    const toggleLatex = (target) => setLatexTarget(prev => prev === target ? null : target);

    return (
        <div className="mc-editor">
            <div className="editor-group">
                <div className="editor-group-header">
                    <label>질문</label>
                    <button
                        type="button"
                        className={`btn-latex-toggle ${latexTarget === 'question' ? 'active' : ''}`}
                        onClick={() => toggleLatex('question')}
                        title="수식 입력판 열기"
                    >
                        <Sigma size={14} /> 수식
                    </button>
                </div>
                <textarea
                    ref={questionRef}
                    placeholder="학생들에게 물어볼 질문을 입력하세요..."
                    value={question}
                    onChange={handleQuestionChange}
                    className="slide-textarea"
                />
                {latexTarget === 'question' && (
                    <LatexKeyboard onInsert={handleInsertLatexToQuestion} />
                )}
                {question && (question.includes('$') || question.includes('\\[')) && (
                    <div className="option-latex-preview">
                        <LatexRenderer text={question} />
                    </div>
                )}
                <p className="help-text">💡 수식 버튼을 눌러 LaTeX 수식을 입력할 수 있어요.</p>
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
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        ref={el => optionRefs.current[idx] = el}
                                        placeholder={`선택지 ${idx + 1}`}
                                        value={opt.text}
                                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                                        className="option-input"
                                    />
                                    <button
                                        type="button"
                                        className={`btn-latex-toggle sm ${latexTarget === `option-${idx}` ? 'active' : ''}`}
                                        onClick={() => toggleLatex(`option-${idx}`)}
                                        title="수식 입력판"
                                    >
                                        <Sigma size={12} />
                                    </button>
                                </div>
                                {latexTarget === `option-${idx}` && (
                                    <LatexKeyboard onInsert={(sym) => handleInsertLatexToOption(idx, sym)} />
                                )}
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
