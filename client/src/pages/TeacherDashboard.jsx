import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Layout,
    Layers,
    MousePointer2,
    Clock,
    Globe,
    Lock,
    Copy,
    Trash2,
    ArrowRight,
    Loader2,
    Home
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import './TeacherDashboard.css';

const SUBJECTS_MAP = {
    korean: '국어', english: '영어', math: '수학', social: '사회',
    science: '과학', arts: '예체능', other: '기타'
};

const SCHOOL_LEVELS = [
    { value: 'all', label: '모든 학교급' },
    { value: 'elementary', label: '초등' },
    { value: 'middle', label: '중등' },
    { value: 'high', label: '고등' },
];

const GRADES_MAP = {
    elementary: [1, 2, 3, 4, 5, 6],
    middle: [1, 2, 3],
    high: [1, 2, 3],
};

const TeacherDashboard = () => {
    const { currentUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterSchoolLevel, setFilterSchoolLevel] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');
    const [showCreateOptions, setShowCreateOptions] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        if (!currentUser) {
            navigate('/teacher/login');
            return;
        }
        fetchMyProblems();
    }, [currentUser, authLoading]);

    const fetchMyProblems = async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            setError(null);
            console.log('Fetching problems for UID:', currentUser.uid);

            const q = query(
                collection(db, 'problems'),
                where('teacherId', '==', currentUser.uid)
            );
            const querySnapshot = await getDocs(q);
            console.log('Fetched documents count:', querySnapshot.size);

            const items = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 로컬 정렬 (최신순)
            items.sort((a, b) => {
                const getTime = (val) => {
                    if (!val) return 0;
                    if (val.toMillis) return val.toMillis();
                    if (val.seconds) return val.seconds * 1000;
                    return new Date(val).getTime() || 0;
                };
                return getTime(b.createdAt) - getTime(a.createdAt);
            });

            console.log('Processed items:', items);
            if (items.length === 0) {
                console.warn('[DASHBOARD] No problems found for teacher:', currentUser.uid);
            }
            setProblems(items);
        } catch (error) {
            console.error("Error fetching problems:", error);
            setError("문제를 불러오는 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말로 이 문제를 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'problems', id));
            setProblems(problems.filter(p => p.id !== id));
        } catch (error) {
            alert('삭제 실패: ' + error.message);
        }
    };

    const copyPin = (pin) => {
        navigator.clipboard.writeText(pin);
        alert('PIN 번호가 복사되었습니다: ' + pin);
    };

    const filteredProblems = problems.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || p.type === filterType;
        const matchesSchool = filterSchoolLevel === 'all' || p.schoolLevel === filterSchoolLevel;
        const matchesGrade = filterGrade === 'all' || String(p.grade) === String(filterGrade);
        return matchesSearch && matchesType && matchesSchool && matchesGrade;
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case 'fill-blanks': return <Layers size={18} />;
            case 'order-matching': return <Layout size={18} />;
            case 'free-drop': return <MousePointer2 size={18} />;
            default: return <Clock size={18} />;
        }
    };

    const getTypeText = (type) => {
        switch (type) {
            case 'fill-blanks': return '빈칸 채우기';
            case 'order-matching': return '순서 맞추기';
            case 'free-drop': return '자유 보드';
            default: return '기타';
        }
    };

    if (authLoading || loading) {
        return (
            <div className="dashboard-loading">
                <Loader2 className="animate-spin" size={48} />
                <p>{authLoading ? '로그인 확인 중...' : '내 문제들을 불러오는 중...'}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-loading error">
                <div className="error-icon">⚠️</div>
                <p>{error}</p>
                <button className="btn-secondary" onClick={fetchMyProblems}>다시 시도</button>
            </div>
        );
    }

    return (
        <div className="teacher-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="header-title-row">
                        <button className="btn-home" onClick={() => navigate('/')} title="홈으로 가기">
                            <Home size={20} />
                        </button>
                        <h1>내 문제 보관함 📦</h1>
                    </div>
                    <p>선생님이 제작하신 소중한 교육 자료들입니다.</p>
                </div>
                <div className="header-right">
                    <div className="create-dropdown-container">
                        <button
                            className={`btn-create-new ${showCreateOptions ? 'active' : ''}`}
                            onClick={() => setShowCreateOptions(!showCreateOptions)}
                        >
                            <Plus size={20} className={showCreateOptions ? 'rotate-45' : ''} /> 새 문제 만들기
                        </button>

                        {showCreateOptions && (
                            <div className="create-options-menu">
                                <button onClick={() => navigate('/fill-blanks')}>
                                    <Layers size={18} /> 빈칸 채우기
                                </button>
                                <button onClick={() => navigate('/order-matching')}>
                                    <Layout size={18} /> 순서 맞추기
                                </button>
                                <button onClick={() => navigate('/free-dnd')}>
                                    <MousePointer2 size={18} /> 자유 보드
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="btn-secondary" onClick={() => navigate('/teacher/library')}>
                        <Globe size={18} /> 라이브러리 가기
                    </button>
                </div>
            </header>

            <div className="dashboard-controls">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="문제 제목으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <select
                        className="dashboard-select"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">모든 유형</option>
                        <option value="fill-blanks">빈칸 채우기</option>
                        <option value="order-matching">순서 맞추기</option>
                        <option value="free-drop">자유 보드</option>
                    </select>

                    <select
                        className="dashboard-select"
                        value={filterSchoolLevel}
                        onChange={(e) => {
                            setFilterSchoolLevel(e.target.value);
                            setFilterGrade('all');
                        }}
                    >
                        {SCHOOL_LEVELS.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>

                    <select
                        className="dashboard-select"
                        value={filterGrade}
                        onChange={(e) => setFilterGrade(e.target.value)}
                        disabled={filterSchoolLevel === 'all'}
                    >
                        <option value="all">모든 학년</option>
                        {filterSchoolLevel !== 'all' && GRADES_MAP[filterSchoolLevel]?.map(g => (
                            <option key={g} value={g}>{g}학년</option>
                        ))}
                    </select>
                </div>
            </div>

            <main className="dashboard-grid">
                {filteredProblems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📂</div>
                        <h3>표시할 문제가 없습니다.</h3>
                        <p>새로운 문제를 만들거나 검색어/필터를 조정해보세요.</p>
                    </div>
                ) : (
                    filteredProblems.map(problem => (
                        <div key={problem.id} className="problem-card-refined">
                            <div className="card-top">
                                <span className={`type-badge ${problem.type}`}>
                                    {getTypeIcon(problem.type)} {getTypeText(problem.type)}
                                </span>
                                <span className={`visibility-badge ${problem.isPublic ? 'public' : 'private'}`}>
                                    {problem.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                                    {problem.isPublic ? '공개' : '비공개'}
                                </span>
                            </div>

                            <div className="card-body">
                                <h3 className="problem-title">{problem.title}</h3>
                                <div className="card-metadata-row">
                                    {problem.subject && <span className="meta-badge subject">{SUBJECTS_MAP[problem.subject] || problem.subject}</span>}
                                    {problem.schoolLevel && <span className="meta-badge level">
                                        {SCHOOL_LEVELS.find(l => l.value === problem.schoolLevel)?.label || problem.schoolLevel}
                                    </span>}
                                    {problem.grade && <span className="meta-badge grade">{problem.grade}학년</span>}
                                </div>
                                <div className="problem-meta">
                                    <span className="pin-tag" onClick={() => copyPin(problem.pinNumber)}>
                                        <Copy size={14} /> PIN: {problem.pinNumber}
                                    </span>
                                    <span className="date-tag">
                                        <Clock size={14} /> {problem.createdAt?.toDate().toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="card-footer">
                                <button
                                    className="btn-action start"
                                    onClick={() => navigate(`/monitor/${problem.id}`)}
                                >
                                    실시간 모니터링 <ArrowRight size={16} />
                                </button>
                                <button
                                    className="btn-icon-danger"
                                    onClick={() => handleDelete(problem.id)}
                                    title="삭제"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div >
    );
};

export default TeacherDashboard;
