import React, { useRef, useEffect } from 'react';

const FillBlanksEditor = ({ slide, updateSlide }) => {
    // We expect blanks to be an array of: { id, startOffset, endOffset, word }
    const { originalText = '', blanks = [], allowDuplicates = false } = slide;
    const textRef = useRef(null);

    const handleTextChange = (e) => {
        const newText = e.target.value;
        // Reset blanks when text changes to prevent offset mismatches
        updateSlide(slide.id, { originalText: newText, blanks: [] });
    };

    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        // Ensure selection is within our text container
        if (!textRef.current || !textRef.current.contains(range.commonAncestorContainer)) return;

        // Calculate absolute offsets
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(textRef.current);
        preCaretRange.setEnd(range.startContainer, range.startOffset);

        const startOffset = preCaretRange.toString().length;
        const selectedText = selection.toString();
        const endOffset = startOffset + selectedText.length;

        if (!selectedText.trim()) return;

        // Check for overlaps with existing blanks
        const hasOverlap = blanks.some(b =>
            (startOffset >= b.startOffset && startOffset < b.endOffset) ||
            (endOffset > b.startOffset && endOffset <= b.endOffset) ||
            (startOffset <= b.startOffset && endOffset >= b.endOffset)
        );

        if (hasOverlap) {
            selection.removeAllRanges();
            return; // Ignore overlapping selections
        }

        const newBlank = {
            id: Date.now().toString(),
            startOffset,
            endOffset,
            word: selectedText
        };

        const newBlanks = [...blanks, newBlank].sort((a, b) => a.startOffset - b.startOffset);
        updateSlide(slide.id, { blanks: newBlanks });
        selection.removeAllRanges(); // clear selection after creating blank
    };

    const removeBlank = (id) => {
        const newBlanks = blanks.filter(b => b.id !== id);
        updateSlide(slide.id, { blanks: newBlanks });
    };

    // Render the text with interactive blank highlights
    const renderInteractiveText = () => {
        if (!originalText) return null;
        if (blanks.length === 0) return originalText;

        const elements = [];
        let currentIndex = 0;

        blanks.forEach(blank => {
            // Text before blank
            if (blank.startOffset > currentIndex) {
                elements.push(
                    <span key={`text-${currentIndex}`}>
                        {originalText.slice(currentIndex, blank.startOffset)}
                    </span>
                );
            }
            // Blank element
            elements.push(
                <span
                    key={`blank-${blank.id}`}
                    onClick={() => removeBlank(blank.id)}
                    style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '0.1rem 0.2rem',
                        margin: '0 0.1rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                    title="클릭하여 빈칸 해제"
                >
                    {blank.word}
                </span>
            );
            currentIndex = blank.endOffset;
        });

        // Remaining text
        if (currentIndex < originalText.length) {
            elements.push(
                <span key={`text-${currentIndex}`}>
                    {originalText.slice(currentIndex)}
                </span>
            );
        }

        return elements;
    };

    return (
        <div className="fb-editor">
            <div className="editor-group">
                <label>본문 텍스트 (줄바꿈이 그대로 유지됩니다)</label>
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
                        👉 빈칸 만들기: 아래 텍스트에서 빈칸으로 만들 부분을 마우스로 드래그(선택)하세요.
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
