import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Type, Save, ArrowLeft, Image as ImageIcon, Plus, Trash2, Layout, Maximize2, Loader2, Check } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import ProblemMonitor from '../FillBlanks/ProblemMonitor';
import './FreeTeacherMode.css';
import SubjectGradeSelector from '../../components/SubjectGradeSelector';

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const FreeTeacherMode = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [step, setStep] = useState('input'); // input, monitor
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [items, setItems] = useState([]); // { id, content, type, width, fontSize }
    const [isPublic, setIsPublic] = useState(false);
    const { currentUser } = useAuth();
    const [inputText, setInputText] = useState('');
    const [fontSizeScale, setFontSizeScale] = useState('M'); // S, M, L
    const [aspectRatio, setAspectRatio] = useState(16 / 9);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [createdProblem, setCreatedProblem] = useState(null);
    const [subject, setSubject] = useState('');
    const [schoolLevel, setSchoolLevel] = useState('');
    const [grade, setGrade] = useState('');

    // 로그인 체크
    useEffect(() => {
        if (!currentUser) {
            alert('선생님 기능은 로그인이 필요합니다. 로그인 페이지로 이동합니다.');
            navigate('/teacher/login');
        }
    }, [currentUser, navigate]);

    const fileInputRef = useRef(null);
    const itemImageInputRef = useRef(null);
    const canvasRef = useRef(null);

    const handleFileUpload = async (file) => {
        if (!file) return;

        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const typedarray = new Uint8Array(event.target.result);
                    const loadingTask = pdfjsLib.getDocument({ data: typedarray });
                    const pdf = await loadingTask.promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    const dataUrl = canvas.toDataURL('image/png');
                    const blob = await (await fetch(dataUrl)).blob();
                    const formData = new FormData();
                    formData.append('image', blob, 'pdf-bg.png');

                    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com'}/api/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success) {
                        setBackgroundUrl(data.url);
                        setAspectRatio(viewport.width / viewport.height);
                    }
                } catch (err) {
                    alert('PDF 변환 오류: ' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const formData = new FormData();
            formData.append('image', file);
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com'}/api/upload`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    setBackgroundUrl(data.url);
                    const img = new Image();
                    img.onload = () => setAspectRatio(img.naturalWidth / img.naturalHeight);
                    img.src = data.url;
                }
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = () => {
        setIsDraggingOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handleAddText = () => {
        if (!inputText.trim()) return;
        const fontSizeMap = { 'S': 16, 'M': 24, 'L': 32 };
        const newItem = {
            id: Date.now().toString(),
            type: 'text',
            content: inputText,
            fontSize: fontSizeMap[fontSizeScale],
            fontSizeScale: fontSizeScale
        };
        setItems([...items, newItem]);
        setInputText('');
    };

    const handleAddImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com'}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                const newItem = {
                    id: Date.now().toString(),
                    type: 'image',
                    imageUrl: data.url,
                    width: 20
                };
                setItems([...items, newItem]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const updateItemWidth = (id, newWidth) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, width: newWidth } : item
        ));
    };

    const IMAGE_SIZE_MAP = { 'S': 15, 'M': 30, 'L': 50, 'XL': 80 };
    const updateItemWidthByScale = (id, scale) => {
        updateItemWidth(id, IMAGE_SIZE_MAP[scale]);
    };
    const getImageSizeLabel = (width) => {
        if (width <= 20) return 'S';
        if (width <= 40) return 'M';
        if (width <= 60) return 'L';
        return 'XL';
    };

    const handleDeleteItem = (id) => {
        setItems(items.filter(i => i.id !== id));
    };
    const handleSave = async () => {
        if (!title || !backgroundUrl) {
            alert('제목과 배경 이미지를 설정해주세요.');
            return;
        }
        if (!schoolLevel) {
            alert('학교급을 선택해주세요. (필수)');
            return;
        }

        if (!currentUser) {
            alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
            navigate('/teacher/login');
            return;
        }

        try {
            setIsSaving(true);

            // 클라이언트에서 ID 및 PIN 생성
            const problemId = Math.random().toString(36).substr(2, 9);
            const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

            const newProblem = {
                id: problemId,
                type: 'free-drop',
                pinNumber,
                title,
                backgroundUrl,
                items: items.map(i => ({ ...i, isPlaced: false, x: 0, y: 0 })), // 학생용 초기 상태
                aspectRatio,
                baseWidth: 1000,
                teacherId: currentUser.uid,
                isPublic,
                subject: subject || null,
                schoolLevel,
                grade: grade || null,
                createdAt: serverTimestamp()
            };

            // Firestore에 직접 저장
            console.log('[CLIENT-PRE-SAVE] 자유 보드 문제 객체:', newProblem);
            await setDoc(doc(db, 'problems', problemId), newProblem);
            console.log('[CLIENT-SAVE] 자유 보드 저장 성공:', problemId, 'Teacher:', currentUser.uid);

            setCreatedProblem(newProblem);
            setStep('monitor');

        } catch (error) {
            console.error('Save Error:', error);
            alert('저장 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (

        <div className="free-teacher-container">
            {/* Header (Standardized) */}
            <nav className="header-nav teacher-header">
                <div className="brand-logo static-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <span className="logo-icon">☁️</span>
                    <div className="logo-text-fixed">
                        <span className="logo-dd">D</span>
                        <span className="logo-full">rag&</span>
                        <span className="logo-dd">D</span>
                        <span className="logo-full">rop</span>
                        <span className="logo-class">Class</span>
                    </div>
                </div>
                <div className="nav-btns">
                    <button className="btn-ghost" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> 나가기
                    </button>
                </div>
            </nav>

            {/* Main Layout: Left Tools | Center Workspace */}
            <main className="free-main-layout">
                {step === 'input' ? (
                    <>
                        {/* Top: Guide (Horizontal) */}
                        <div className="top-guide-bar">
                            <div className="guide-card-horizontal">
                                <h3>자유 보드 구성 가이드 ☁️</h3>
                                <div className="guide-steps-horizontal">
                                    <div className="guide-step-item-h active">
                                        <div className="step-num-h">1</div>
                                        <div className="step-info-h">
                                            <p>배경 설정: 학습지나 이미지를 업로드하세요.</p>
                                        </div>
                                    </div>
                                    <div className="guide-step-item-h active">
                                        <div className="step-num-h">2</div>
                                        <div className="step-info-h">
                                            <p>카드 추가: 학생들이 움직일 텍스트/이미지를 만드세요.</p>
                                        </div>
                                    </div>
                                    <div className="guide-step-item-h active">
                                        <div className="step-num-h">3</div>
                                        <div className="step-info-h">
                                            <p>저장 & 공유: PIN 번호로 수업을 시작하세요!</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="tip-box-h">
                                    <p><strong>💡 꿀팁:</strong> PDF는 첫 페이지가 배경이 됩니다!</p>
                                </div>
                            </div>
                        </div>

                        <div className="workspace-container-flex">
                            {/* Left Sidebar: Tools & List */}
                            <aside className="tool-sidebar">
                                <div className="sidebar-header">
                                    <h3>보드 도구 🛠️</h3>
                                </div>

                                <div className="sidebar-content">
                                    <div className="form-group">
                                        <label>문제 제목</label>
                                        <input
                                            type="text"
                                            placeholder="제목을 입력하세요"
                                            value={title}
                                            className="styled-input-mini"
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>

                                    <SubjectGradeSelector
                                        subject={subject}
                                        setSubject={setSubject}
                                        schoolLevel={schoolLevel}
                                        setSchoolLevel={setSchoolLevel}
                                        grade={grade}
                                        setGrade={setGrade}
                                    />

                                    <div className="divider"></div>

                                    <div className="form-group">
                                        <label>카드 추가</label>

                                        {/* Text Input */}
                                        <div className="input-with-button" style={{ marginBottom: '0.5rem' }}>
                                            <input
                                                type="text"
                                                placeholder="텍스트 입력..."
                                                value={inputText}
                                                className="styled-input-mini"
                                                onChange={(e) => setInputText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                                            />
                                            <button className="btn-add" onClick={handleAddText}>+</button>
                                        </div>
                                        <div className="font-size-group" style={{ marginBottom: '0.5rem' }}>
                                            {[{ scale: 'S', px: 16 }, { scale: 'M', px: 24 }, { scale: 'L', px: 32 }].map(({ scale, px }) => (
                                                <button
                                                    key={scale}
                                                    className={`btn-size-toggle ${fontSizeScale === scale ? 'active' : ''}`}
                                                    onClick={() => setFontSizeScale(scale)}
                                                    style={{ fontSize: `${px * 0.55}px`, fontWeight: 800, lineHeight: 1 }}
                                                >
                                                    {scale}
                                                </button>
                                            ))}
                                        </div>
                                        {/* 텍스트 실시간 미리보기 */}
                                        {inputText && (
                                            <div className="text-preview-box">
                                                <span style={{ fontSize: `${{ S: 16, M: 24, L: 32 }[fontSizeScale]}px`, fontWeight: 700, color: '#3D2B1F', wordBreak: 'break-all' }}>
                                                    {inputText}
                                                </span>
                                            </div>
                                        )}

                                        {/* Image Upload Button */}
                                        <button className="btn-sidebar-secondary" onClick={() => itemImageInputRef.current.click()}>
                                            <ImageIcon size={18} /> 이미지 카드 추가
                                        </button>
                                        <input type="file" ref={itemImageInputRef} hidden onChange={handleAddImage} accept="image/*" />
                                    </div>

                                    <div className="divider"></div>

                                    <div className="sidebar-tray-header">
                                        <Layout size={16} /> 생성된 카드 목록 ({items.length})
                                    </div>

                                    <div className="sidebar-tray-list">
                                        {items.length === 0 && (
                                            <div className="empty-tray-msg-small">카드가 없습니다.</div>
                                        )}
                                        {items.map(item => (
                                            <div key={item.id} className={`sidebar-tray-item ${item.type === 'image' ? 'sidebar-tray-item--image' : ''}`}>
                                                {item.type === 'text' ? (
                                                    /* 텍스트 카드: 실제 크기 미리보기 */
                                                    <div className="tray-text-preview">
                                                        <div className="tray-text-badge">{item.fontSizeScale || 'M'}</div>
                                                        <span style={{
                                                            fontSize: `${item.fontSize}px`,
                                                            fontWeight: 700,
                                                            color: '#3D2B1F',
                                                            flex: 1,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>{item.content}</span>
                                                        <button className="btn-delete-mini" onClick={() => handleDeleteItem(item.id)}>×</button>
                                                    </div>
                                                ) : (
                                                    /* 이미지 카드: 썸네일 + S/M/L/XL 버튼 */
                                                    <div className="tray-image-card">
                                                        <div className="tray-image-thumb">
                                                            <img src={item.imageUrl} alt="item" />
                                                            <div className="tray-image-size-label">{item.width}%</div>
                                                        </div>
                                                        <div className="tray-image-controls">
                                                            <div className="image-size-buttons">
                                                                {['S', 'M', 'L', 'XL'].map(s => (
                                                                    <button
                                                                        key={s}
                                                                        className={`btn-img-size ${getImageSizeLabel(item.width) === s ? 'active' : ''}`}
                                                                        onClick={() => updateItemWidthByScale(item.id, s)}
                                                                    >{s}</button>
                                                                ))}
                                                            </div>
                                                            <button className="btn-delete-mini" onClick={() => handleDeleteItem(item.id)}>×</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="sidebar-footer">
                                    <div className="visibility-toggle">
                                        <label className="toggle-label">
                                            <input
                                                type="checkbox"
                                                checked={isPublic}
                                                onChange={(e) => setIsPublic(e.target.checked)}
                                            />
                                            <span className="toggle-text">다른 선생님께 이 문제 공개하기</span>
                                        </label>
                                    </div>
                                    <button className="btn-save-all" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        {isSaving ? '저장 중...' : '내 보관함에 저장 & 문제 생성'}
                                    </button>
                                </div>
                            </aside>

                            {/* Center: Workspace (Background Only) */}
                            <section className="teacher-workspace">
                                <section className="center-preview-area">
                                    {!backgroundUrl ? (
                                        <div
                                            className={`center-upload-zone ${isDraggingOver ? 'dragging' : ''}`}
                                            onClick={() => fileInputRef.current.click()}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                        >
                                            <div className="upload-icon-circle">
                                                <Upload size={48} color="#E6B400" />
                                            </div>
                                            <h3>배경 이미지 업로드</h3>
                                            <p>클릭하거나 이미지를 여기로 드래그하세요</p>
                                            <span className="upload-hint">JPG, PNG, PDF 지원 (PDF는 1페이지만)</span>
                                        </div>
                                    ) : (
                                        <div className="canvas-wrapper">
                                            <img src={backgroundUrl} alt="background" className="canvas-bg-img" />
                                            <div className="canvas-overlay-tools">
                                                <button className="btn-change-bg-prominent" onClick={() => setBackgroundUrl('')}>
                                                    <ImageIcon size={18} /> 배경 다른 사진으로 변경하기
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} hidden onChange={(e) => handleFileUpload(e.target.files[0])} accept="image/*,.pdf" />
                                </section>
                            </section>
                        </div>
                    </>
                ) : (
                    /* Step: Monitor - Show PIN and Real-time monitoring */
                    <div className="monitor-view-container fade-in">
                        <div className="teacher-card text-center" style={{ margin: '2rem auto', maxWidth: '1000px', width: '90%' }}>
                            <div className="success-lottie-area">
                                <div className="success-icon-puffy">
                                    <Check size={48} color="white" strokeWidth={3} />
                                </div>
                                <h2>자유 보드가 생성되었습니다!</h2>
                                <p className="save-confirmation-text">
                                    <Save size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    내 보관함에 안전하게 저장되었습니다.
                                </p>
                            </div>

                            <div className="pin-box-refined">
                                <span className="pin-label">참여 코드 (PIN)</span>
                                <strong className="pin-number">{createdProblem.pinNumber}</strong>
                            </div>

                            <p className="monitor-guide-text">
                                학생들에게 PIN 번호를 알려주세요.<br />
                                학생들이 참여하면 아래에서 실시간 현황을 볼 수 있습니다.
                            </p>

                            <div className="dashboard-action-area" style={{ marginTop: '2rem', marginBottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="btn-save-all" onClick={() => navigate(`/monitor/${createdProblem.id}`)} style={{ width: 'auto', padding: '0.8rem 1.5rem' }}>
                                    <Maximize2 size={18} /> 실시간 모니터링 전체화면으로 가기
                                </button>
                                <button className="btn-secondary" onClick={() => navigate('/teacher/dashboard')} style={{ width: 'auto' }}>
                                    내 보관함 가기
                                </button>
                            </div>

                            <div className="monitor-container-refined">
                                <ProblemMonitor problemData={createdProblem} />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FreeTeacherMode;
