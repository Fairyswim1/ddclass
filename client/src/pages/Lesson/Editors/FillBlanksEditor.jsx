import React from 'react';

const FillBlanksEditor = ({ slide, onChange }) => {
    const { originalText = '', blanks = [], allowDuplicates = false } = slide;

    const parseText = (text) => {
        return text.split(/(\s+)/).map((word, index) => ({ id: `word-${index}`, text: word }));
    };

    const handleTextChange = (e) => {
        const newText = e.target.value;
        onChange({ originalText: newText, blanks: [] }); // Reset blanks when text changes
    };

    const toggleBlank = (wordId, wordText) => {
        if (!wordText.trim()) return; // Don't allow blanking spaces

        const isBlank = blanks.some(b => b.id === wordId);
        let newBlanks;

        if (isBlank) {
            newBlanks = blanks.filter(b => b.id !== wordId);
        } else {
            newBlanks = [...blanks, { id: wordId, word: wordText }];
        }

        onChange({ blanks: newBlanks });
    };

    const words = parseText(originalText);

    return (
        <div className="fb-editor">
            <div className="editor-group">
                <label>본문 텍스트</label>
                <textarea
                    placeholder="여기에 전체 텍스트를 입력하세요..."
                    value={originalText}
                    onChange={handleTextChange}
                    className="slide-textarea"
                    style={{ minHeight: '120px' }}
                />
            </div>

            {originalText && (
                <div className="editor-group" style={{ marginTop: '1rem' }}>
                    <label>단어 선택 (빈칸으로 만들 단어를 클릭하세요)</label>
                    <div className="words-selector-container" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#f8fafc' }}>
                        {words.map((wordObj) => {
                            const isBlank = blanks.some(b => b.id === wordObj.id);
                            return (
                                <span
                                    key={wordObj.id}
                                    onClick={() => toggleBlank(wordObj.id, wordObj.text)}
                                    style={{
                                        cursor: wordObj.text.trim() ? 'pointer' : 'default',
                                        padding: '0.2rem 0.4rem',
                                        margin: '0 0.1rem',
                                        borderRadius: '4px',
                                        backgroundColor: isBlank ? '#10b981' : 'transparent',
                                        color: isBlank ? 'white' : 'inherit',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {wordObj.text}
                                </span>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                        현재 {blanks.length}개의 빈칸이 설정되었습니다.
                    </div>
                </div>
            )}

            <div className="editor-group" style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={allowDuplicates}
                        onChange={(e) => onChange({ allowDuplicates: e.target.checked })}
                    />
                    <span>같은 단어 중복 사용 허용 (학생들이 하나의 단어를 여러 빈칸에 넣을 수 있습니다)</span>
                </label>
            </div>
        </div>
    );
};

export default FillBlanksEditor;
