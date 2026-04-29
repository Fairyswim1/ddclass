import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, getDocs, collection, query, where, documentId } from 'firebase/firestore';
import { ArrowLeft, Plus, Check, Trash2, Save, Layout, List, CheckSquare, MessageSquare, Edit3, PieChart, Image, Youtube, Presentation, Globe, Loader2 } from 'lucide-react';
import { resolveApiUrl } from '../../utils/url';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './LessonBuilder.css';

import FillBlanksEditor from './Editors/FillBlanksEditor';
import OrderMatchingEditor from './Editors/OrderMatchingEditor';
import FreeDropEditor from './Editors/FreeDropEditor';
import MultipleChoiceEditor from './Editors/MultipleChoiceEditor';
import ShortAnswerEditor from './Editors/ShortAnswerEditor';
import WhiteboardEditor from './Editors/WhiteboardEditor';
import PollEditor from './Editors/PollEditor';
import ImageEditor from './Editors/ImageEditor';
import VideoEditor from './Editors/VideoEditor';
import PptEditor from './Editors/PptEditor';
import WebsiteEditor from './Editors/WebsiteEditor';

const TYPE_ICONS = {
    'fill-blanks': <CheckSquare size={16} />,
    'order-matching': <List size={16} />,
    'free-drop': <Layout size={16} />,
    'multiple-choice': <Check size={16} />,
    'short-answer': <MessageSquare size={16} />,
    'whiteboard': <Edit3 size={16} />,
    'poll': <PieChart size={16} />,
    'image': <Image size={16} />,
    'video': <Youtube size={16} />,
    'ppt': <Presentation size={16} />,
    'website': <Globe size={16} />
};

const TYPE_LABELS = {
    'fill-blanks': '빈칸 채우기',
    'order-matching': '순서 맞추기',
    'free-drop': '자유 보드',
    'multiple-choice': '객관식 퀴즈',
    'short-answer': '주관식 퀴즈',
    'whiteboard': '화이트보드',
    'poll': '투표',
    'image': '이미지',
    'video': '동영상 (YouTube)',
    'ppt': 'PPT (Google 슬라이드)',
    'website': '웹사이트 임베드'
};

const TYPE_GROUPS = [
    { label: '퀴즈 & 활동', types: ['fill-blanks', 'order-matching', 'free-drop', 'multiple-choice', 'short-answer', 'whiteboard', 'poll'] },
    { label: '미디어 콘텐츠', types: ['image', 'video', 'ppt', 'website'] }
];

