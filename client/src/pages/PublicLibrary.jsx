import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Download,
    BookOpen,
    ArrowLeft,
    SearchX,
    Filter,
    Clock,
    User,
    Eye,
    Loader2,
    Home,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import StudentPreviewModal from '../components/Preview/StudentPreviewModal';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    increment
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import './PublicLibrary.css';
import { Heart } from 'lucide-react';

const SUBJECTS_MAP = {
    korean: '국어', english: '영어', math: '수학', social: '사회',
    science: '과학', arts: '예체능', informatics: '정보', other: '기타'
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

const PublicLibrary = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [publicProblems, setPublicProblems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Preview state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewProblem, setPreviewProblem] = useState(null);

    // Filter states
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [filterSchoolLevel, setFilterSchoolLevel] = useState('all');
    const [expandedLevels, setExpandedLevels] = useState({
        elementary: true,
        middle: false,
        high: false
    });

    useEffect(() => {
        fetchPublicProblems();
    }, []);

    const fetchPublicProblems = async () => {
        try {
            setIsLoading(true);
            const q = query(
                collection(db, 'problems'),
                where('isPublic', '==', true)
            );
            const querySnapshot = await getDocs(q);
            const items = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPublicProblems(items);
        } catch (error) {
            console.error("Error fetching library:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleLevel = (level) => {
        setExpandedLevels(prev => ({
            ...prev,
            [level]: !prev[level]
        }));
    };

    const handleImport = async (problem) => {
        if (!currentUser) {
            alert('가져오기 기능을 사용하려면 먼저 로그인해주세요!');
            navigate('/teacher/login');
            return;
        }

        try {
            const { id, createdAt, teacherId, pinNumber, ...problemData } = problem;
            const newPin = Math.floor(100000 + Math.random() * 900000).toString();

            await addDoc(collection(db, 'problems'), {
                ...problemData,
                teacherId: currentUser.uid,
                pinNumber: newPin,
                isPublic: false,
                createdAt: serverTimestamp(),
                importedFrom: id
            });

            alert('선생님의 보관함으로 복사되었습니다!');
            navigate('/teacher/dashboard');
        } catch (error) {
            alert('가져오기 실패: ' + error.message);
        }
    };

    const handleLike = async (e, problemId, isLiked) => {
        e.stopPropagation();
        if (!currentUser) {
            alert('좋아요를 누르려면 먼저 로그인해주세요!');
            navigate('/teacher/login');
            return;
        }

        try {
            const problemRef = doc(db, 'problems', problemId);
            if (isLiked) {
                await updateDoc(problemRef, {
                    likedBy: arrayRemove(currentUser.uid),
                    likeCount: increment(-1)
                });
            } else {
                await updateDoc(problemRef, {
                    likedBy: arrayUnion(currentUser.uid),
                    likeCount: increment(1)
                });
            }
            // 로컬 상태 업데이트
            setPublicProblems(prev => prev.map(p => {
                if (p.id === problemId) {
                    const newLikedBy = isLiked
                        ? p.likedBy.filter(id => id !== currentUser.uid)
                        : [...(p.likedBy || []), currentUser.uid];
                    return { ...p, likedBy: newLikedBy, likeCount: (p.likeCount || 0) + (isLiked ? -1 : 1) };
                }
                return p;
            }));
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };

    const filteredProblems = publicProblems.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedSubject === 'all' || p.subject === selectedSubject;
        const matchesSchool = filterSchoolLevel === 'all' || p.schoolLevel === filterSchoolLevel;
        return matchesSearch && matchesType && matchesSchool;
    });

    const getTypeText = (type) => {
        switch (type) {
            case 'fill-blanks': return '빈칸 채우기';
            case 'order-matching': return '순서 맞추기';
            case 'free-drop': return '자유 보드';
            case 'free-dnd': return '자유 보드';
            default: return '기타';
        }
    };

    if (isLoading) {
        return (
            <div className="library-loading">
                <Loader2 className="animate-spin" size={48} />
                <p>공유 라이브러리 정보를 불러오는 중...</p>
            </div>
        );
    }

    const currentTitle = filterSchoolLevel === 'all'
        ? '전체 라이브러리'
        : `${SCHOOL_LEVELS.find(l => l.value === filterSchoolLevel)?.label} ${selectedSubject !== 'all' ? SUBJECTS_MAP[selectedSubject] : ''}`;

    return (
        <div className="public-library">
            <div className="library-layout">
                {/* 1. Sidebar */}
                <aside className="library-sidebar">
                    <div className="sidebar-header">
                        <button className="btn-home-link" onClick={() => navigate('/')}>
                            <Home size={20} /> DD Class
                        </button>
                    </div>

                    <nav className="sidebar-nav">
                        <div
                            className={`sidebar-item main-item ${filterSchoolLevel === 'all' ? 'active' : ''}`}
                            onClick={() => {
                                setFilterSchoolLevel('all');
                                setSelectedSubject('all');
                            }}
                        >
                            <span className="item-label">전체보기 🌐</span>
                        </div>

                        {SCHOOL_LEVELS.filter(l => l.value !== 'all').map(level => {
                            const isExpanded = expandedLevels[level.value];
                            return (
                                <div key={level.value} className={`sidebar-level-group ${isExpanded ? 'is-expanded' : ''}`}>
                                    <div className="level-header" onClick={() => toggleLevel(level.value)}>
                                        <span className="level-title">{level.label}</span>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    <div className="subject-list">
                                        {Object.entries(SUBJECTS_MAP).map(([key, label]) => (
                                            <div
                                                key={key}
                                                className={`sidebar-item subject-item ${filterSchoolLevel === level.value && selectedSubject === key ? 'active' : ''}`}
                                                onClick={() => {
                                                    setFilterSchoolLevel(level.value);
                                                    setSelectedSubject(key);
                                                }}
                                            >
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>
                </aside>

                {/* 2. Main Content */}
                <main className="library-main">
                    <header className="main-header">
                        <div className="header-top">
                            <div className="title-area">
                                <h1>{currentTitle}</h1>
                                <p className="selection-desc">
                                    총 {filteredProblems.length}건의 콘텐츠가 있습니다.
                                </p>
                            </div>
                            <div className="header-actions" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                                <button className="btn-back-dash" onClick={() => navigate('/')}>
                                    <Home size={18} /> 홈으로
                                </button>
                                <button className="btn-back-dash" onClick={() => navigate('/teacher/dashboard')}>
                                    <ArrowLeft size={18} /> 내 보관함 가기
                                </button>
                                <div className="main-search">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="결과 내 검색..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="library-grid-container">
                        {filteredProblems.length === 0 ? (
                            <div className="empty-state">
                                <SearchX size={48} className="empty-icon" />
                                <h3>검색 결과가 없습니다.</h3>
                                <p>다른 검색어나 카테고리를 선택해보세요.</p>
                            </div>
                        ) : (
                            <div className="library-grid">
                                {filteredProblems.map(problem => {
                                    const isLiked = currentUser && problem.likedBy?.includes(currentUser.uid);
                                    return (
                                        <div key={problem.id} className="library-card">
                                            <div className={`card-thumb-box ${problem.type}`}>
                                                <div className="thumb-icon-overlay">
                                                    <BookOpen size={32} color="white" />
                                                </div>
                                                <span className="thumb-type-badge">{getTypeText(problem.type)}</span>
                                                <div className="card-hover-actions">
                                                    <button
                                                        className="btn-action-preview"
                                                        onClick={() => {
                                                            setPreviewProblem(problem);
                                                            setIsPreviewOpen(true);
                                                        }}
                                                    >
                                                        <Eye size={18} /> 미리보기
                                                    </button>
                                                    <button
                                                        className="btn-action-import"
                                                        onClick={() => handleImport(problem)}
                                                    >
                                                        <Download size={18} /> 가져오기
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="card-body">
                                                <div className="card-meta">
                                                    <span className="c-badge level">
                                                        {SCHOOL_LEVELS.find(l => l.value === problem.schoolLevel)?.label}
                                                    </span>
                                                    <span className="c-badge subject">
                                                        {SUBJECTS_MAP[problem.subject]}
                                                    </span>
                                                </div>
                                                <h3 className="problem-title">{problem.title}</h3>

                                                <div className="card-stats">
                                                    <span className="p-author"><User size={14} /> {problem.teacherDisplayName || '선생님'}</span>
                                                    <button
                                                        className={`card-like-btn ${isLiked ? 'active' : ''}`}
                                                        onClick={(e) => handleLike(e, problem.id, isLiked)}
                                                    >
                                                        <Heart size={14} fill={isLiked ? "#FF5252" : "none"} color={isLiked ? "#FF5252" : "#ccc"} />
                                                        {problem.likeCount || 0}
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <StudentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                problem={previewProblem}
            />
        </div>
    );
};

export default PublicLibrary;
