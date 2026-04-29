import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Download, Trash2, CheckCircle, XCircle,
    Users, Trophy, Target, Hash, Loader2, Copy, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────
// 정답 평가 (SessionStatsPanel과 동일 로직)
// ─────────────────────────────────────────────
function evaluateAnswer(problem, answer) {
    if (!problem || answer === undefined || answer === null) {
        return { correct: 0, total: 0, percentage: 0, hasObjective: false, answered: false };
    }
    switch (problem.type) {
        case 'fill-blanks': {
            const blanks = problem.blanks || [];
            const total = blanks.length;
            if (total === 0) return { correct: 0, total: 0, percentage: 0, hasObjective: true, answered: false };
            const answered = typeof answer === 'object' && Object.keys(answer).length > 0;
            const correct = blanks.filter(b => answer[b.id] === b.word).length;
            return { correct, total, percentage: Math.round((correct / total) * 100), hasObjective: true, answered };
        }
        case 'order-matching': {
            const steps = problem.steps || [];
            const total = steps.length;
            if (!Array.isArray(answer) || total === 0) return { correct: 0, total: 0, percentage: 0, hasObjective: true, answered: false };
            const answered = answer.length > 0;
            const correct = steps.filter((step, i) => answer[i]?.id === step.id).length;
            return { correct, total, percentage: Math.round((correct / total) * 100), hasObjective: true, answered };
        }
        case 'multiple-choice': {
            const answerIndices = Array.isArray(problem.answerIndices)
                ? problem.answerIndices
                : problem.answerIndex !== undefined ? [problem.answerIndex] : [0];
            const studentIndices = Array.isArray(answer)
                ? answer.map(Number).filter(n => !isNaN(n))
                : [parseInt(answer, 10)].filter(n => !isNaN(n));
            const answered = studentIndices.length > 0;
            const isCorrect = answered &&
                answerIndices.every(i => studentIndices.includes(i)) &&
                studentIndices.every(i => answerIndices.includes(i));
            return { correct: isCorrect ? 1 : 0, total: 1, percentage: isCorrect ? 100 : 0, hasObjective: true, answered };
        }
        case 'short-answer': {
            const correctAnswer = problem.answer;
            if (!correctAnswer) return { correct: 0, total: 0, percentage: 0, hasObjective: false, answered: false };
            const studentAnswer = typeof answer === 'string' ? answer : '';
            const answered = studentAnswer.trim().length > 0;
            const isCorrect = answered && studentAnswer.toLowerCase().includes(String(correctAnswer).toLowerCase());
            return { correct: isCorrect ? 1 : 0, total: 1, percentage: isCorrect ? 100 : 0, hasObjective: true, answered };
        }
        default:
            return { correct: 0, total: 0, percentage: 0, hasObjective: false, answered: false };
    }
}

// ─────────────────────────────────────────────
// 생기부 문구 생성
// ─────────────────────────────────────────────
function generateRecord(name, accuracy, avgAttempts, objectiveCount) {
    if (objectiveCount === 0) return `${name} 학생은 수업 활동에 성실히 참여하였음.`;
    let base;
    if (accuracy >= 85) base = `${name} 학생은 학습 내용에 대한 이해도가 높으며, 핵심 개념을 정확하게 파악하고 적용하는 능력이 우수함.`;
    else if (accuracy >= 60) base = `${name} 학생은 학습의 기본적인 흐름을 이해하고 있으나, 일부 개념에 대한 심화 학습이 필요한 것으로 관찰됨.`;
    else if (accuracy >= 30) base = `${name} 학생은 학습 목표 달성을 위해 핵심 개념에 대한 반복 학습이 요구되며, 교사의 피드백을 통한 오개념 교정이 기대됨.`;
    else base = `${name} 학생은 기초 개념 이해부터 단계적으로 접근할 필요가 있으며, 개별 맞춤형 보충 학습이 효과적일 것으로 판단됨.`;
    let effort = '';
    if (avgAttempts >= 8) effort = ' 반복적인 시도와 수정을 통해 끈기 있게 문제를 해결하려는 학습 태도가 인상적임.';
    else if (avgAttempts <= 2 && accuracy >= 70) effort = ' 문제 상황을 빠르게 파악하고 효율적으로 판단하는 능력을 보임.';
    return base + effort;
}

