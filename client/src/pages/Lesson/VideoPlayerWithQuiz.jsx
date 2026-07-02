import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Send } from 'lucide-react';

// ─────────────────────────────────────────────
// YouTube IFrame API 로더 (전역 1회만 로드)
// ─────────────────────────────────────────────
let ytApiLoaded = false;
let ytApiCallbacks = [];

function loadYouTubeAPI(cb) {
    if (ytApiLoaded && window.YT && window.YT.Player) { cb(); return; }
    ytApiCallbacks.push(cb);
    if (ytApiCallbacks.length > 1) return; // 이미 로딩 중
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
        ytApiLoaded = true;
        ytApiCallbacks.forEach(fn => fn());
        ytApiCallbacks = [];
    };
}

// ─────────────────────────────────────────────
// QuizOverlay — 퀴즈 오버레이 UI
// ─────────────────────────────────────────────
const QuizOverlay = ({ quiz, onSubmit, submitted }) => {
    const [mcSelected, setMcSelected] = useState(null);
    const [saText, setSaText] = useState('');

    const handleSubmit = () => {
        if (quiz.type === 'multiple-choice') {
            if (mcSelected === null) return;
            onSubmit(mcSelected);
        } else {
            if (!saText.trim()) return;
            onSubmit(saText.trim());
        }
    };

    return (
        <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1.5rem'
        }}>
            <div style={{
                background: 'white', borderRadius: '20px', padding: '2rem',
                width: '100%', maxWidth: '520px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
            }}>
                {/* 상단 배지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ background: '#f59e0b', color: 'white', borderRadius: '999px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 800 }}>
                        ⏸ 영상 중 퀴즈
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {quiz.type === 'multiple-choice' ? '객관식' : '주관식'}
                    </span>
                </div>

                {/* 질문 */}
                <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                    {quiz.question || '(질문 없음)'}
                </p>

                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#6366f1' }}>
                            <CheckCircle size={48} />
                            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>답변이 제출되었습니다</p>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '1rem' }}>
                            잠시 후 영상이 재개됩니다...
                        </p>
                    </div>
                ) : quiz.type === 'multiple-choice' ? (
                    /* 객관식 보기 */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                        {(quiz.options || []).map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => setMcSelected(i)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 1rem', border: '2px solid',
                                    borderColor: mcSelected === i ? '#6366f1' : '#e2e8f0',
                                    borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                                    background: mcSelected === i ? '#eef2ff' : 'white',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <span style={{
                                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                                    background: mcSelected === i ? '#6366f1' : '#f1f5f9',
                                    color: mcSelected === i ? 'white' : '#64748b',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '0.8rem'
                                }}>{i + 1}</span>
                                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{opt}</span>
                            </button>
                        ))}
                        <button
                            onClick={handleSubmit}
                            disabled={mcSelected === null}
                            style={{
                                marginTop: '0.25rem', padding: '0.75rem', background: mcSelected !== null ? '#6366f1' : '#e2e8f0',
                                color: mcSelected !== null ? 'white' : '#94a3b8', border: 'none', borderRadius: '10px',
                                cursor: mcSelected !== null ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '1rem'
                            }}
                        >
                            제출하기
                        </button>
                    </div>
                ) : (
                    /* 주관식 입력 */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <textarea
                            value={saText}
                            onChange={e => setSaText(e.target.value)}
                            placeholder="답변을 입력하세요..."
                            rows={3}
                            style={{
                                padding: '0.75rem', border: '2px solid #e2e8f0', borderRadius: '10px',
                                fontSize: '0.95rem', resize: 'none', outline: 'none', fontFamily: 'inherit'
                            }}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                            autoFocus
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!saText.trim()}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.75rem', background: saText.trim() ? '#6366f1' : '#e2e8f0',
                                color: saText.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: '10px',
                                cursor: saText.trim() ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '1rem'
                            }}
                        >
                            <Send size={18} /> 제출하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// VideoPlayerWithQuiz
