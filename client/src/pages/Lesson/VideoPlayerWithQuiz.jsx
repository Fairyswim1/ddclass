import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { CheckCircle, Send, Pause, Play } from 'lucide-react';
import './VideoPlayerWithQuiz.css';

// ─────────────────────────────────────────────
// YouTube IFrame API 로더 (전역 1회만 로드)
// ─────────────────────────────────────────────
let ytApiLoaded = false;
let ytApiCallbacks = [];

function loadYouTubeAPI(cb) {
    if (ytApiLoaded && window.YT && window.YT.Player) { cb(); return; }
    ytApiCallbacks.push(cb);
    if (ytApiCallbacks.length > 1) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
        ytApiLoaded = true;
        ytApiCallbacks.forEach(fn => fn());
        ytApiCallbacks = [];
    };
}

const fmtTime = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
};

const TrimVideoControls = ({
    relativeTime,
    trimDuration,
    isPlaying,
    onTogglePlay,
    onSeekRelative,
}) => {
    const barRef = useRef(null);

    const progressPct = trimDuration > 0
        ? Math.min(100, Math.max(0, (relativeTime / trimDuration) * 100))
        : 0;

    const handleBarClick = (e) => {
        const bar = barRef.current;
        if (!bar || trimDuration <= 0) return;
        const rect = bar.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        onSeekRelative(pct * trimDuration);
    };

    return (
        <div className="trim-video-controls">
            <button
                type="button"
                className="trim-video-play-btn"
                onClick={onTogglePlay}
                aria-label={isPlaying ? '일시정지' : '재생'}
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <div
                ref={barRef}
                className="trim-video-progress"
                onClick={handleBarClick}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={trimDuration}
                aria-valuenow={relativeTime}
            >
                <div className="trim-video-progress-fill" style={{ width: `${progressPct}%` }} />
                <div className="trim-video-progress-thumb" style={{ left: `${progressPct}%` }} />
            </div>
            <span className="trim-video-time">
                {fmtTime(relativeTime)} / {fmtTime(trimDuration)}
            </span>
        </div>
    );
};

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
        <div className="video-quiz-overlay">
            <div className="video-quiz-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span className="video-quiz-badge">⏸ 영상 중 퀴즈</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {quiz.type === 'multiple-choice' ? '객관식' : '주관식'}
                    </span>
                </div>

                <p className="video-quiz-question">{quiz.question || '(질문 없음)'}</p>

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                        {(quiz.options || []).map((opt, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setMcSelected(i)}
                                className={`video-quiz-option ${mcSelected === i ? 'selected' : ''}`}
                            >
                                <span className="video-quiz-option-num">{i + 1}</span>
                                <span>{opt}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={mcSelected === null}
                            className="video-quiz-submit"
                            style={{ opacity: mcSelected !== null ? 1 : 0.5 }}
                        >
                            제출하기
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <textarea
                            value={saText}
                            onChange={e => setSaText(e.target.value)}
                            placeholder="답변을 입력하세요..."
                            rows={3}
                            className="video-quiz-textarea"
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!saText.trim()}
                            className="video-quiz-submit video-quiz-submit--row"
                            style={{ opacity: saText.trim() ? 1 : 0.5 }}
                        >
                            <Send size={18} /> 제출하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const VideoPlayerWithQuiz = ({ videoId, trimStart = 0, trimEnd = null, quizPoints = [], onQuizAnswer }) => {
    const playerRef = useRef(null);
    const pollRef = useRef(null);
    const uiPollRef = useRef(null);
    const shownQuizzesRef = useRef(new Set());
    const lastKnownTimeRef = useRef(trimStart);
    const pausedForQuizTimeRef = useRef(null);
    const isResumingRef = useRef(false);
    const startPollRef = useRef(() => {});
    const resumePlaybackRef = useRef(() => {});

    const trimStartRef = useRef(trimStart);
    const trimEndRef = useRef(trimEnd);
    trimStartRef.current = trimStart;
    trimEndRef.current = trimEnd;

    const hasTrim = trimStart > 0 || trimEnd !== null;

    const [activeQuiz, setActiveQuiz] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [videoDuration, setVideoDuration] = useState(null);
    const [relativeTime, setRelativeTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const effectiveEnd = trimEnd ?? videoDuration ?? null;
    const trimDuration = useMemo(() => {
        if (effectiveEnd === null) return 0;
        return Math.max(0, effectiveEnd - trimStart);
    }, [effectiveEnd, trimStart]);

    const sortedQuizzes = useMemo(
        () => [...quizPoints].sort((a, b) => a.timeSeconds - b.timeSeconds),
        [quizPoints]
    );
    const sortedQuizzesRef = useRef(sortedQuizzes);
    sortedQuizzesRef.current = sortedQuizzes;

    const clampToTrim = useCallback((time) => {
        const start = trimStartRef.current;
        const end = trimEndRef.current ?? videoDuration ?? time;
        return Math.min(end, Math.max(start, time));
    }, [videoDuration]);

    const updateUiTime = useCallback(() => {
        const player = playerRef.current;
        if (!player?.getCurrentTime) return;
        try {
            const current = player.getCurrentTime();
            const start = trimStartRef.current;
            const end = trimEndRef.current ?? videoDuration ?? current;
            const relative = Math.min(end - start, Math.max(0, current - start));
            setRelativeTime(relative);
            const state = player.getPlayerState?.();
            setIsPlaying(state === window.YT.PlayerState.PLAYING);
        } catch (_) { /* ignore */ }
    }, [videoDuration]);

    const stopPoll = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const stopUiPoll = useCallback(() => {
        if (uiPollRef.current) {
            clearInterval(uiPollRef.current);
            uiPollRef.current = null;
        }
    }, []);

    const startUiPoll = useCallback(() => {
        if (!hasTrim || uiPollRef.current) return;
        uiPollRef.current = setInterval(updateUiTime, 200);
    }, [hasTrim, updateUiTime]);

    const startPoll = useCallback(() => {
        if (pollRef.current) return;
        pollRef.current = setInterval(() => {
            const player = playerRef.current;
            if (!player?.getPlayerState) return;

            try {
                const state = player.getPlayerState();
                if (state !== window.YT.PlayerState.PLAYING) return;

                const currentTime = player.getCurrentTime?.() ?? 0;
                const trimStartVal = trimStartRef.current;
                const trimEndVal = trimEndRef.current;

                if (Number.isFinite(currentTime) && currentTime > 0) {
                    lastKnownTimeRef.current = currentTime;
                }

                if (!isResumingRef.current && trimStartVal > 0 && currentTime < trimStartVal - 0.25) {
                    const fallback = Math.max(trimStartVal, lastKnownTimeRef.current, pausedForQuizTimeRef.current ?? 0);
                    player.seekTo?.(fallback >= trimStartVal ? fallback : trimStartVal, true);
                    return;
                }

                if (trimEndVal !== null && currentTime >= trimEndVal - 0.15) {
                    player.pauseVideo?.();
                    player.seekTo?.(trimEndVal, true);
                    lastKnownTimeRef.current = trimEndVal;
                    setRelativeTime(trimEndVal - trimStartVal);
                    setIsPlaying(false);
                    stopPoll();
                    return;
                }

                for (const quiz of sortedQuizzesRef.current) {
                    if (!shownQuizzesRef.current.has(quiz.id) && currentTime >= quiz.timeSeconds) {
                        pausedForQuizTimeRef.current = currentTime;
                        lastKnownTimeRef.current = currentTime;
                        player.pauseVideo?.();
                        shownQuizzesRef.current.add(quiz.id);
                        setActiveQuiz(quiz);
                        setSubmitted(false);
                        setIsPlaying(false);
                        stopPoll();
                        return;
                    }
                }

                if (hasTrim) updateUiTime();
            } catch (_) { /* player not ready */ }
        }, 250);
    }, [hasTrim, stopPoll, updateUiTime]);

    const resumePlayback = useCallback(() => {
        const player = playerRef.current;
        if (!player) return;

        const trimStartVal = trimStartRef.current;
        const resumeAt = Math.max(
            trimStartVal,
            pausedForQuizTimeRef.current ?? lastKnownTimeRef.current ?? trimStartVal
        );

        isResumingRef.current = true;
        stopPoll();

        try {
            player.seekTo(resumeAt, true);
        } catch (_) { /* ignore */ }

        const tryPlay = (attempt = 0) => {
            try {
                player.playVideo?.();
            } catch (_) { /* ignore */ }

            if (attempt >= 6) {
                isResumingRef.current = false;
                pausedForQuizTimeRef.current = null;
                startPollRef.current();
                updateUiTime();
                return;
            }

            setTimeout(() => {
                const state = player.getPlayerState?.();
                if (state === window.YT.PlayerState.PLAYING) {
                    isResumingRef.current = false;
                    pausedForQuizTimeRef.current = null;
                    lastKnownTimeRef.current = resumeAt;
                    startPollRef.current();
                    updateUiTime();
                    return;
                }
                tryPlay(attempt + 1);
            }, 200);
        };

        setTimeout(() => tryPlay(0), 120);
    }, [stopPoll, updateUiTime]);

    startPollRef.current = startPoll;
    resumePlaybackRef.current = resumePlayback;

    const handleTogglePlay = useCallback(() => {
        const player = playerRef.current;
        if (!player) return;
        try {
            const state = player.getPlayerState?.();
            if (state === window.YT.PlayerState.PLAYING) {
                player.pauseVideo?.();
                setIsPlaying(false);
                stopPoll();
            } else {
                const current = player.getCurrentTime?.() ?? trimStartRef.current;
                const end = trimEndRef.current ?? videoDuration;
                if (end !== null && current >= end - 0.2) {
                    player.seekTo?.(trimStartRef.current, true);
                    setRelativeTime(0);
                }
                player.playVideo?.();
                setIsPlaying(true);
                startPollRef.current();
            }
            updateUiTime();
        } catch (_) { /* ignore */ }
    }, [stopPoll, updateUiTime, videoDuration]);

    const handleSeekRelative = useCallback((relativeSec) => {
        const player = playerRef.current;
        if (!player) return;
        const target = clampToTrim(trimStartRef.current + relativeSec);
        try {
            player.seekTo?.(target, true);
            lastKnownTimeRef.current = target;
            setRelativeTime(Math.max(0, target - trimStartRef.current));
        } catch (_) { /* ignore */ }
    }, [clampToTrim]);

    useEffect(() => {
        shownQuizzesRef.current = new Set();
        pausedForQuizTimeRef.current = null;
        lastKnownTimeRef.current = trimStart;
        isResumingRef.current = false;
        setRelativeTime(0);
        setVideoDuration(null);
    }, [videoId, trimStart, trimEnd]);

    useEffect(() => {
        if (!videoId) return;

        loadYouTubeAPI(() => {
            const elementId = `yt-player-${videoId}`;

            if (playerRef.current) {
                try { playerRef.current.destroy?.(); } catch (_) { /* ignore */ }
                playerRef.current = null;
            }

            const playerVars = {
                start: Math.floor(trimStart),
                rel: 0,
                modestbranding: 1,
                enablejsapi: 1,
            };

            if (hasTrim) {
                playerVars.controls = 0;
                playerVars.disablekb = 1;
                playerVars.fs = 0;
            }

            if (trimEnd !== null) {
                playerVars.end = Math.floor(trimEnd);
            }

            playerRef.current = new window.YT.Player(elementId, {
                videoId,
                playerVars,
                events: {
                    onReady: (event) => {
                        const duration = event.target.getDuration?.() ?? null;
                        setVideoDuration(duration);
                        lastKnownTimeRef.current = trimStart;
                        setRelativeTime(0);
                        if (trimStart > 0) {
                            event.target.seekTo(trimStart, true);
                        }
                        if (hasTrim) startUiPoll();
                    },
                    onStateChange: (event) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                            startPollRef.current();
                            if (hasTrim) updateUiTime();
                        } else if (
                            event.data === window.YT.PlayerState.PAUSED ||
                            event.data === window.YT.PlayerState.ENDED
                        ) {
                            setIsPlaying(false);
                            stopPoll();
                            if (hasTrim) updateUiTime();
                        }
                    }
                }
            });
        });

        return () => {
            stopPoll();
            stopUiPoll();
            try { playerRef.current?.destroy?.(); } catch (_) { /* ignore */ }
            playerRef.current = null;
        };
    }, [videoId, trimStart, trimEnd, hasTrim, stopPoll, stopUiPoll, startUiPoll, updateUiTime]);

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
            resumePlaybackRef.current();
        }, 1500);
    };

    return (
        <div className={`video-player-wrap ${hasTrim ? 'video-player-wrap--trimmed' : ''}`}>
            <div id={`yt-player-${videoId}`} className="video-player-iframe" />
            {hasTrim && trimDuration > 0 && (
                <TrimVideoControls
                    relativeTime={relativeTime}
                    trimDuration={trimDuration}
                    isPlaying={isPlaying}
                    onTogglePlay={handleTogglePlay}
                    onSeekRelative={handleSeekRelative}
                />
            )}
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
