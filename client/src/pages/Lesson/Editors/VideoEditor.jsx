import React, { useState } from 'react';
import { Youtube, Link, Plus, Trash2, Clock, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

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

// 초 → { m, s }
const toMS = (sec) => {
    const s = Math.max(0, parseInt(sec) || 0);
    return { m: Math.floor(s / 60), s: s % 60 };
};
// { m, s } → 초
const fromMS = (m, s) => (parseInt(m) || 0) * 60 + (parseInt(s) || 0);

// 초 → "MM:SS" 표시
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

// ─────────────────────────────────────────────
// 시간 입력 컴포넌트 (분:초)
// ─────────────────────────────────────────────
const TimeInput = ({ label, value, onChange }) => {
    const { m, s } = toMS(value);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                    type="number" min="0" max="999" value={m}
                    onChange={e => onChange(fromMS(e.target.value, s))}
                    style={timeInputStyle}
                    placeholder="분"
                />
                <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                <input
                    type="number" min="0" max="59" value={s}
                    onChange={e => onChange(fromMS(m, e.target.value))}
                    style={timeInputStyle}
                    placeholder="초"
                />
            </div>
        </div>
    );
};

const timeInputStyle = {
    width: '52px', padding: '0.4rem 0.5rem', textAlign: 'center',
    border: '1.5px solid #e2e8f0', borderRadius: '6px',
    fontSize: '0.9rem', outline: 'none'
};

