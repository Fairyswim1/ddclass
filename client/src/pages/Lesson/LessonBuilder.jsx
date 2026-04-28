import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { ArrowLeft, Plus, Check, Trash2, Save, Layout, List, CheckSquare, MessageSquare, Edit3, PieChart, Image, Youtube, Presentation } from 'lucide-react';
import { resolveApiUrl } from '../../utils/url';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './LessonBuilder.css';

// Importing Editors
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
    'ppt': <Presentation size={16} />
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
    'ppt': 'PPT (Google 슬라이드)'
};

const TYPE_GROUPS = [
    { label: '퀴즈 & 활동', types: ['fill-blanks', 'order-matching', 'free-drop', 'multiple-choice', 'short-answer', 'whiteboard', 'poll'] },
    { label: '미디어 콘텐츠', types: ['image', 'video', 'ppt'] }
];

const LessonBuilder = () => {
    const { currentUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [slides, setSlides] = useState([]);
    const [activeSlideId, setActiveSlideId] = useState(null);
    const [showTypeSelector, setShowTypeSelector] = useState(false);

    React.useEffect(() => {
        if (!authLoading && !currentUser) {
            alert('로그인이 필요합니다.');
            navigate('/teacher/login');
        }
    }, [currentUser, authLoading, navigate]);

    const activeSlide = slides.find(s => s.id === activeSlideId);

    const handleAddSlide = (type) => {
        const newSlide = {
            id: `slide_${Date.now()}`,
            type,
            title: '',
            // Initialize default payload based on type
            ...(type === 'fill-blanks' && { originalText: '', blanks: [], allowDuplicates: false }),
            ...(type === 'order-matching' && { steps: [] }),
            ...(type === 'free-drop' && { backgroundUrl: null, items: [], baseWidth: 1000, aspectRatio: 16 / 9 }),
            ...(type === 'multiple-choice' && { question: '', options: ['', ''], answerIndex: 0 }),
            ...(type === 'short-answer' && { question: '', answer: '' }),
            ...(type === 'whiteboard' && { backgroundUrl: null }),
            ...(type === 'poll' && { question: '', options: ['', ''] }),
            ...(type === 'image' && { imageUrl: null }),
            ...(type === 'video' && { videoUrl: '', videoId: '' }),
            ...(type === 'ppt' && { pptEmbedUrl: '' })
        };
        setSlides([...slides, newSlide]);
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
        if (activeSlideId === id) {
            setActiveSlideId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
        }
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const newSlides = Array.from(slides);
        const [reorderedItem] = newSlides.splice(result.source.index, 1);
        newSlides.splice(result.destination.index, 0, reorderedItem);
        setSlides(newSlides);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('수업 제목을 입력해주세요.');
            return;
        }
        if (slides.length === 0) {
            alert('최소 1개 이상의 슬라이드를 추가해주세요.');
            return;
        }

        try {
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                navigate('/teacher/login');
                return;
            }
            const teacherId = currentUser.uid;

            // Bulk Save API
            const response = await fetch(resolveApiUrl('/api/lessons/bulk'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    slides,
                    teacherId
                })
            });

            const data = await response.json();
            if (data.success) {
                alert(`수업 생성 완료! PIN 번호: ${data.pinNumber}`);
                navigate('/teacher/dashboard');
            } else {
                alert('수업 생성 실패: ' + data.message);
            }
        } catch (error) {
            console.error('Save Error:', error);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="lesson-builder-container">
            {/* Header */}
            <header className="builder-header">
                <div className="header-left">
                    <button onClick={() => navigate('/teacher/dashboard')} className="btn-back">
                        <ArrowLeft size={20} /> 나가기
                    </button>
                    <input
                        type="text"
                        className="lesson-title-input"
                        placeholder="수업 제목을 입력하세요"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div className="header-right">
                    <button className="btn-save" onClick={handleSave}>
                        <Save size={18} /> 수업 저장
                    </button>
                </div>
            </header>

            <div className="builder-body">
                {/* Left Sidebar: Slides Thumbnails */}
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
                                                        <div className="thumb-title">
                                                            {slide.title || '제목 없음'}
                                                        </div>
                                                    </div>
                                                    <button className="btn-delete-slide" onClick={(e) => handleDeleteSlide(slide.id, e)}>
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

                {/* Right Main: Slide Editor */}
                <main className="slide-editor-main">
                    {activeSlide ? (
                        <div className="editor-wrapper">
                            <div className="editor-header">
                                <span className="badge-type">{TYPE_LABELS[activeSlide.type]}</span>
                                <input
                                    type="text"
                                    className="slide-title-input"
                                    placeholder="문제 제목"
                                    value={activeSlide.title}
                                    onChange={(e) => handleUpdateSlide(activeSlide.id, { title: e.target.value })}
                                />
                            </div>
                            <div className="editor-content">
                                {/* Editor Component Goes Here */}
                                <div className="editor-dynamic-area">
                                    {activeSlide.type === 'fill-blanks' && <FillBlanksEditor slide={activeSlide} updateSlide={handleUpdateSlide} />}
                                    {activeSlide.type === 'order-matching' && <OrderMatchingEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
                                    {activeSlide.type === 'free-drop' && <FreeDropEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
                                    {activeSlide.type === 'multiple-choice' && <MultipleChoiceEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
                                    {activeSlide.type === 'short-answer' && <ShortAnswerEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
                                    {activeSlide.type === 'whiteboard' && <WhiteboardEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
                                    {activeSlide.type === 'poll' && <PollEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
                                    {activeSlide.type === 'image' && <ImageEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
                                    {activeSlide.type === 'video' && <VideoEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
                                    {activeSlide.type === 'ppt' && <PptEditor slide={activeSlide} onChange={(data) => handleUpdateSlide(activeSlide.id, data)} />}
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

export default LessonBuilder;
