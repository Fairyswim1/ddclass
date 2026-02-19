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
    Edit2,
    Home,
    Eye,
    Loader2,
    User,
    Check,
    X as CloseIcon,
    RefreshCw
} from 'lucide-react';
import StudentPreviewModal from '../components/Preview/StudentPreviewModal';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
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
    const { currentUser, nickname, setNickname, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Nickname editing state
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [newNickname, setNewNickname] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Preview state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewProblem, setPreviewProblem] = useState(null);

    // Filter states
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
        setNewNickname(nickname);
    }, [currentUser, authLoading, nickname]);

    const fetchMyProblems = async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            setError(null);

            const q = query(
                collection(db, 'problems'),
                where('teacherId', '==', currentUser.uid)
            );
            const querySnapshot = await getDocs(q);

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

            setProblems(items);
        } catch (error) {
            console.error("Error fetching problems:", error);
            setError("문제를 불러오는 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNicknameUpdate = async () => {
        if (!newNickname.trim()) return;
        try {
            await setDoc(doc(db, 'profiles', currentUser.uid), {
                nickname: newNickname.trim(),
                updatedAt: serverTimestamp()
            }, { merge: true });

            setNickname(newNickname.trim());
            setIsEditingNickname(false);
            alert('닉네임이 성공적으로 변경되었습니다!');
        } catch (error) {
            alert('닉네임 변경 실패: ' + error.message);
        }
    };

    const syncNicknameToProblems = async () => {
        if (!window.confirm('모든 기존 문제의 제작자명을 현재 닉네임으로 업데이트하시겠습니까? (이 작업은 몇 초 정도 걸릴 수 있습니다)')) return;
        try {
            setIsSyncing(true);
            const batch = writeBatch(db);
            const q = query(collection(db, 'problems'), where('teacherId', '==', currentUser.uid));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((document) => {
                batch.update(doc(db, 'problems', document.id), {
                    teacherDisplayName: nickname
                });
            });

            await batch.commit();
            alert(`${querySnapshot.size}개의 문제에 새로운 닉네임이 적용되었습니다.`);
            fetchMyProblems();
        } catch (error) {
            alert('일괄 업데이트 실패: ' + error.message);
        } finally {
            setIsSyncing(false);
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

    const handlePreview = (problem) => {
        setPreviewProblem(problem);
        setIsPreviewOpen(true);
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

            {/* Nickname Editor Section */}
            <section className="profile-section" style={{
                background: '#fff',
                margin: '0 2rem 1.5rem',
                padding: '1.2rem 1.5rem',
                borderRadius: '20px',
                border: '2px solid #F0EEE9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        background: 'var(--color-brand-orange-light, #FFF3E0)',
                        color: 'var(--color-brand-orange, #FF6D00)',
                        padding: '10px',
                        borderRadius: '12px'
                    }}>
                        <User size={24} />
                    </div>
                    <div>
                        {isEditingNickname ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={newNickname}
                                    onChange={(e) => setNewNickname(e.target.value)}
                                    placeholder="닉네임 입력"
                                    style={{
                                        padding: '0.6rem 1rem',
                                        borderRadius: '10px',
                                        border: '2px solid var(--color-brand-orange)',
                                        fontSize: '1rem',
                                        fontWeight: '700',
                                        width: '180px'
                                    }}
                                    autoFocus
                                />
                                <button className="btn-icon-success" onClick={handleNicknameUpdate} title="저장">
                                    <Check size={20} />
                                </button>
                                <button className="btn-icon-danger" onClick={() => {
                                    setIsEditingNickname(false);
                                    setNewNickname(nickname);
                                }} title="취소">
                                    <CloseIcon size={20} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                                    {nickname} <span style={{ fontWeight: '500', color: '#666', fontSize: '0.9rem' }}>선생님 반가워요!</span>
                                </h2>
                                <button className="btn-icon-subtle" onClick={() => setIsEditingNickname(true)} title="닉네임 수정">
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        )}
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#888' }}>
                            라이브러리에 공유되는 문제의 제작자 닉네임입니다.
                        </p>
                    </div>
                </div>

                <button
                    className="btn-sync-nickname"
                    onClick={syncNicknameToProblems}
                    disabled={isSyncing}
                    style={{
                        padding: '0.6rem 1rem',
                        background: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#4B5563',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: isSyncing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    기존 모든 문제에 닉네임 일체화
                </button>
            </section>

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

            <main className="problems-grid">
                {filteredProblems.length === 0 ? (
                    <div className="empty-state">
                        <Search size={48} className="empty-icon" />
                        <h3>등록된 문제가 없습니다.</h3>
                        <p>'새 문제 만들기' 버튼을 눌러 첫 문제를 제작해보세요!</p>
                    </div>
                ) : (
                    filteredProblems.map(problem => (
                        <div key={problem.id} className="problem-card">
                            <div className="card-top">
                                <span className={`type-badge ${problem.type}`}>
                                    {getTypeIcon(problem.type)} {getTypeText(problem.type)}
                                </span>
                                <div className="card-actions">
                                    <button
                                        className="btn-icon-secondary"
                                        onClick={() => handlePreview(problem)}
                                        title="학생 화면 미리보기"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        className="btn-icon-edit"
                                        onClick={() => navigate(`/${problem.type}?id=${problem.id}`)}
                                        title="문제 수정"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        className="btn-icon-delete"
                                        onClick={() => handleDelete(problem.id)}
                                        title="문제 삭제"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="card-body">
                                <h3 className="problem-title">{problem.title}</h3>
                                <div className="card-metadata">
                                    {problem.subject && <span className="meta-item subject">{SUBJECTS_MAP[problem.subject] || problem.subject}</span>}
                                    {problem.schoolLevel && <span className="meta-item level">
                                        {SCHOOL_LEVELS.find(l => l.value === problem.schoolLevel)?.label || problem.schoolLevel}
                                    </span>}
                                    {problem.grade && <span className="meta-item grade">{problem.grade}학년</span>}
                                </div>
                                <div className="card-stats">
                                    <div className="stat-item">
                                        <Clock size={14} />
                                        <span>생성: {problem.createdAt?.seconds ? new Date(problem.createdAt.seconds * 1000).toLocaleDateString() : '최근'}</span>
                                    </div>
                                    <div className="stat-item public-status">
                                        {problem.isPublic ? (
                                            <><Globe size={14} className="icon-public" /> <span>전체 공개 중</span></>
                                        ) : (
                                            <><Lock size={14} className="icon-private" /> <span>나만 보기</span></>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card-footer">
                                <div className="pin-display" onClick={() => copyPin(problem.pinNumber)} title="클릭하여 PIN 복사">
                                    <span className="pin-label">PIN:</span>
                                    <span className="pin-value">{problem.pinNumber}</span>
                                    <Copy size={16} className="pin-copy-icon" />
                                </div>
                                <button
                                    className="btn-action start"
                                    onClick={() => navigate(`/teacher/monitor/${problem.pinNumber}`)}
                                >
                                    실시간 모니터링
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <StudentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                problem={previewProblem}
            />
        </div>
    );
};

export default TeacherDashboard;