// ─────────────────────────────────────────────
// SVG 도넛 차트
// ─────────────────────────────────────────────
function DonutChart({ percentage, correct, total }) {
    const r = 80;
    const cx = 100, cy = 100;
    const circumference = 2 * Math.PI * r;
    const correctDash = (percentage / 100) * circumference;
    const incorrectDash = ((100 - percentage) / 100) * circumference;

    return (
        <svg viewBox="0 0 200 200" width="180" height="180">
            {/* 배경 원 */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fee2e2" strokeWidth="28" />
            {/* 정답 (초록) */}
            <circle
                cx={cx} cy={cy} r={r} fill="none"
                stroke="#22c55e" strokeWidth="28"
                strokeDasharray={`${correctDash} ${circumference}`}
                strokeDashoffset={circumference * 0.25}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            {/* 중앙 텍스트 */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1e293b">
                {percentage}%
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" fontSize="13" fill="#94a3b8">
                정답률
            </text>
        </svg>
    );
}

function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

const MEDAL = ['🥇', '🥈', '🥉'];

// ─────────────────────────────────────────────
// SessionDetail
// ─────────────────────────────────────────────
const SessionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        if (!currentUser) { navigate('/teacher/login'); return; }
        fetchSession();
    }, [id, currentUser]);

    const fetchSession = async () => {
        try {
            setLoading(true);
            const snap = await getDoc(doc(db, 'sessions', id));
            if (snap.exists()) {
                setSession({ id: snap.id, ...snap.data() });
            } else {
                alert('세션을 찾을 수 없습니다.');
                navigate('/teacher/history');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 학생별 통계 계산
    const studentStats = useMemo(() => {
        if (!session) return [];
        const { students = [], problems = [], type } = session;

        return students.map(student => {
            const slideResults = problems.map((prob, idx) => {
                const answer = type === 'lesson'
                    ? (student.answers?.[idx] ?? null)
                    : (student.answer ?? null);
                const submitCount = type === 'lesson'
                    ? (student.slideSubmitCounts?.[idx] ?? 0)
                    : (student.submitCount ?? 0);
                return { ...evaluateAnswer(prob, answer), submitCount };
            });

            const objectiveResults = slideResults.filter(r => r.hasObjective);
            const totalCorrect = objectiveResults.reduce((a, r) => a + r.correct, 0);
            const totalPossible = objectiveResults.reduce((a, r) => a + r.total, 0);
            const accuracy = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : null;
            const totalIncorrect = totalPossible - totalCorrect;

            const submitCounts = slideResults.map(r => r.submitCount).filter(c => c > 0);
            const avgAttempts = submitCounts.length > 0
                ? Math.round(submitCounts.reduce((a, b) => a + b, 0) / submitCounts.length)
                : 0;

            const objectiveCount = problems.filter(p =>
                ['fill-blanks', 'order-matching', 'multiple-choice', 'short-answer'].includes(p?.type)
            ).length;

            return {
                ...student, slideResults, accuracy, totalCorrect,
                totalIncorrect, totalPossible, avgAttempts,
                record: generateRecord(student.name, accuracy ?? 0, avgAttempts, objectiveCount)
            };
        }).sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
    }, [session]);

    // 전체 집계
    const totals = useMemo(() => {
        const totalCorrect = studentStats.reduce((a, s) => a + s.totalCorrect, 0);
        const totalPossible = studentStats.reduce((a, s) => a + s.totalPossible, 0);
        const totalIncorrect = totalPossible - totalCorrect;
        const overallPct = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0;
        return { totalCorrect, totalIncorrect, totalPossible, overallPct };
    }, [studentStats]);

    // 엑셀 다운로드
    const handleExcelDownload = () => {
        if (!session) return;
        const { problems = [], type } = session;
        const isLesson = type === 'lesson';

        // 헤더 행
        const headers = ['순위', '학생', '정답률(%)', '정답 수', '오답 수', '평균 시도 횟수'];
        if (isLesson) {
            problems.forEach((p, i) => headers.push(`슬라이드${i + 1}: ${p?.title || '?'}`));
        }
        headers.push('생기부 문구');

        const rows = studentStats.map((s, idx) => {
            const base = [
                idx + 1,
                s.name,
                s.accuracy !== null ? s.accuracy : '—',
                s.totalCorrect,
                s.totalIncorrect,
                s.avgAttempts
            ];
            if (isLesson) {
                s.slideResults.forEach(r => {
                    base.push(r.hasObjective ? (r.answered ? `${r.correct}/${r.total}` : '미답') : '—');
                });
            }
            base.push(s.record);
            return base;
        });

        // 요약 행
        rows.push([]);
        rows.push(['[집계]', '', `전체 평균 ${totals.overallPct}%`, `정답 ${totals.totalCorrect}`, `오답 ${totals.totalIncorrect}`, `총 ${totals.totalPossible}문항`]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = headers.map((h, i) => ({
            wch: i === headers.length - 1 ? 60 : Math.max(h.length * 2, 12)
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '수업기록');

        const fileName = `${session.title || '수업기록'}_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/ /g, '')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleDelete = async () => {
        if (!window.confirm('이 수업 기록을 삭제하시겠습니까?')) return;
        await deleteDoc(doc(db, 'sessions', id));
        navigate('/teacher/history');
    };

    const handleCopyRecord = (idx, text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(idx);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!session) return null;

    const isLesson = session.type === 'lesson';

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* 헤더 */}
            <header style={{
                background: 'white', borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2rem', display: 'flex', alignItems: 'center',
                gap: '1rem', position: 'sticky', top: 0, zIndex: 10
            }}>
                <button
                    onClick={() => navigate('/teacher/history')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'none', border: 'none', color: '#64748b',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                    }}
                >
                    <ArrowLeft size={18} /> 기록 목록
                </button>
                <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', flex: 1 }}>
                    {session.title}
                </h1>
                <button
                    onClick={handleExcelDownload}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.55rem 1.1rem', background: '#16a34a', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.85rem'
                    }}
                >
                    <Download size={16} /> 엑셀 다운로드
                </button>
                <button
                    onClick={handleDelete}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.55rem 1rem', background: 'white', color: '#ef4444',
                        border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.85rem'
                    }}
                >
                    <Trash2 size={16} /> 삭제
                </button>
            </header>

            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>

                {/* 요약 섹션 */}
                <div style={{
                    background: 'white', borderRadius: '16px', padding: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '1.5rem',
                    display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap'
                }}>
                    {/* 도넛 차트 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <DonutChart
                            percentage={totals.overallPct}
                            correct={totals.totalCorrect}
                            total={totals.totalPossible}
                        />
                    </div>

                    {/* 통계 카드 */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', minWidth: '260px' }}>
                        {[
                            { icon: <CheckCircle size={22} color="#22c55e" />, label: '총 정답', value: totals.totalCorrect, bg: '#f0fdf4', color: '#16a34a' },
                            { icon: <XCircle size={22} color="#ef4444" />, label: '총 오답', value: totals.totalIncorrect, bg: '#fef2f2', color: '#dc2626' },
                            { icon: <Users size={22} color="#6366f1" />, label: '참여 학생', value: `${session.studentCount || 0}명`, bg: '#eef2ff', color: '#4f46e5' },
                            { icon: <Hash size={22} color="#f59e0b" />, label: '총 답변 수', value: totals.totalPossible, bg: '#fffbeb', color: '#d97706' },
                        ].map((card, i) => (
                            <div key={i} style={{
                                background: card.bg, borderRadius: '12px',
                                padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
                            }}>
                                {card.icon}
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>{card.label}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: card.color }}>{card.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 날짜 + 슬라이드 수 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                        <div><span style={{ fontWeight: 600 }}>날짜</span><br />{formatDate(session.createdAt)}</div>
                        {isLesson && session.slideCount && (
                            <div><span style={{ fontWeight: 600 }}>슬라이드</span><br />{session.slideCount}개</div>
                        )}
                    </div>
                </div>

                {/* 리더보드 */}
                <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{
                        padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', gap: '0.6rem'
                    }}>
                        <Trophy size={20} color="#f59e0b" />
                        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>리더보드</h2>
                    </div>

                    {/* 테이블 헤더 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isLesson ? '60px 160px 1fr 80px 80px 280px' : '60px 160px 1fr 80px 80px 280px',
                        padding: '0.6rem 1.5rem',
                        background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                        fontSize: '0.75rem', fontWeight: 700, color: '#64748b',
                        textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}>
                        <span>순위</span>
                        <span>학생</span>
                        <span>정답률</span>
                        <span style={{ textAlign: 'center' }}>정답</span>
                        <span style={{ textAlign: 'center' }}>시도</span>
                        <span>생기부 문구</span>
                    </div>

                    {studentStats.map((student, idx) => {
                        const pct = student.accuracy ?? 0;
                        const barColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
                        const incorrectPct = 100 - pct;

                        return (
                            <div
                                key={student.name}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '60px 160px 1fr 80px 80px 280px',
                                    padding: '0.9rem 1.5rem',
                                    borderBottom: '1px solid #f8fafc',
                                    alignItems: 'center'
                                }}
                            >
                                {/* 순위 */}
                                <div style={{ fontSize: '1.1rem', textAlign: 'center' }}>
                                    {idx < 3 ? MEDAL[idx] : <span style={{ color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</span>}
                                </div>

                                {/* 이름 */}
                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                                    {student.name}
                                </div>

                                {/* 정답률 바 */}
                                <div>
                                    {student.accuracy !== null ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <span style={{
                                                fontSize: '0.88rem', fontWeight: 700, color: barColor,
                                                minWidth: '38px'
                                            }}>
                                                {pct}%
                                            </span>
                                            <div style={{ flex: 1, height: '20px', display: 'flex', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
                                                <div style={{ width: `${pct}%`, background: barColor, transition: 'width 0.4s' }} />
                                                <div style={{ width: `${incorrectPct}%`, background: '#fee2e2' }} />
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                ✓{student.totalCorrect} ✗{student.totalIncorrect}
                                            </span>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>평가 없음</span>
                                    )}
                                </div>

                                {/* 정답 수 */}
                                <div style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>
                                    {student.totalCorrect}/{student.totalPossible || '—'}
                                </div>

                                {/* 시도 횟수 */}
                                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                    {student.avgAttempts > 0 ? `${student.avgAttempts}회` : '—'}
                                </div>

                                {/* 생기부 문구 */}
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                                    <p style={{
                                        margin: 0, fontSize: '0.75rem', color: '#475569',
                                        lineHeight: 1.5, flex: 1,
                                        display: '-webkit-box', WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                    }}>
                                        {student.record}
                                    </p>
                                    <button
                                        onClick={() => handleCopyRecord(idx, student.record)}
                                        style={{
                                            background: copied === idx ? '#16a34a' : '#f1f5f9',
                                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                                            color: copied === idx ? 'white' : '#64748b',
                                            padding: '4px 6px', display: 'flex',
                                            flexShrink: 0, transition: 'all 0.2s'
                                        }}
                                        title="생기부 문구 복사"
                                    >
                                        {copied === idx ? <Check size={13} /> : <Copy size={13} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {studentStats.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                            학생 데이터가 없습니다.
                        </div>
                    )}
                </div>

                {/* 슬라이드별 상세 (수업꾸러미만) */}
                {isLesson && session.problems?.length > 0 && (
                    <div style={{
                        background: 'white', borderRadius: '16px', overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: '1.5rem'
                    }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                                슬라이드별 통계
                            </h2>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {session.problems.map((prob, idx) => {
                                const slideResults = studentStats.map(s => s.slideResults[idx]).filter(Boolean);
                                const objective = slideResults.filter(r => r.hasObjective);
                                if (objective.length === 0) return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px' }}>
                                        <span style={{ fontWeight: 700, color: '#94a3b8', minWidth: '24px' }}>{idx + 1}</span>
                                        <span style={{ color: '#64748b', flex: 1 }}>{prob?.title || '슬라이드'}</span>
                                        <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>평가 없음</span>
                                    </div>
                                );
                                const avgPct = Math.round(objective.reduce((a, r) => a + r.percentage, 0) / objective.length);
                                const barColor = avgPct >= 80 ? '#22c55e' : avgPct >= 50 ? '#f59e0b' : '#ef4444';
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px' }}>
                                        <span style={{ fontWeight: 700, color: '#94a3b8', minWidth: '24px' }}>{idx + 1}</span>
                                        <span style={{ color: '#1e293b', fontWeight: 600, flex: 1, fontSize: '0.9rem' }}>{prob?.title || '슬라이드'}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '200px' }}>
                                            <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ width: `${avgPct}%`, height: '100%', background: barColor, transition: 'width 0.4s' }} />
                                            </div>
                                            <span style={{ fontWeight: 700, color: barColor, fontSize: '0.9rem', minWidth: '38px', textAlign: 'right' }}>{avgPct}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SessionDetail;
