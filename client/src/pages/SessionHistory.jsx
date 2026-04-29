import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Trash2, Users, Calendar, Layers, Layout,
    MousePointer2, Globe, BarChart2, Search, Loader2, BookOpen
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const TYPE_ICON = {
    'fill-blanks': <Layers size={20} />,
    'order-matching': <Layout size={20} />,
    'free-drop': <MousePointer2 size={20} />,
    'lesson': <Globe size={20} />,
    'multiple-choice': <BookOpen size={20} />,
};

const TYPE_LABEL = {
    'fill-blanks': '빈칸 채우기',
    'order-matching': '순서 맞추기',
    'free-drop': '자유 보드',
    'lesson': '수업 꾸러미',
    'multiple-choice': '객관식',
};

const TYPE_COLOR = {
    'fill-blanks': '#6366f1',
    'order-matching': '#f59e0b',
    'free-drop': '#10b981',
    'lesson': '#3b82f6',
    'multiple-choice': '#8b5cf6',
};

function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

const SessionHistory = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (!currentUser) { navigate('/teacher/login'); return; }
        fetchSessions();
    }, [currentUser]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'sessions'),
                where('teacherId', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error('세션 불러오기 오류:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (sessionId) => {
        if (!window.confirm('이 수업 기록을 삭제하시겠습니까?')) return;
        try {
            setDeletingId(sessionId);
            await deleteDoc(doc(db, 'sessions', sessionId));
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (e) {
            alert('삭제 실패: ' + e.message);
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = sessions.filter(s =>
        (s.title || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* 헤더 */}
            <header style={{
                background: 'white', borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2rem', display: 'flex', alignItems: 'center',
                gap: '1rem', position: 'sticky', top: 0, zIndex: 10
            }}>
                <button
                    onClick={() => navigate('/teacher/dashboard')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'none', border: 'none', color: '#64748b',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                    }}
                >
                    <ArrowLeft size={18} /> 보관함으로
                </button>
                <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        background: '#6366f1', borderRadius: '10px',
                        padding: '0.4rem', display: 'flex'
                    }}>
                        <BarChart2 size={20} color="white" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
                        수업 기록
                    </h1>
                </div>
                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                    <Search size={16} style={{
                        position: 'absolute', left: '0.75rem', top: '50%',
                        transform: 'translateY(-50%)', color: '#94a3b8'
                    }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="수업 제목 검색..."
                        style={{
                            paddingLeft: '2.2rem', paddingRight: '1rem',
                            paddingTop: '0.5rem', paddingBottom: '0.5rem',
                            border: '1px solid #e2e8f0', borderRadius: '8px',
                            fontSize: '0.9rem', outline: 'none', width: '220px',
                            background: '#f8fafc'
                        }}
                    />
                </div>
            </header>

            <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                        <p>기록을 불러오는 중...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '4rem',
                        background: 'white', borderRadius: '16px',
                        border: '2px dashed #e2e8f0'
                    }}>
                        <BarChart2 size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ color: '#64748b', margin: '0 0 0.5rem' }}>
                            {search ? '검색 결과가 없습니다.' : '아직 저장된 수업 기록이 없습니다.'}
                        </h3>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
                            수업 모니터 화면에서 "수업 저장" 버튼을 눌러 기록을 남겨보세요.
                        </p>
                    </div>
                ) : (
                    <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        {/* 테이블 헤더 */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr 180px 60px',
                            padding: '0.75rem 1.5rem',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: '0.8rem', fontWeight: 700,
                            color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                            <span>수업 제목</span>
                            <span style={{ textAlign: 'center' }}>참여 학생</span>
                            <span style={{ textAlign: 'center' }}>평균 정답률</span>
                            <span style={{ textAlign: 'center' }}>날짜</span>
                            <span />
                        </div>

                        {/* 행 목록 */}
                        {filtered.map((session, idx) => {
                            const color = TYPE_COLOR[session.type] || '#6366f1';
                            const accuracy = session.overallAccuracy;
                            return (
                                <div
                                    key={session.id}
                                    onClick={() => navigate(`/teacher/history/${session.id}`)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1fr 1fr 180px 60px',
                                        padding: '1rem 1.5rem',
                                        borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        cursor: 'pointer',
                                        alignItems: 'center',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* 제목 + 타입 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            background: color + '20', color,
                                            borderRadius: '10px', padding: '0.5rem',
                                            display: 'flex', flexShrink: 0
                                        }}>
                                            {TYPE_ICON[session.type] || <BarChart2 size={20} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                                                {session.title}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                                {TYPE_LABEL[session.type] || session.type}
                                                {session.slideCount ? ` · ${session.slideCount}슬라이드` : ''}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 참여 학생 */}
                                    <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#475569', fontWeight: 600 }}>
                                        <Users size={15} color="#94a3b8" />
                                        {session.studentCount || 0}명
                                    </div>

                                    {/* 평균 정답률 */}
                                    <div style={{ textAlign: 'center' }}>
                                        {accuracy !== null && accuracy !== undefined ? (
                                            <span style={{
                                                background: accuracy >= 80 ? '#f0fdf4' : accuracy >= 50 ? '#fffbeb' : '#fef2f2',
                                                color: accuracy >= 80 ? '#16a34a' : accuracy >= 50 ? '#d97706' : '#dc2626',
                                                padding: '3px 12px', borderRadius: '999px',
                                                fontWeight: 700, fontSize: '0.9rem'
                                            }}>
                                                {accuracy}%
                                            </span>
                                        ) : (
                                            <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>—</span>
                                        )}
                                    </div>

                                    {/* 날짜 */}
                                    <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                                        <Calendar size={13} />
                                        {formatDate(session.createdAt)}
                                    </div>

                                    {/* 삭제 */}
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(session.id); }}
                                            disabled={deletingId === session.id}
                                            style={{
                                                background: 'none', border: 'none',
                                                color: '#cbd5e1', cursor: 'pointer',
                                                padding: '0.3rem', borderRadius: '6px',
                                                display: 'flex', transition: 'color 0.15s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                                            title="삭제"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.8rem', marginTop: '2rem' }}>
                    총 {filtered.length}개의 기록
                </p>
            </main>
        </div>
    );
};

export default SessionHistory;
