import React, { useRef, useState, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, ImageIcon, X, Sigma, ToggleLeft, ToggleRight } from 'lucide-react';
import LatexRenderer from '../../../components/LatexRenderer';
import LatexKeyboard from '../../../components/LatexKeyboard';
import { resolveApiUrl } from '../../../utils/url';

const toObj = (opt) => typeof opt === 'object' && opt !== null ? opt : { text: String(opt || ''), imageUrl: '' };

// 정답 인덱스 배열 정규화 (하위 호환)
const getAnswerIndices = (slide) => {
    if (Array.isArray(slide.answerIndices)) return slide.answerIndices;
    if (slide.answerIndex !== undefined) return [slide.answerIndex];
    return [0];
};

const MultipleChoiceEditor = ({ slide, onChange }) => {
    const { question = '', options = ['', ''] } = slide;
    const allowMultiple = slide.allowMultiple || false;
    const answerIndices = getAnswerIndices(slide);

    const fileInputRefs = useRef([]);
    const questionRef = useRef(null);
    const optionRefs = useRef([]);
    const [latexTarget, setLatexTarget] = useState(null);

    const normalizedOptions = options.map(toObj);

    const handleQuestionChange = (e) => onChange({ question: e.target.value });

    const handleOptionTextChange = (index, value) => {
        const newOptions = normalizedOptions.map((o, i) => i === index ? { ...o, text: value } : o);
        onChange({ options: newOptions });
    };

    const insertIntoField = useCallback((el, currentValue, insertText, onChangeFn) => {
        if (!el) { onChangeFn(currentValue + '$' + insertText + '$'); return; }
        const start = el.selectionStart ?? currentValue.length;
        const end = el.selectionEnd ?? currentValue.length;
        const before = currentValue.slice(0, start);
        const after = currentValue.slice(end);
        const needsDollar = !before.endsWith('$');
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

    const handleToggleAnswer = (idx) => {
        let newIndices;
        if (allowMultiple) {
            newIndices = answerIndices.includes(idx)
                ? answerIndices.filter(i => i !== idx)
                : [...answerIndices, idx];
        } else {
            newIndices = [idx];
        }
        onChange({ answerIndices: newIndices, answerIndex: newIndices[0] ?? 0 });
    };

    const handleToggleMultiple = () => {
        const next = !allowMultiple;
        // 단일 정답으로 줄이면 첫 번째만 유지
        const newIndices = next ? answerIndices : (answerIndices.length > 0 ? [answerIndices[0]] : [0]);
        onChange({ allowMultiple: next, answerIndices: newIndices, answerIndex: newIndices[0] ?? 0 });
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
        const newIndices = answerIndices.filter(i => i < newOptions.length);
        onChange({ options: newOptions, answerIndices: newIndices.length ? newIndices : [0], answerIndex: newIndices[0] ?? 0 });
    };

    const toggleLatex = (target) => setLatexTarget(prev => prev === target ? null : target);

    return (
        <div className="mc-editor">
            {/* 복수정답 토글 */}
            <div className="free-toggle-row" style={{ marginBottom: '1rem' }} onClick={handleToggleMultiple}>
                {allowMultiple
                    ? <ToggleRight size={28} color="#9B7FE8" />
                    : <ToggleLeft size={28} color="#cbd5e1" />}
                <span style={{ fontWeight: 600 }}>복수 정답 허용</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '0.3rem' }}>
                    {allowMultiple ? '(여러 개의 정답 선택 가능)' : '(정답 1개)'}
                </span>
            </div>

            <div className="editor-group">
                <div className="editor-group-header">
                    <label>질문</label>
                    <button
                        type="button"
                        className={`btn-latex-toggle ${latexTarget === 'question' ? 'active' : ''}`}
                        onClick={() => toggleLatex('question')}
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
                <label>
                    선택지 (최대 5개) —
                    {allowMultiple
                        ? ' ✓ 버튼으로 정답을 여러 개 지정 가능'
                        : ' ✓ 버튼으로 정답 1개 지정'}
                </label>
                <div className="options-list">
                    {normalizedOptions.map((opt, idx) => {
                        const isAnswer = answerIndices.includes(idx);
                        return (
                            <div key={idx} className={`option-item ${isAnswer ? 'is-answer' : ''}`}>
                                <button
                                    className="btn-set-answer"
                                    onClick={() => handleToggleAnswer(idx)}
                                    title={allowMultiple ? '정답으로 추가/제거' : '정답으로 설정'}
                                >
                                    <CheckCircle size={20} color={isAnswer ? '#10b981' : '#cbd5e1'} />
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
                                    type="file" accept="image/*" style={{ display: 'none' }}
                                    ref={el => fileInputRefs.current[idx] = el}
                                    onChange={(e) => handleOptionImageUpload(idx, e.target.files[0])}
                                />

                                {normalizedOptions.length > 2 && (
                                    <button className="btn-remove-option" onClick={() => handleRemoveOption(idx)}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
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
