import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { resolveApiUrl } from '../../utils/url';
import LatexRenderer from '../../components/LatexRenderer';
import {
    ArrowLeft, Layers, Layout, MousePointer2, Clock, Plus,
    GripVertical, Trash2, Save, ArrowUp, ArrowDown, ListVideo
} from 'lucide-react';
import './CreateLesson.css';

const getTypeIcon = (type) => {
    switch (type) {
        case 'fill-blanks': return <Layers size={16} />;
        case 'order-matching': return <Layout size={16} />;
        case 'free-drop': return <MousePointer2 size={16} />;
        default: return <Clock size={16} />;
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

const CreateLesson = () => {
    const { currentUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [problems, setProblems] = useState([]);
    const [playlist, setPlaylist] = useState([]); // Array of problem objects
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !currentUser) {
            navigate('/teacher/login');
        } else if (currentUser) {
            fetchMyProblems();
        }
    }, [authLoading, currentUser, navigate]);

    const fetchMyProblems = async () => {
        try {
            const q = query(
                collection(db, 'problems'),
                where('teacherId', '==', currentUser.uid)
            );
            const querySnapshot = await getDocs(q);
            const items = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            items.sort((a, b) => {
                const getTime = (val) => val?.toMillis?.() || new Date(val).getTime() || 0;
                return getTime(b.createdAt) - getTime(a.createdAt);
            });

            setProblems(items);
        } catch (error) {
            console.error("Error fetching problems:", error);
            alert("문제를 불러오는 중 오류가 발생했습니다.");
        }
    };

    const addToPlaylist = (problem) => {
        setPlaylist([...playlist, { ...problem, playlistId: Date.now() + Math.random() }]);
    };

    const removeFromPlaylist = (playlistId) => {
        setPlaylist(playlist.filter(p => p.playlistId !== playlistId));
    };

    const moveItem = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === playlist.length - 1)) return;

        const newPlaylist = [...playlist];
        const temp = newPlaylist[index];
        newPlaylist[index] = newPlaylist[index + direction];
        newPlaylist[index + direction] = temp;
        setPlaylist(newPlaylist);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('수업 이름을 입력해주세요.');
            return;
        }
        if (playlist.length === 0) {
            alert('수업에 포함할 문제를 최소 1개 이상 추가해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            const problemIds = playlist.map(p => p.id);
            const response = await fetch(resolveApiUrl('/api/lessons'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    problemIds,
                    teacherId: currentUser.uid
                })
            });

            const data = await response.json();
            if (data.success) {
                alert(`성공적으로 저장되었습니다! PIN: ${data.pinNumber}`);
                navigate('/teacher/dashboard');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) return <div>Loading...</div>;

    return (
        <div className="create-lesson-container">
            <header className="lesson-header">
                <div className="lesson-header-left">
                    <button className="btn-back" onClick={() => navigate('/teacher/dashboard')} title="대시보드로 돌아가기">
                        <ArrowLeft size={20} />
                    </button>
                    <input
                        type="text"
                        className="lesson-title-input"
                        placeholder="새로운 수업 이름 입력..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        autoFocus
                    />
                </div>
                <button
                    className="btn-save-lesson"
                    onClick={handleSave}
                    disabled={isSaving || playlist.length === 0 || !title.trim()}
                >
                    <Save size={20} />
                    {isSaving ? '저장 중...' : '수업 저장하기'}
                </button>
            </header>

            <div className="lesson-workspace">
                {/* Left Panel: Available Problems */}
                <div className="problem-pool">
                    <div className="panel-header">
                        <Layers size={24} />
                        <span>내 보관함 문제 목록</span>
                    </div>
                    <div className="problem-list">
                        {problems.map(problem => (
                            <div key={problem.id} className="problem-item">
                                <div className="problem-info">
                                    <span className={`type-badge ${problem.type}`}>
                                        {getTypeIcon(problem.type)} {getTypeText(problem.type)}
                                    </span>
                                    <span className="problem-title"><LatexRenderer text={problem.title} /></span>
                                </div>
                                <button className="btn-add" onClick={() => addToPlaylist(problem)}>
                                    <Plus size={16} /> 추가
                                </button>
                            </div>
                        ))}
                        {problems.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>
                                생성된 문제가 없습니다. 대시보드에서 먼저 문제를 만들어주세요.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Playlist */}
                <div className="lesson-playlist">
                    <div className="panel-header">
                        <ListVideo size={24} color="var(--color-brand-blue)" />
                        <span style={{ color: 'var(--color-brand-blue)' }}>수업 순서 (진행 순서대로 배치하세요)</span>
                    </div>
                    <div className="problem-list">
                        {playlist.map((item, index) => (
                            <div key={item.playlistId} className="playlist-item">
                                <div className="item-index">{index + 1}</div>
                                <div className="problem-info" style={{ flex: 1 }}>
                                    <span className={`type-badge ${item.type}`}>
                                        {getTypeIcon(item.type)} {getTypeText(item.type)}
                                    </span>
                                    <span className="problem-title"><LatexRenderer text={item.title} /></span>
                                </div>
                                <div className="item-actions">
                                    <button className="btn-icon" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                                        <ArrowUp size={16} />
                                    </button>
                                    <button className="btn-icon" onClick={() => moveItem(index, 1)} disabled={index === playlist.length - 1}>
                                        <ArrowDown size={16} />
                                    </button>
                                    <button className="btn-icon danger" onClick={() => removeFromPlaylist(item.playlistId)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {playlist.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem', padding: '2rem', border: '2px dashed #ccc', borderRadius: '12px' }}>
                                왼쪽 보관함에서 문제를 추가해주세요.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateLesson;
