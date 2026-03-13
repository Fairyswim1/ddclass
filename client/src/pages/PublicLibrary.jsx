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
    Home
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
    const [filterGrade, setFilterGrade] = useState('all');

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
        const matchesType = selectedSubject === 'all' || p.type === selectedSubject;
        const matchesSchool = filterSchoolLevel === 'all' || p.schoolLevel === filterSchoolLevel;
        const matchesGrade = filterGrade === 'all' || String(p.grade) === String(filterGrade);
        return matchesSearch && matchesType && matchesSchool && matchesGrade;
    });

    const getTypeText = (type) => {
        switch (type) {
            case 'fill-blanks': return '빈칸 채우기';
            case 'order-matching': return '순서 맞추기';
            case 'free-drop': return '자유 보드';
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

    return (
        <div className="public-library">
            <header className="library-header">
                <div className="header-left">
                    <div className="header-nav-btns">
                        <button className="btn-back" onClick={() => navigate('/')} title="홈으로">
                            <Home size={24} />
                        </button>
                        <button className="btn-back" onClick={() => navigate('/teacher/dashboard')} title="대시보드로">
                            <ArrowLeft size={24} />
                        </button>
                    </div>
                    <h1>공유 라이브러리 🌍</h1>
                    <p>전국의 선생님들이 공유해주신 소중한 문제들입니다.</p>
                </div>
            </header>

            <div className="library-controls">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="전체 라이브러리에서 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <select
                        className="library-select"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                        <option value="all">모든 유형</option>
                        <option value="fill-blanks">빈칸 채우기</option>
                        <option value="order-matching">순서 맞추기</option>
                        <option value="free-drop">자유 보드</option>
                    </select>

                    <select
                        className="library-select"
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
                        className="library-select"
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

            <main className="library-grid">
                {filteredProblems.length === 0 ? (
                    <div className="empty-state">
                        <SearchX size={48} className="empty-icon" />
                        <h3>검색 결과가 없습니다.</h3>
                        <p>다른 검색어나 필터를 선택해보세요.</p>
                    </div>
                ) : (
                    filteredProblems.map(problem => {
                        const isLiked = currentUser && problem.likedBy?.includes(currentUser.uid);
                        return (
                            <div key={problem.id} className="library-card">
                                <div className="card-top">
                                    <span className={`type-badge ${problem.type}`}>
                                        {getTypeText(problem.type)}
                                    </span>
                                    <button
                                        className={`btn-like ${isLiked ? 'active' : ''}`}
                                        onClick={(e) => handleLike(e, problem.id, isLiked)}
                                    >
                                        <Heart size={18} fill={isLiked ? "#FF5252" : "none"} color={isLiked ? "#FF5252" : "#999"} />
                                        <span>{problem.likeCount || 0}</span>
                                    </button>
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
                                    <p className="problem-author">제작: {problem.teacherDisplayName || '선생님'}</p>
                                </div>

                                <div className="card-footer" style={{ gap: '0.5rem' }}>
                                    <button
                                        className="btn-import"
                                        onClick={() => handleImport(problem)}
                                        style={{ flex: 1 }}
                                    >
                                        <Download size={18} /> 가져오기
                                    </button>
                                    <button
                                        className="btn-icon-secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewProblem(problem);
                                            setIsPreviewOpen(true);
                                        }}
                                        title="미리보기"
                                        style={{ padding: '0.8rem' }}
                                    >
                                        <Eye size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
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

export default PublicLibrary;
