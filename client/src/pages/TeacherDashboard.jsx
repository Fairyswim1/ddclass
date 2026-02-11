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
    Loader2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        if (!currentUser) {
            navigate('/teacher/login');
            return;
        }
        fetchMyProblems();
    }, [currentUser]);

    const fetchMyProblems = async () => {
        try {
            setLoading(true);
            // composite index 오류 방지를 위해 orderBy를 제거하고 로컬에서 정렬합니다.
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
                const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return dateB - dateA;
            });

            setProblems(items);
        } catch (error) {
            console.error("Error fetching problems:", error);
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
        return matchesSearch && matchesType;
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

    if (loading) {
        return (
            <div className="dashboard-loading">
                <Loader2 className="animate-spin" size={48} />
                <p>내 문제들을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="teacher-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>내 문제 보관함 📦</h1>
                    <p>선생님이 제작하신 소중한 교육 자료들입니다.</p>
                </div>
                <div className="header-right">
                    <button className="btn-create-new" onClick={() => navigate('/')}>
                        <Plus size={20} /> 새 문제 만들기
                    </button>
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
                                    onClick={() => navigate(`/${problem.type}/monitor/${problem.id}`)}
                                >
                                    시작하기 <ArrowRight size={16} />
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
        </div>
    );
};

export default TeacherDashboard;
