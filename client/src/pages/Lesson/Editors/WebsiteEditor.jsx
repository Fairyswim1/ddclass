import React, { useState } from 'react';
import { Globe, Link, Info, ExternalLink, AlertTriangle } from 'lucide-react';

const normalizeUrl = (url) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return 'https://' + trimmed;
};

const WebsiteEditor = ({ slide, onChange }) => {
    const [inputUrl, setInputUrl] = useState(slide.websiteUrl || '');
    const [previewError, setPreviewError] = useState(false);

    const handleApply = () => {
        const url = normalizeUrl(inputUrl);
        if (!url) {
            alert('웹사이트 주소를 입력해주세요.');
            return;
        }
        try { new URL(url); } catch {
            alert('올바른 URL 형식이 아닙니다.\n예: https://example.com');
            return;
        }
        setPreviewError(false);
        onChange({ websiteUrl: url });
        setInputUrl(url);
    };

    return (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* 안내 */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                <Info size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '0.1rem' }} />
                <div style={{ fontSize: '0.875rem', color: '#14532d', lineHeight: 1.6 }}>
                    <strong>웹사이트 주소를 입력하면 학생 화면에 바로 표시됩니다.</strong><br />
                    <span style={{ color: '#15803d' }}>
                        • https:// 없이 입력해도 자동으로 추가됩니다<br />
                        • 일부 사이트(네이버, 구글 등)는 보안 정책으로 임베드가 차단될 수 있습니다
                    </span>
                </div>
            </div>

            {/* URL 입력 */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Link size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="https://example.com 또는 example.com"
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleApply()}
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
                        padding: '0.75rem 1.25rem', background: '#16a34a', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontWeight: 'bold', whiteSpace: 'nowrap'
                    }}
                >
                    <Globe size={18} /> 적용
                </button>
            </div>

            {/* 미리보기 */}
            {slide.websiteUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {previewError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#9a3412' }}>
                            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                            <span>이 사이트는 임베드를 차단하고 있습니다. 학생 화면에서는 "새 탭에서 열기" 버튼이 표시됩니다.</span>
                        </div>
                    )}
                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '16/9', position: 'relative' }}>
                        <iframe
                            key={slide.websiteUrl}
                            src={slide.websiteUrl}
                            title="Website preview"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            onError={() => setPreviewError(true)}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <a href={slide.websiteUrl} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>
                            <ExternalLink size={13} /> 새 탭에서 열기
                        </a>
                        <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>{slide.websiteUrl}</span>
                    </div>
                </div>
            ) : (
                <div style={{
                    aspectRatio: '16/9', background: '#f0fdf4', borderRadius: '12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                    border: '2px dashed #86efac'
                }}>
                    <Globe size={48} style={{ color: '#16a34a', opacity: 0.5 }} />
                    <p style={{ color: '#166534', fontSize: '0.95rem', fontWeight: 'bold' }}>
                        웹사이트 주소를 입력하면 미리보기가 표시됩니다
                    </p>
                </div>
            )}
        </div>
    );
};

export default WebsiteEditor;