const LessonEditor = () => {
    const { id: lessonId } = useParams();
    const { currentUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [slides, setSlides] = useState([]);
    const [activeSlideId, setActiveSlideId] = useState(null);
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [loadingLesson, setLoadingLesson] = useState(true);

    useEffect(() => {
        if (!authLoading && !currentUser) {
            navigate('/teacher/login');
        }
    }, [currentUser, authLoading, navigate]);

    // 기존 수업 데이터 로드
    useEffect(() => {
        if (!lessonId || authLoading) return;

        const load = async () => {
            try {
                setLoadingLesson(true);
                const lessonSnap = await getDoc(doc(db, 'lessons', lessonId));
                if (!lessonSnap.exists()) {
                    alert('수업을 찾을 수 없습니다.');
                    navigate('/teacher/dashboard');
                    return;
                }
                const lessonData = lessonSnap.data();
                setTitle(lessonData.title || '');

                const problemIds = lessonData.problemIds || [];
                if (problemIds.length === 0) { setLoadingLesson(false); return; }

                // 문제 일괄 로드 (10개 단위 청크)
                const chunks = [];
                for (let i = 0; i < problemIds.length; i += 10) chunks.push(problemIds.slice(i, i + 10));
                let allProblems = [];
                for (const chunk of chunks) {
                    const q = query(collection(db, 'problems'), where(documentId(), 'in', chunk));
                    const snap = await getDocs(q);
                    allProblems = [...allProblems, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))];
                }

                // problemIds 순서 유지
                const sorted = problemIds
                    .map(pid => allProblems.find(p => p.id === pid))
                    .filter(Boolean)
                    .map(p => ({ ...p, _originalId: p.id })); // 원래 ID 보존

                setSlides(sorted);
                if (sorted.length > 0) setActiveSlideId(sorted[0].id);
            } catch (err) {
                console.error('수업 로드 실패:', err);
                alert('수업 데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoadingLesson(false);
            }
        };

        load();
    }, [lessonId, authLoading, navigate]);

    const activeSlide = slides.find(s => s.id === activeSlideId);

    const handleAddSlide = (type) => {
        const newSlide = {
            id: `slide_${Date.now()}`,
            type, title: '',
            ...(type === 'fill-blanks' && { originalText: '', blanks: [], allowDuplicates: false }),
            ...(type === 'order-matching' && { steps: [] }),
            ...(type === 'free-drop' && { backgroundUrl: null, items: [], baseWidth: 1000, aspectRatio: 16 / 9 }),
            ...(type === 'multiple-choice' && { question: '', options: ['', ''], answerIndex: 0 }),
            ...(type === 'short-answer' && { question: '', answer: '' }),
            ...(type === 'whiteboard' && { backgroundUrl: null }),
            ...(type === 'poll' && { question: '', options: ['', ''] }),
            ...(type === 'image' && { imageUrl: null }),
            ...(type === 'video' && { videoUrl: '', videoId: '', videoMode: 'class' }),
            ...(type === 'ppt' && { pptEmbedUrl: '' }),
            ...(type === 'website' && { websiteUrl: '' })
        };
        setSlides(prev => [...prev, newSlide]);
        setActiveSlideId(newSlide.id);
        setShowTypeSelector(false);
    };

    const handleUpdateSlide = (id, updatedFields) => {
        setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields } : s));
    };

    const handleDeleteSlide = (id, e) => {
        e.stopPropagation();
        const filtered = slides.filter(s => s.id !== id);
        setSlides(filtered);
        if (activeSlideId === id) setActiveSlideId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const newSlides = Array.from(slides);
        const [moved] = newSlides.splice(result.source.index, 1);
        newSlides.splice(result.destination.index, 0, moved);
        setSlides(newSlides);
    };

    const handleSave = async () => {
        if (!title.trim()) { alert('수업 제목을 입력해주세요.'); return; }
        if (slides.length === 0) { alert('최소 1개 이상의 슬라이드를 추가해주세요.'); return; }
        if (!currentUser) { alert('로그인이 필요합니다.'); navigate('/teacher/login'); return; }

        try {
            const response = await fetch(resolveApiUrl(`/api/lessons/bulk/${lessonId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, slides, teacherId: currentUser.uid })
            });
            const data = await response.json();
            if (data.success) {
                alert('수업이 수정되었습니다!');
                navigate('/teacher/dashboard');
            } else {
                alert('수정 실패: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    if (loadingLesson) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <Loader2 className="animate-spin" size={40} color="#F58220" />
                <p style={{ color: '#64748b' }}>수업 데이터를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="lesson-builder-container">
            <header className="builder-header">
                <div className="header-left">
                    <button onClick={() => navigate('/teacher/dashboard')} className="btn-back">
                        <ArrowLeft size={20} /> 나가기
                    </button>
                    <input
                        type="text" className="lesson-title-input"
                        placeholder="수업 제목을 입력하세요"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                </div>
                <div className="header-right">
                    <button className="btn-save" onClick={handleSave}>
                        <Save size={18} /> 수업 저장
                    </button>
                </div>
            </header>

            <div className="builder-body">
                <aside className="slides-sidebar">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="slides-list">
                            {(provided) => (
                                <div className="slides-list" {...provided.droppableProps} ref={provided.innerRef}>
                                    {slides.map((slide, index) => (
                                        <Draggable key={slide.id} draggableId={slide.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`slide-thumbnail ${activeSlideId === slide.id ? 'active' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                                                    onClick={() => setActiveSlideId(slide.id)}
                                                >
                                                    <div className="thumb-index">{index + 1}</div>
                                                    <div className="thumb-content">
                                                        <div className="thumb-type">
                                                            {TYPE_ICONS[slide.type]}
                                                            <span>{TYPE_LABELS[slide.type]}</span>
                                                        </div>
                                                        <div className="thumb-title">{slide.title || '제목 없음'}</div>
                                                    </div>
                                                    <button className="btn-delete-slide" onClick={e => handleDeleteSlide(slide.id, e)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    <div className="add-slide-wrapper">
                        <button className="btn-add-slide" onClick={() => setShowTypeSelector(!showTypeSelector)}>
                            <Plus size={20} /> 슬라이드 추가
                        </button>
                        {showTypeSelector && (
                            <div className="type-selector-menu">
                                {TYPE_GROUPS.map(group => (
                                    <div key={group.label}>
                                        <div className="type-group-label">{group.label}</div>
                                        {group.types.map(type => (
                                            <button key={type} className="type-option" onClick={() => handleAddSlide(type)}>
                                                {TYPE_ICONS[type]} {TYPE_LABELS[type]}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                <main className="slide-editor-main">
                    {activeSlide ? (
                        <div className="editor-wrapper">
                            <div className="editor-header">
                                <span className="badge-type">{TYPE_LABELS[activeSlide.type]}</span>
                                <input
                                    type="text" className="slide-title-input"
                                    placeholder="문제 제목"
                                    value={activeSlide.title}
                                    onChange={e => handleUpdateSlide(activeSlide.id, { title: e.target.value })}
                                />
                            </div>
                            <div className="editor-content">
                                <div className="editor-dynamic-area">
                                    {activeSlide.type === 'fill-blanks' && <FillBlanksEditor slide={activeSlide} updateSlide={handleUpdateSlide} />}
                                    {activeSlide.type === 'order-matching' && <OrderMatchingEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'free-drop' && <FreeDropEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'multiple-choice' && <MultipleChoiceEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'short-answer' && <ShortAnswerEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'whiteboard' && <WhiteboardEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'poll' && <PollEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'image' && <ImageEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'video' && <VideoEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'ppt' && <PptEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                    {activeSlide.type === 'website' && <WebsiteEditor slide={activeSlide} onChange={d => handleUpdateSlide(activeSlide.id, d)} />}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-editor-state">
                            <Layout size={48} opacity={0.2} />
                            <p>좌측에서 슬라이드를 선택하거나 새 슬라이드를 추가하세요.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default LessonEditor;
