import React, { useRef, useState } from 'react';
import { Sigma, ImageIcon, X, Loader2 } from 'lucide-react';
import LatexRenderer from '../../../components/LatexRenderer';
import LatexKeyboard from '../../../components/LatexKeyboard';
import { resolveApiUrl } from '../../../utils/url';

const ShortAnswerEditor = ({ slide, onChange }) => {
    const { question = '', answer = '' } = slide;
    const questionRef = useRef(null);
    const questionImgRef = useRef(null);
    const [showLatex, setShowLatex] = useState(false);
    const [questionImgUploading, setQuestionImgUploading] = useState(false);

    const handleQuestionImageUpload = async (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setQuestionImgUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'lesson-images');
            const res = await fetch(resolveApiUrl('/api/upload'), { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                onChange({ questionImageUrl: data.url });
            } else {
                alert('이미지 업로드 실패: ' + data.message);
            }
        } catch (err) {
            alert('업로드 오류: ' + err.message);
        } finally {
            setQuestionImgUploading(false);
        }
    };

    const handleQuestionChange = (e) => onChange({ question: e.target.value });
    const handleAnswerChange = (e) => onChange({ answer: e.target.value });

    const handleInsertLatex = (sym) => {
        const el = questionRef.current;
        if (!el) { onChange({ question: question + '$' + sym + '$' }); return; }
        const start = el.selectionStart ?? question.length;
        const end = el.selectionEnd ?? question.length;
        const before = question.slice(0, start);
        const after = question.slice(end);
        const needsDollar = !before.endsWith('$');
        const newVal = needsDollar
            ? before + '$' + sym + '$' + after
            : before + sym + after;
        onChange({ question: newVal });
        setTimeout(() => {
            el.focus();
            const pos = (needsDollar ? start + 1 : start) + sym.length + (needsDollar ? 1 : 0);
            el.setSelectionRange(pos, pos);
        }, 0);
    };

    return (
        <div className="sa-editor">
            <div className="editor-group">
                <div className="editor-group-header">
                    <label>질문</label>
                    <button
                        type="button"
                        className={`btn-latex-toggle ${showLatex ? 'active' : ''}`}
                        onClick={() => setShowLatex(v => !v)}
                        title="수식 입력판 열기"
                    >
                        <Sigma size={14} /> 수식
                    </button>
                    <button
                        type="button"
                        className="btn-latex-toggle"
                        onClick={() => questionImgRef.current?.click()}
                        title="질문에 이미지 첨부"
                        disabled={questionImgUploading}
                        style={{ marginLeft: '0.25rem' }}
                    >
                        {questionImgUploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                        {' '}이미지
                    </button>
                    <input
                        type="file" accept="image/*" style={{ display: 'none' }}
                        ref={questionImgRef}
                        onChange={e => handleQuestionImageUpload(e.target.files[0])}
                    />
                </div>
                <textarea
                    ref={questionRef}
                    placeholder="학생들에게 물어볼 주관식 질문을 입력하세요..."
                    value={question}
                    onChange={handleQuestionChange}
                    className="slide-textarea"
                />
                {showLatex && (
                    <LatexKeyboard onInsert={handleInsertLatex} />
                )}
                {question && (question.includes('$') || question.includes('\\[')) && (
                    <div className="option-latex-preview">
                        <LatexRenderer text={question} />
                    </div>
                )}
                {slide.questionImageUrl && (
                    <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.5rem' }}>
                        <img
                            src={slide.questionImageUrl}
                            alt="질문 이미지"
                            style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <button
                            onClick={() => onChange({ questionImageUrl: '' })}
                            style={{
                                position: 'absolute', top: '4px', right: '4px',
                                background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none',
                                borderRadius: '50%', width: '1.4rem', height: '1.4rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="이미지 제거"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
                <p className="help-text">💡 수식 버튼을 눌러 LaTeX 수식을 입력할 수 있어요.</p>
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
