import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Layout,
    Layers,
    MousePointer2,
    Download,
    ArrowLeft,
    Loader2,
    SearchX,
    Home
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import './PublicLibrary.css';

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

const PublicLibrary = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [publicProblems, setPublicProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterSchoolLevel, setFilterSchoolLevel] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');

    useEffect(() => {
        fetchPublicProblems();
    }, []);

    const fetchPublicProblems = async () => {
        try {
            setLoading(true);
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
            setLoading(false);
        }
    };

    const handleImport = async (problem) => {
        if (!currentUser) {
            alert('가져오기 기능을 사용하려면 먼저 로그인해주세요!');
            navigate('/teacher/login');
            return;
        }

        try {
            // Create a copy of the problem for the current teacher
            const { id, createdAt, teacherId, pinNumber, ...problemData } = problem;

            // New PIN for the imported version
            const newPin = Math.floor(100000 + Math.random() * 900000).toString();

            await addDoc(collection(db, 'problems'), {
                ...problemData,
                teacherId: currentUser.uid,
                pinNumber: newPin,
                isPublic: false, // Default to private on import
                createdAt: serverTimestamp(),
                importedFrom: id
            });

            alert('선생님의 보관함으로 복사되었습니다!');
            navigate('/teacher/dashboard');
        } catch (error) {
            alert('가져오기 실패: ' + error.message);
        }
    };

    const filteredProblems = publicProblems.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || p.type === filterType;
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

    if (loading) {
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
                            <Home size={20} />
                        </button>
                        <button className="btn-back" onClick={() => navigate('/teacher/dashboard')} title="대시보드로">
                            <ArrowLeft size={20} />
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
                </div>
                <div className="filter-group">
                    <select
                        className="library-select"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
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
                    filteredProblems.map(problem => (
                        <div key={problem.id} className="library-card">
                            <div className="card-top">
                                <span className={`type-badge ${problem.type}`}>
                                    {getTypeText(problem.type)}
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
                                <p className="problem-author">제작: {problem.teacherDisplayName || '선생님'}</p>
                            </div>

                            <div className="card-footer">
                                <button
                                    className="btn-import"
                                    onClick={() => handleImport(problem)}
                                >
                                    <Download size={18} /> 내 보관함으로 가져오기
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div >
    );
};

export default PublicLibrary;