// ─────────────────────────────────────────────
// VideoEditor
// ─────────────────────────────────────────────
const VideoEditor = ({ slide, onChange }) => {
    const [inputUrl, setInputUrl] = useState(slide.videoUrl || '');
    const [expandedQuizId, setExpandedQuizId] = useState(null);

    const videoId = extractYoutubeId(slide.videoUrl || '');
    const videoMode = slide.videoMode || 'class';
    const trimStart = slide.trimStart ?? 0;
    const trimEnd = slide.trimEnd ?? null;
    const quizPoints = slide.quizPoints || [];

    const handleApply = () => {
        const id = extractYoutubeId(inputUrl);
        if (!id) {
            alert('올바른 YouTube URL을 입력해주세요.\n예: https://www.youtube.com/watch?v=xxxxx');
            return;
        }
        onChange({ videoUrl: inputUrl, videoId: id });
    };

    // 퀴즈 포인트 변경
    const updateQuizPoint = (id, patch) => {
        onChange({
            quizPoints: quizPoints.map(q => q.id === id ? { ...q, ...patch } : q)
        });
    };
    const addQuizPoint = () => {
        const qp = newQuizPoint();
        onChange({ quizPoints: [...quizPoints, qp] });
        setExpandedQuizId(qp.id);
    };
    const removeQuizPoint = (id) => {
        onChange({ quizPoints: quizPoints.filter(q => q.id !== id) });
        if (expandedQuizId === id) setExpandedQuizId(null);
    };

    // 미리보기 iframe src
    const previewSrc = videoId
        ? `https://www.youtube.com/embed/${videoId}?start=${trimStart}${trimEnd ? `&end=${trimEnd}` : ''}`
        : null;

    return (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* ── 재생 모드 ── */}
            <div style={sectionStyle}>
                <p style={sectionTitleStyle}>재생 모드</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[
                        { val: 'class', icon: '📺', label: '수업 모드', desc: '학생들은 선생님 화면을 함께 봅니다' },
                        { val: 'homework', icon: '📱', label: '과제 모드', desc: '학생 각자 화면에서 영상 재생' },
                    ].map(opt => (
                        <label key={opt.val} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                            padding: '0.5rem 0.75rem', borderRadius: '8px',
                            background: videoMode === opt.val ? (opt.val === 'class' ? '#e0e7ff' : '#dcfce7') : 'transparent'
                        }}>
                            <input type="radio" name="videoMode" value={opt.val}
                                checked={videoMode === opt.val}
                                onChange={() => onChange({ videoMode: opt.val })} />
                            <span>
                                <strong>{opt.icon} {opt.label}</strong>
                                <span style={{ color: '#64748b', fontSize: '0.82rem', marginLeft: '0.4rem' }}>{opt.desc}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* ── URL 입력 ── */}
            <div>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    YouTube URL을 입력하세요.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Link size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={inputUrl}
                            onChange={e => setInputUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleApply()}
                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }}
                        />
                    </div>
                    <button onClick={handleApply}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        <Youtube size={18} /> 적용
                    </button>
                </div>
            </div>

            {/* ── 구간 설정 (Trim) ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Clock size={15} color="#6366f1" />
                    <p style={{ ...sectionTitleStyle, margin: 0 }}>구간 설정 (Trim)</p>
                    {(trimStart > 0 || trimEnd !== null) && (
                        <span style={{ fontSize: '0.75rem', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '999px', marginLeft: 'auto' }}>
                            {fmtSec(trimStart)} ~ {trimEnd !== null ? fmtSec(trimEnd) : '끝'}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <TimeInput
                        label="시작 시간 (분 : 초)"
                        value={trimStart}
                        onChange={v => onChange({ trimStart: v })}
                    />
                    <TimeInput
                        label="종료 시간 (분 : 초)"
                        value={trimEnd ?? ''}
                        onChange={v => onChange({ trimEnd: v || null })}
                    />
                    {(trimStart > 0 || trimEnd !== null) && (
                        <button
                            onClick={() => onChange({ trimStart: 0, trimEnd: null })}
                            style={{ padding: '0.4rem 0.8rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b' }}
                        >
                            초기화
                        </button>
                    )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    종료 시간을 비워두면 영상 끝까지 재생됩니다.
                </p>
            </div>

            {/* ── 영상 중 퀴즈 ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <HelpCircle size={15} color="#f59e0b" />
                    <p style={{ ...sectionTitleStyle, margin: 0 }}>영상 중 퀴즈</p>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>지정한 시각에 영상이 멈추고 퀴즈가 표시됩니다</span>
                    <button onClick={addQuizPoint}
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.8rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                        <Plus size={14} /> 퀴즈 추가
                    </button>
                </div>

                {quizPoints.length === 0 ? (
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                        퀴즈가 없습니다. "퀴즈 추가" 버튼을 눌러 추가하세요.
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
                                    onChange={patch => updateQuizPoint(qp.id, patch)}
                                    onRemove={() => removeQuizPoint(qp.id)}
                                />
                            ))}
                    </div>
                )}
            </div>

            {/* ── 미리보기 ── */}
            {previewSrc ? (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '16/9' }}>
                    <iframe
                        src={previewSrc}
                        title="YouTube video preview"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            ) : (
                <div style={{ aspectRatio: '16/9', background: '#0f0f0f', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <Youtube size={48} style={{ color: '#ef4444' }} />
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>YouTube URL을 입력하면 미리보기가 표시됩니다</p>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// 개별 퀴즈 포인트 편집기
// ─────────────────────────────────────────────
const QuizPointEditor = ({ qp, index, expanded, onToggle, onChange, onRemove }) => {
    const { m, s } = toMS(qp.timeSeconds);

    return (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            {/* 헤더 행 */}
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
                <button onClick={e => { e.stopPropagation(); onRemove(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '2px', display: 'flex' }}>
                    <Trash2 size={15} />
                </button>
                {expanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
            </div>

            {/* 펼쳐진 편집 영역 */}
            {expanded && (
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem', background: 'white' }}>
                    {/* 시간 + 유형 */}
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div>
                            <p style={labelStyle}>퀴즈 표시 시각</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input type="number" min="0" max="999" value={m}
                                    onChange={e => onChange({ timeSeconds: fromMS(e.target.value, s) })}
                                    style={timeInputStyle} placeholder="분" />
                                <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                                <input type="number" min="0" max="59" value={s}
                                    onChange={e => onChange({ timeSeconds: fromMS(m, e.target.value) })}
                                    style={timeInputStyle} placeholder="초" />
                            </div>
                        </div>
                        <div>
                            <p style={labelStyle}>퀴즈 유형</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {[
                                    { val: 'multiple-choice', label: '객관식' },
                                    { val: 'short-answer', label: '주관식' }
                                ].map(opt => (
                                    <button
                                        key={opt.val}
                                        onClick={() => onChange({ type: opt.val })}
                                        style={{
                                            padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1.5px solid',
                                            cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                                            borderColor: qp.type === opt.val ? '#6366f1' : '#e2e8f0',
                                            background: qp.type === opt.val ? '#eef2ff' : 'white',
                                            color: qp.type === opt.val ? '#4f46e5' : '#64748b'
                                        }}
                                    >{opt.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 질문 */}
                    <div>
                        <p style={labelStyle}>질문</p>
                        <input
                            type="text" value={qp.question}
                            onChange={e => onChange({ question: e.target.value })}
                            placeholder="학생들에게 보여줄 질문을 입력하세요"
                            style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* 객관식 보기 */}
                    {qp.type === 'multiple-choice' && (
                        <div>
                            <p style={labelStyle}>보기 및 정답 선택</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {(qp.options || ['', '', '', '']).map((opt, oi) => (
                                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="radio" name={`answer-${qp.id}`}
                                            checked={qp.answerIndex === oi}
                                            onChange={() => onChange({ answerIndex: oi })}
                                            title="정답으로 설정"
                                        />
                                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: qp.answerIndex === oi ? '#6366f1' : '#e2e8f0', color: qp.answerIndex === oi ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                                            {oi + 1}
                                        </span>
                                        <input
                                            type="text" value={opt}
                                            onChange={e => {
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

                    {/* 주관식 정답 키워드 */}
                    {qp.type === 'short-answer' && (
                        <div>
                            <p style={labelStyle}>정답 키워드 (채점용)</p>
                            <input
                                type="text" value={qp.answer || ''}
                                onChange={e => onChange({ answer: e.target.value })}
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

const sectionStyle = {
    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem'
};
const sectionTitleStyle = {
    fontWeight: 'bold', fontSize: '0.9rem', color: '#334155', margin: '0 0 0.75rem'
};
const labelStyle = {
    fontSize: '0.78rem', fontWeight: 700, color: '#64748b', margin: '0 0 0.3rem'
};

export default VideoEditor;
