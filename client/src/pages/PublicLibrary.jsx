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
    SearchX
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import './PublicLibrary.css';

const PublicLibrary = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [publicProblems, setPublicProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

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
        return matchesSearch && matchesType;
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
                    <button className="btn-back" onClick={() => navigate('/teacher/dashboard')}>
                        <ArrowLeft size={20} /> 대시보드
                    </button>
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
                    {['all', 'fill-blanks', 'order-matching', 'free-drop'].map(type => (
                        <button
                            key={type}
                            className={`filter-btn ${filterType === type ? 'active' : ''}`}
                            onClick={() => setFilterType(type)}
                        >
                            {type === 'all' ? '전체' : getTypeText(type)}
                        </button>
                    ))}
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
        </div>
    );
};

export default PublicLibrary;
