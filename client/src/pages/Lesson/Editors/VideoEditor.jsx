import React, { useState } from 'react';
import { Youtube, Link } from 'lucide-react';

const extractYoutubeId = (url) => {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

const VideoEditor = ({ slide, onChange }) => {
    const [inputUrl, setInputUrl] = useState(slide.videoUrl || '');

    const videoId = extractYoutubeId(slide.videoUrl || '');

    const handleApply = () => {
        const id = extractYoutubeId(inputUrl);
        if (!id) {
            alert('올바른 YouTube URL을 입력해주세요.\n예: https://www.youtube.com/watch?v=xxxxx');
            return;
        }
        onChange({ videoUrl: inputUrl, videoId: id });
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                YouTube 영상 URL을 입력하면 학생 화면에 바로 재생됩니다.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Link size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                        style={{
                            width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                            border: '2px solid #e2e8f0', borderRadius: '8px',
                            fontSize: '0.95rem', boxSizing: 'border-box',
                            outline: 'none'
                        }}
                    />
                </div>
                <button
                    onClick={handleApply}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1.25rem', background: '#ef4444', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontWeight: 'bold', whiteSpace: 'nowrap'
                    }}
                >
                    <Youtube size={18} /> 적용
                </button>
            </div>

            {videoId ? (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '16/9' }}>
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            ) : (
                <div style={{
                    aspectRatio: '16/9', background: '#0f0f0f', borderRadius: '12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem'
                }}>
                    <Youtube size={48} style={{ color: '#ef4444' }} />
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>YouTube URL을 입력하면 미리보기가 표시됩니다</p>
                </div>
            )}

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                지원 형식: youtube.com/watch, youtu.be, youtube.com/shorts
            </p>
        </div>
    );
};

export default VideoEditor;
