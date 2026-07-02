import React, { useRef, useEffect } from 'react';
import LatexRenderer from '../../../components/LatexRenderer';
import LatexSelectableText from '../../../components/LatexSelectableText';
import { hasBlankOverlap, resolveBlankSelection } from '../../../utils/blankTextSelection';

const FillBlanksEditor = ({ slide, updateSlide }) => {
    // We expect blanks to be an array of: { id, startOffset, endOffset, word }
    const { originalText = '', blanks = [], allowDuplicates = false } = slide;
    const textRef = useRef(null);

    const handleTextChange = (e) => {
        const newText = e.target.value;
        // Reset blanks when text changes to prevent offset mismatches
        updateSlide(slide.id, { originalText: newText, blanks: [] });
    };

    const handleMouseUp = (e) => {
        const selection = window.getSelection();
        if (!textRef.current) return;

        const resolved = resolveBlankSelection(textRef.current, originalText, selection, e.target);
        if (!resolved) return;

        const { startOffset, endOffset, selectedText } = resolved;

        if (hasBlankOverlap(blanks, startOffset, endOffset)) {
            selection?.removeAllRanges();
            return;
        }

        const newBlank = {
            id: Date.now().toString(),
            startOffset,
            endOffset,
            word: selectedText
        };

        const newBlanks = [...blanks, newBlank].sort((a, b) => a.startOffset - b.startOffset);
        updateSlide(slide.id, { blanks: newBlanks });
        selection?.removeAllRanges();
    };

    const removeBlank = (id) => {
        const newBlanks = blanks.filter(b => b.id !== id);
        updateSlide(slide.id, { blanks: newBlanks });
    };

    // Render the text with interactive blank highlights
    const renderInteractiveText = () => {
        if (!originalText) return null;

        if (blanks.length === 0) {
            return <LatexSelectableText text={originalText} keyPrefix="text-full" />;
        }

        const elements = [];
        let currentIndex = 0;

        blanks.forEach(blank => {
            if (blank.startOffset > currentIndex) {
                const textPart = originalText.slice(currentIndex, blank.startOffset);
                elements.push(
                    <LatexSelectableText
                        key={`text-${currentIndex}`}
                        text={textPart}
                        baseOffset={currentIndex}
                        keyPrefix={`text-${currentIndex}`}
                    />
                );
            }
            elements.push(
                <span
                    key={`blank-${blank.id}`}
                    data-offset={blank.startOffset}
                    data-length={blank.endOffset - blank.startOffset}
                    onClick={() => removeBlank(blank.id)}
                    className="word-chip-refined is-blank"
                    style={{
                        cursor: 'pointer',
                        margin: '0 2px',
                        backgroundColor: '#ffce44',
                        color: '#4e342e',
                        border: '2px solid #E6B400',
                        padding: '4px 10px',
                        borderRadius: '10px',
                        display: 'inline-block',
                        fontWeight: '800',
                        boxShadow: '0 4px 0 #E6B400'
                    }}
                    title="클릭하여 빈칸 해제"
                >
                    <LatexRenderer text={blank.word} />
                </span>
            );
            currentIndex = blank.endOffset;
        });

        if (currentIndex < originalText.length) {
            const textPart = originalText.slice(currentIndex);
            elements.push(
                <LatexSelectableText
                    key="text-end"
                    text={textPart}
                    baseOffset={currentIndex}
                    keyPrefix="text-end"
                />
            );
        }

        return elements;
    };

    return (
        <div className="fb-editor">
            <div className="editor-group">
                <div className="editor-group-header">
                    <label>본문 텍스트 (줄바꿈이 그대로 유지됩니다)</label>
                </div>
                <textarea
                    placeholder="여기에 전체 텍스트를 입력하세요. 줄바꿈을 하면 학생 화면에서도 그대로 줄바꿈이 적용됩니다."
                    value={originalText}
                    onChange={handleTextChange}
                    className="slide-textarea"
                    style={{ minHeight: '120px', width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '0.5rem' }}
                />
            </div>

            {originalText && (
                <div className="editor-group" style={{ marginTop: '1.5rem' }}>
                    <label style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.5rem', display: 'block' }}>
                        👉 일반 텍스트는 드래그로 선택하고, LaTeX 수식은 클릭하면 해당 수식만 빈칸으로 지정됩니다.
                    </label>
                    <div
                        className="words-selector-container"
                        style={{
                            padding: '1.5rem',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '0.5rem',
                            background: '#f8fafc',
                            fontSize: '1.125rem',
                            lineHeight: '1.8',
                            whiteSpace: 'pre-wrap', // Preserves exact spaces and newlines
                            userSelect: 'text'
                        }}
                        ref={textRef}
                        onMouseUp={handleMouseUp}
                    >
                        {renderInteractiveText()}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                        초록색으로 표시된 부분이 빈칸입니다. 해제하려면 초록색 단어를 클릭하세요. (현재 {blanks.length}개의 빈칸 설정됨)
                    </div>
                </div>
            )}

            <div className="editor-group" style={{ marginTop: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={allowDuplicates}
                        onChange={(e) => updateSlide(slide.id, { allowDuplicates: e.target.checked })}
                        style={{ width: '1.25rem', height: '1.25rem' }}
                    />
                    <span style={{ fontWeight: 500, color: '#334155' }}>
                        같은 단어 중복 사용 허용 (학생들이 단어 카드 하나를 여러 빈칸에 넣을 수 있습니다)
                    </span>
                </label>
            </div>
        </div>
    );
};

export default FillBlanksEditor;
