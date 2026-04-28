import React, { useRef, useState } from 'react';
import { Sigma } from 'lucide-react';
import LatexRenderer from '../../../components/LatexRenderer';
import LatexKeyboard from '../../../components/LatexKeyboard';

const ShortAnswerEditor = ({ slide, onChange }) => {
    const { question = '', answer = '' } = slide;
    const questionRef = useRef(null);
    const [showLatex, setShowLatex] = useState(false);

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
                </div>
                <textarea
                    ref={questionRef}
                    placeholder="학생들에게 물어볼 주관식 질문을 입력하세요... (수식: $x^2+1$)"
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