// props:
//   videoId: string
//   trimStart: number (초, 기본 0)
//   trimEnd: number | null
//   quizPoints: [{ id, timeSeconds, type, question, options, answerIndex, answer }]
//   onQuizAnswer: (quizId, answer, isCorrect) => void  (학습 데이터 전달용)
// ─────────────────────────────────────────────
const VideoPlayerWithQuiz = ({ videoId, trimStart = 0, trimEnd = null, quizPoints = [], onQuizAnswer }) => {
    const containerRef = useRef(null);
    const playerRef = useRef(null);
    const pollRef = useRef(null);
    const shownQuizzesRef = useRef(new Set());
    const lastKnownTimeRef = useRef(trimStart);

    const [activeQuiz, setActiveQuiz] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    // 퀴즈 정렬 (시간순)
    const sortedQuizzes = [...quizPoints].sort((a, b) => a.timeSeconds - b.timeSeconds);

    const startPoll = useCallback(() => {
        if (pollRef.current) return;
        pollRef.current = setInterval(() => {
            if (!playerRef.current) return;
            try {
                const state = playerRef.current.getPlayerState?.();
                if (state !== 1) return;
                const currentTime = playerRef.current.getCurrentTime?.() ?? 0;

                if (Number.isFinite(currentTime) && currentTime > 0) {
                    lastKnownTimeRef.current = currentTime;
                }

                if (trimStart > 0 && currentTime < trimStart - 0.25) {
                    if (lastKnownTimeRef.current >= trimStart) {
                        playerRef.current.seekTo?.(lastKnownTimeRef.current, true);
                        return;
                    }
                    playerRef.current.seekTo?.(trimStart, true);
                    lastKnownTimeRef.current = trimStart;
                    return;
                }

                if (trimEnd !== null && currentTime >= trimEnd - 0.15) {
                    playerRef.current.pauseVideo?.();
                    playerRef.current.seekTo?.(trimEnd, true);
                    lastKnownTimeRef.current = trimEnd;
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    return;
                }

                for (const quiz of sortedQuizzes) {
                    if (!shownQuizzesRef.current.has(quiz.id) && currentTime >= quiz.timeSeconds) {
                        lastKnownTimeRef.current = currentTime;
                        playerRef.current.pauseVideo?.();
                        shownQuizzesRef.current.add(quiz.id);
                        setActiveQuiz(quiz);
                        setSubmitted(false);
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                        return;
                    }
                }
            } catch (_) { /* player not ready */ }
        }, 250);
    }, [sortedQuizzes, trimEnd, trimStart]);

    const resumePlayback = useCallback(() => {
        const resumeAt = Math.max(trimStart, lastKnownTimeRef.current || trimStart);
        try {
            playerRef.current?.seekTo?.(resumeAt, true);
            setTimeout(() => {
                playerRef.current?.playVideo?.();
                startPoll();
            }, 150);
        } catch (_) {
            try { playerRef.current?.playVideo?.(); } catch (_) {}
            startPoll();
        }
    }, [trimStart, startPoll]);

    useEffect(() => {
        lastKnownTimeRef.current = trimStart;
    }, [videoId, trimStart]);

    useEffect(() => {
        if (!videoId) return;

        loadYouTubeAPI(() => {
            const elementId = `yt-player-${videoId}`;
            if (playerRef.current) {
                playerRef.current.destroy?.();
                playerRef.current = null;
            }

            playerRef.current = new window.YT.Player(elementId, {
                videoId,
                playerVars: {
                    start: Math.floor(trimStart),
                    rel: 0,
                    modestbranding: 1,
                    enablejsapi: 1,
                },
                events: {
                    onReady: (event) => {
                        lastKnownTimeRef.current = trimStart;
                        if (trimStart > 0) {
                            event.target.seekTo(trimStart, true);
                        }
                    },
                    onStateChange: (event) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            startPoll();
                        } else if (
                            event.data === window.YT.PlayerState.PAUSED ||
                            event.data === window.YT.PlayerState.ENDED
                        ) {
                            if (pollRef.current) {
                                clearInterval(pollRef.current);
                                pollRef.current = null;
                            }
                        }
                    }
                }
            });
        });

        return () => {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            playerRef.current?.destroy?.();
            playerRef.current = null;
        };
    }, [videoId, trimStart, trimEnd, startPoll]);

    const handleQuizSubmit = (answer) => {
        if (!activeQuiz) return;

        let isCorrect = false;

        if (activeQuiz.type === 'multiple-choice') {
            isCorrect = answer === activeQuiz.answerIndex;
        } else {
            const keyword = (activeQuiz.answer || '').toLowerCase();
            isCorrect = keyword && String(answer).toLowerCase().includes(keyword);
        }

        setSubmitted(true);
        onQuizAnswer?.(activeQuiz.id, answer, isCorrect);

        setTimeout(() => {
            setActiveQuiz(null);
            setSubmitted(false);
            resumePlayback();
        }, 2000);
    };

    return (
        <div
            ref={containerRef}
            style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}
        >
            {/* YouTube 플레이어 삽입 대상 div */}
            <div id={`yt-player-${videoId}`} style={{ width: '100%', height: '100%' }} />

            {/* 퀴즈 오버레이 */}
            {activeQuiz && (
                <QuizOverlay
                    quiz={activeQuiz}
                    onSubmit={handleQuizSubmit}
                    submitted={submitted}
                />
            )}
        </div>
    );
};

export default VideoPlayerWithQuiz;
