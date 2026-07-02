import React, { useEffect, useRef, useState } from 'react';
import { Youtube, Link, Plus, Trash2, Clock, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useYoutubeDuration } from '../../../hooks/useYoutubeDuration';
import './VideoEditor.css';

const extractYoutubeId = (url) => {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
};

const toMS = (sec) => {
    const s = Math.max(0, parseInt(sec, 10) || 0);
    return { m: Math.floor(s / 60), s: s % 60 };
};

const fromMS = (m, s) => (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);

const fmtSec = (sec) => {
    if (sec === null || sec === undefined || sec === '') return '—';
    const { m, s } = toMS(sec);
    return `${m}:${String(s).padStart(2, '0')}`;
};

const newQuizPoint = () => ({
    id: `qp-${Date.now()}`,
    timeSeconds: 0,
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    answerIndex: 0,
    answer: '',
});

const timeInputStyle = {
    width: '52px',
    padding: '0.4rem 0.5rem',
    textAlign: 'center',
    border: '1.5px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.9rem',
    outline: 'none',
};

const labelStyle = {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#64748b',
    margin: '0 0 0.3rem',
};

const TimeInput = ({ label, value, onChange }) => {
    const { m, s } = toMS(value ?? 0);
    return (
        <div className="video-trim-time-input">
            <span className="video-trim-time-label">{label}</span>
            <div className="video-trim-time-fields">
                <input
                    type="number"
                    min="0"
                    max="999"
                    value={m}
                    onChange={(e) => onChange(fromMS(e.target.value, s))}
                    className="video-trim-time-field"
                    placeholder="분"
                />
                <span>:</span>
                <input
                    type="number"
                    min="0"
                    max="59"
                    value={s}
                    onChange={(e) => onChange(fromMS(m, e.target.value))}
                    className="video-trim-time-field"
                    placeholder="초"
                />
            </div>
        </div>
    );
};

