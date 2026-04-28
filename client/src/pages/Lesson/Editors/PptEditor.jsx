import React, { useState } from 'react';
import { Presentation, Link, Info } from 'lucide-react';

const PptEditor = ({ slide, onChange }) => {
    const [inputUrl, setInputUrl] = useState(slide.pptEmbedUrl || '');

    const handleApply = () => {
        const url = inputUrl.trim();
        if (!url) {
            alert('Google 슬라이드 게시 URL을 입력해주세요.');
            return;
        }
        // Accept both embed and pub URLs
        let embedUrl = url;
        if (url.includes('/pub?') && !url.includes('/embed?')) {
            embedUrl = url.replace('/pub?', '/embed?');
        }
        onChange({ pptEmbedUrl: embedUrl });
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <Info size={18} style={{ color: '#0284c7', flexShrink: 0, marginTop: '0.1rem' }} />
                <div style={{ fontSize: '0.875rem', color: '#0c4a6e', lineHeight: '1.6' }}>
                    <strong>Google 슬라이드 게시 방법:</strong><br />
                    파일 → 공유 → 웹에 게시 → 게시 → URL 복사
                    <br />
                    <span style={{ color: '#0284c7' }}>예: https://docs.google.com/presentation/d/.../pub?...</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Link size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="https://docs.google.com/presentation/d/.../pub?..."
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                        style={{
                            width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                            border: '2px solid #e2e8f0', borderRadius: '8px',
                            fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none'
                        }}
                    />
                </div>
                <button
                    onClick={handleApply}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1.25rem', background: '#f59e0b', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontWeight: 'bold', whiteSpace: 'nowrap'
                    }}
                >
                    <Presentation size={18} /> 적용
                </button>
            </div>

            {slide.pptEmbedUrl ? (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '16/9' }}>
                    <iframe
                        src={slide.pptEmbedUrl}
                        title="Google Slides"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        allowFullScreen
                    />
                </div>
            ) : (
                <div style={{
                    aspectRatio: '16/9', background: '#fffbeb', borderRadius: '12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                    border: '2px dashed #fbbf24'
                }}>
                    <Presentation size={48} style={{ color: '#f59e0b' }} />
                    <p style={{ color: '#92400e', fontSize: '0.95rem', fontWeight: 'bold' }}>Google 슬라이드 URL을 입력하면 미리보기가 표시됩니다</p>
                </div>
            )}
        </div>
    );
};

export default PptEditor;