const VideoTrimBar = ({ duration, trimStart, trimEnd, onChange }) => {
    const trackRef = useRef(null);
    const dragRef = useRef(null);
    const max = duration || 600;
    const end = trimEnd ?? max;

    const clampStart = (value) => Math.max(0, Math.min(value, end - 1));
    const clampEnd = (value) => Math.min(max, Math.max(value, trimStart + 1));

    const secFromClientX = (clientX) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect?.width) return 0;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(ratio * max);
    };

    const beginDrag = (handle, event) => {
        event.preventDefault();
        dragRef.current = handle;

        const onMove = (ev) => {
            const sec = secFromClientX(ev.clientX);
            if (dragRef.current === 'start') {
                onChange({ trimStart: clampStart(sec), trimEnd });
            } else {
                onChange({ trimStart, trimEnd: clampEnd(sec) });
            }
        };

        const onUp = () => {
            dragRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleTrackClick = (event) => {
        if (event.target.closest('.video-trim-handle')) return;
        const sec = secFromClientX(event.clientX);
        const distToStart = Math.abs(sec - trimStart);
        const distToEnd = Math.abs(sec - end);
        if (distToStart <= distToEnd) {
            onChange({ trimStart: clampStart(sec), trimEnd });
        } else {
            onChange({ trimStart, trimEnd: clampEnd(sec) });
        }
    };

    const startPct = (trimStart / max) * 100;
    const endPct = (end / max) * 100;

    return (
        <div className="video-trim-panel">
            <div className="video-trim-header">
                <Clock size={15} color="#6366f1" />
                <p>구간 설정 (Trim)</p>
                <span className="video-trim-badge">
                    {fmtSec(trimStart)} ~ {trimEnd !== null ? fmtSec(trimEnd) : '끝'}
                </span>
            </div>

            <div className="video-trim-track-wrap">
                <div
                    ref={trackRef}
                    className="video-trim-track"
                    onClick={handleTrackClick}
                    role="presentation"
                >
                    <div
                        className="video-trim-selected"
                        style={{ left: `${startPct}%`, width: `${Math.max(endPct - startPct, 0)}%` }}
                    />
                    <div
                        className="video-trim-handle video-trim-handle-start"
                        style={{ left: `${startPct}%` }}
                        onMouseDown={(event) => beginDrag('start', event)}
                        role="slider"
                        aria-label="시작 지점"
                        tabIndex={0}
                    />
                    <div
                        className="video-trim-handle video-trim-handle-end"
                        style={{ left: `${endPct}%` }}
                        onMouseDown={(event) => beginDrag('end', event)}
                        role="slider"
                        aria-label="종료 지점"
                        tabIndex={0}
                    />
                </div>
                <div className="video-trim-labels">
                    <span>0:00</span>
                    <span>{duration ? fmtSec(duration) : '길이 불러오는 중...'}</span>
                </div>
            </div>

            <div className="video-trim-manual-row">
                <TimeInput
                    label="시작 (분:초)"
                    value={trimStart}
                    onChange={(v) => onChange({ trimStart: v, trimEnd })}
                />
                <TimeInput
                    label="종료 (분:초)"
                    value={trimEnd ?? duration ?? 0}
                    onChange={(v) => {
                        const max = duration || v;
                        onChange({ trimStart, trimEnd: v >= max ? null : v });
                    }}
                />
            </div>

            <div className="video-trim-actions">
                {(trimStart > 0 || trimEnd !== null) && (
                    <button
                        type="button"
                        className="video-trim-reset"
                        onClick={() => onChange({ trimStart: 0, trimEnd: null })}
                    >
                        구간 초기화
                    </button>
                )}
            </div>
            <p className="video-trim-hint">막대 드래그 또는 아래 시간 입력으로 구간을 설정할 수 있습니다.</p>
        </div>
    );
};

const VideoEditor = ({ slide, onChange }) => {
    const [inputUrl, setInputUrl] = useState(slide.videoUrl || '');
    const [expandedQuizId, setExpandedQuizId] = useState(null);

    const videoId = extractYoutubeId(slide.videoUrl || '');
    const videoMode = slide.videoMode || 'class';
    const trimStart = slide.trimStart ?? 0;
    const trimEnd = slide.trimEnd ?? null;
    const quizPoints = slide.quizPoints || [];
    const duration = useYoutubeDuration(videoId);

    useEffect(() => {
        setInputUrl(slide.videoUrl || '');
    }, [slide.videoUrl]);

    const handleTrimChange = (patch) => {
        if (!duration) {
            onChange(patch);
            return;
        }

        const next = { ...patch };
        if (next.trimStart !== undefined) {
            const currentEnd = next.trimEnd !== undefined ? next.trimEnd : trimEnd;
            const maxStart = (currentEnd ?? duration) - 1;
            next.trimStart = Math.max(0, Math.min(next.trimStart, maxStart));
        }
        if (next.trimEnd !== undefined && next.trimEnd !== null) {
            next.trimEnd = Math.min(next.trimEnd, duration);
            next.trimEnd = Math.max(next.trimEnd, (next.trimStart ?? trimStart) + 1);
        }
        onChange(next);
    };

    const handleApply = () => {
        const id = extractYoutubeId(inputUrl);
        if (!id) {
            alert('올바른 YouTube URL을 입력해주세요.\n예: https://www.youtube.com/watch?v=xxxxx');
            return;
        }
        onChange({ videoUrl: inputUrl, videoId: id });
    };

    const updateQuizPoint = (id, patch) => {
        onChange({
            quizPoints: quizPoints.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        });
    };

    const addQuizPoint = () => {
        const qp = newQuizPoint();
        onChange({ quizPoints: [...quizPoints, qp] });
        setExpandedQuizId(qp.id);
    };

    const removeQuizPoint = (id) => {
        onChange({ quizPoints: quizPoints.filter((q) => q.id !== id) });
        if (expandedQuizId === id) setExpandedQuizId(null);
    };

    const previewSrc = videoId
        ? `https://www.youtube.com/embed/${videoId}?start=${trimStart}${trimEnd ? `&end=${trimEnd}` : ''}`
        : null;

    return (
        <div className="video-editor-root">
            <div className="video-mode-row">
                {[
                    { val: 'class', icon: '📺', label: '수업 모드', desc: '학생들은 선생님 화면을 함께 봅니다' },
                    { val: 'homework', icon: '📱', label: '과제 모드', desc: '학생 각자 화면에서 영상 재생' },
                ].map((opt) => (
                    <label
                        key={opt.val}
                        className={`video-mode-option ${videoMode === opt.val ? (opt.val === 'class' ? 'active-class' : 'active-homework') : ''}`}
                    >
                        <input
                            type="radio"
                            name="videoMode"
                            value={opt.val}
                            checked={videoMode === opt.val}
                            onChange={() => onChange({ videoMode: opt.val })}
                        />
                        <span className="video-mode-label">
                            <strong>{opt.icon} {opt.label}</strong>
                            <span>{opt.desc}</span>
                        </span>
                    </label>
                ))}
            </div>

            <div className="video-url-row">
                <div className="video-url-input-wrap">
                    <Link size={16} />
                    <input
                        type="text"
                        className="video-url-input"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                    />
                </div>
                <button type="button" className="video-apply-btn" onClick={handleApply}>
                    <Youtube size={18} /> 적용
                </button>
            </div>

            {previewSrc ? (
                <>
                    <div className="video-preview-wrap">
                        <iframe
                            src={previewSrc}
                            title="YouTube video preview"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <VideoTrimBar
                        duration={duration}
                        trimStart={trimStart}
                        trimEnd={trimEnd}
                        onChange={handleTrimChange}
                    />
                </>
            ) : (
                <div className="video-preview-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <Youtube size={48} style={{ color: '#ef4444' }} />
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>YouTube URL을 입력하면 미리보기가 표시됩니다</p>
                </div>
            )}

            <div className="video-section">
                <div className="video-section-title-row">
                    <HelpCircle size={15} color="#f59e0b" />
                    <p>영상 중 퀴즈</p>
                    <span className="video-section-sub">지정한 시각에 영상이 멈추고 퀴즈가 표시됩니다</span>
                    <button type="button" className="video-add-quiz-btn" onClick={addQuizPoint}>
                        <Plus size={14} /> 퀴즈 추가
                    </button>
                </div>

                {quizPoints.length === 0 ? (
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem 0', margin: 0 }}>
                        퀴즈가 없습니다. &quot;퀴즈 추가&quot; 버튼을 눌러 추가하세요.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {quizPoints
                            .slice()
                            .sort((a, b) => a.timeSeconds - b.timeSeconds)
                            .map((qp, qi) => (
                                <QuizPointEditor
                                    key={qp.id}
                                    qp={qp}
                                    index={qi}
                                    expanded={expandedQuizId === qp.id}
                                    onToggle={() => setExpandedQuizId(expandedQuizId === qp.id ? null : qp.id)}
                                    onChange={(patch) => updateQuizPoint(qp.id, patch)}
                                    onRemove={() => removeQuizPoint(qp.id)}
                                />
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const QuizPointEditor = ({ qp, index, expanded, onToggle, onChange, onRemove }) => {
    const { m, s } = toMS(qp.timeSeconds);

    return (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div
                onClick={onToggle}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', background: '#f8fafc', cursor: 'pointer' }}
            >
                <span style={{ background: '#f59e0b', color: 'white', borderRadius: '999px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                    {index + 1}
                </span>
                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem', flex: 1 }}>
                    {qp.question || '(질문 없음)'} &nbsp;
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}>@ {fmtSec(qp.timeSeconds)}</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: qp.type === 'multiple-choice' ? '#6366f1' : '#10b981', background: qp.type === 'multiple-choice' ? '#eef2ff' : '#f0fdf4', padding: '2px 8px', borderRadius: '999px' }}>
                    {qp.type === 'multiple-choice' ? '객관식' : '주관식'}
                </span>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '2px', display: 'flex' }}
                >
                    <Trash2 size={15} />
                </button>
                {expanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
            </div>

            {expanded && (
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem', background: 'white' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div>
                            <p style={labelStyle}>퀴즈 표시 시각</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={m}
                                    onChange={(e) => onChange({ timeSeconds: fromMS(e.target.value, s) })}
                                    style={timeInputStyle}
                                    placeholder="분"
                                />
                                <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={s}
                                    onChange={(e) => onChange({ timeSeconds: fromMS(m, e.target.value) })}
                                    style={timeInputStyle}
                                    placeholder="초"
                                />
                            </div>
                        </div>
                        <div>
                            <p style={labelStyle}>퀴즈 유형</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {[
                                    { val: 'multiple-choice', label: '객관식' },
                                    { val: 'short-answer', label: '주관식' },
                                ].map((opt) => (
                                    <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => onChange({ type: opt.val })}
                                        style={{
                                            padding: '0.4rem 0.9rem',
                                            borderRadius: '6px',
                                            border: '1.5px solid',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.82rem',
                                            borderColor: qp.type === opt.val ? '#6366f1' : '#e2e8f0',
                                            background: qp.type === opt.val ? '#eef2ff' : 'white',
                                            color: qp.type === opt.val ? '#4f46e5' : '#64748b',
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <p style={labelStyle}>질문</p>
                        <input
                            type="text"
                            value={qp.question}
                            onChange={(e) => onChange({ question: e.target.value })}
                            placeholder="학생들에게 보여줄 질문을 입력하세요"
                            style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    {qp.type === 'multiple-choice' && (
                        <div>
                            <p style={labelStyle}>보기 및 정답 선택</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {(qp.options || ['', '', '', '']).map((opt, oi) => (
                                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="radio"
                                            name={`answer-${qp.id}`}
                                            checked={qp.answerIndex === oi}
                                            onChange={() => onChange({ answerIndex: oi })}
                                            title="정답으로 설정"
                                        />
                                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: qp.answerIndex === oi ? '#6366f1' : '#e2e8f0', color: qp.answerIndex === oi ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                                            {oi + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...(qp.options || ['', '', '', ''])];
                                                newOpts[oi] = e.target.value;
                                                onChange({ options: newOpts });
                                            }}
                                            placeholder={`보기 ${oi + 1}`}
                                            style={{ flex: 1, padding: '0.45rem 0.6rem', border: `1.5px solid ${qp.answerIndex === oi ? '#6366f1' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '0.88rem', outline: 'none' }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>왼쪽 라디오 버튼을 클릭하면 정답으로 설정됩니다.</p>
                        </div>
                    )}

                    {qp.type === 'short-answer' && (
                        <div>
                            <p style={labelStyle}>정답 키워드 (채점용)</p>
                            <input
                                type="text"
                                value={qp.answer || ''}
                                onChange={(e) => onChange({ answer: e.target.value })}
                                placeholder="포함되어야 하는 키워드 (예: 광합성)"
                                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>학생 답변에 이 키워드가 포함되면 정답으로 처리됩니다.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoEditor;
