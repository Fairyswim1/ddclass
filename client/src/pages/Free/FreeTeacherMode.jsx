import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Type, Save, ArrowLeft, Image as ImageIcon, Plus, Trash2, Layout, Maximize2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import './FreeTeacherMode.css';

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const FreeTeacherMode = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [items, setItems] = useState([]); // { id, content, type, width, fontSize }
    const [inputText, setInputText] = useState('');
    const [fontSizeScale, setFontSizeScale] = useState('M'); // S, M, L
    const [aspectRatio, setAspectRatio] = useState(16 / 9);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

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
    const handleDeleteItem = (id) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleSave = async () => {
        if (!title || !backgroundUrl) {
            alert('제목과 배경 이미지를 설정해주세요.');
            return;
        }
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com'}/api/free-drop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    backgroundUrl,
                    items: items.map(i => ({ ...i, isPlaced: false, x: 0, y: 0 })), // Always starts in tray for students
                    aspectRatio,
                    baseWidth: 1000
                })
            });
            const data = await response.json();
            if (data.success) {
                navigate(`/free-dnd/monitor/${data.problemId}`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
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

            {/* Main Layout: Left Tools | Center Workspace | Right Guide */}
            <main className="free-main-layout">
                {/* Left Sidebar: Tools */}
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

                        <div className="divider"></div>

                        <div className="form-group">
                            <label>배경 설정 (이미지/PDF)</label>
                            {!backgroundUrl ? (
                                <div
                                    className={`sidebar-upload-box ${isDraggingOver ? 'dragging' : ''}`}
                                    onClick={() => fileInputRef.current.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <Upload size={24} />
                                    <span>업로드 또는 드래그</span>
                                </div>
                            ) : (
                                <div className="sidebar-image-preview">
                                    <img src={backgroundUrl} alt="prev" />
                                    <button className="btn-small-outline" onClick={() => setBackgroundUrl('')}>변경</button>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} hidden onChange={(e) => handleFileUpload(e.target.files[0])} accept="image/*,.pdf" />
                        </div>

                        <div className="divider"></div>

                        <div className="form-group">
                            <label>텍스트 카드 추가</label>
                            <div className="input-with-button">
                                <input
                                    type="text"
                                    placeholder="내용 입력..."
                                    value={inputText}
                                    className="styled-input-mini"
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                                />
                                <button className="btn-add" onClick={handleAddText}>+</button>
                            </div>
                            <div className="font-size-group">
                                {['S', 'M', 'L'].map(scale => (
                                    <button
                                        key={scale}
                                        className={`btn-size-toggle ${fontSizeScale === scale ? 'active' : ''}`}
                                        onClick={() => setFontSizeScale(scale)}
                                    >
                                        {scale}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>이미지 카드 추가</label>
                            <button className="btn-sidebar-secondary" onClick={() => itemImageInputRef.current.click()}>
                                <ImageIcon size={18} /> 이미지 업로드
                            </button>
                            <input type="file" ref={itemImageInputRef} hidden onChange={handleAddImage} accept="image/*" />
                        </div>
                    </div>

                    <div className="sidebar-footer">
                        <button className="btn-save-all" onClick={handleSave}>
                            <Save size={18} /> 문제 생성 완료
                        </button>
                    </div>
                </aside>

                {/* Center: Workspace */}
                <section className="teacher-workspace">
                    <section className="tray-management-area">
                        <div className="tray-header">
                            <Layout size={18} />
                            <span>생성된 카드 목록 (미리보기)</span>
                        </div>
                        <div className="tray-grid">
                            {items.length === 0 && (
                                <div className="empty-tray-msg">생성된 카드가 없습니다.</div>
                            )}
                            {items.map(item => (
                                <div key={item.id} className={`tray-edit-card ${item.type}`}>
                                    <div className="card-preview">
                                        {item.type === 'text' ? (
                                            <div style={{ fontSize: '12px' }}>{item.content}</div>
                                        ) : (
                                            <img
                                                src={item.imageUrl}
                                                alt="item"
                                                draggable="false"
                                                style={{ width: '100%' }}
                                            />
                                        )}
                                    </div>
                                    <div className="card-controls">
                                        {item.type === 'image' && (
                                            <input
                                                type="range"
                                                min="5" max="100"
                                                value={item.width}
                                                onChange={(e) => updateItemWidth(item.id, parseInt(e.target.value))}
                                                className="mini-range"
                                            />
                                        )}
                                        <button className="btn-delete-item" onClick={() => handleDeleteItem(item.id)}>×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="preview-area">
                        <div className="preview-label">배경 미리보기</div>
                        <div className="preview-container">
                            {!backgroundUrl ? (
                                <div className="no-bg-overlay">
                                    <ImageIcon size={48} />
                                    <p>배경 이미지가 없습니다.</p>
                                </div>
                            ) : (
                                <img src={backgroundUrl} alt="background" className="canvas-bg-img" />
                            )}
                        </div>
                    </section>
                </section>

                {/* Right Sidebar: Guide */}
                <aside className="guide-sidebar">
                    <div className="guide-card">
                        <h3>어떻게 만드나요? ☁️</h3>
                        <div className="guide-steps">
                            <div className="guide-step-item active">
                                <div className="step-num">1</div>
                                <div className="step-info">
                                    <h4>배경 설정</h4>
                                    <p>학습지나 이미지를<br />배경으로 업로드하세요.</p>
                                </div>
                            </div>
                            <div className="guide-step-item active">
                                <div className="step-num">2</div>
                                <div className="step-info">
                                    <h4>카드 추가</h4>
                                    <p>학생들이 움직일<br />텍스트/이미지 카드를 만드세요.</p>
                                </div>
                            </div>
                            <div className="guide-step-item active">
                                <div className="step-num">3</div>
                                <div className="step-info">
                                    <h4>저장 & 공유</h4>
                                    <p>완료 후 PIN 번호로<br />수업을 시작하세요!</p>
                                </div>
                            </div>
                        </div>

                        <div className="tip-box">
                            <h5>💡 디디의 꿀팁</h5>
                            <p><strong>PDF 파일</strong>을 업로드하면<br />첫 페이지가 자동으로 배경이 됩니다!</p>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default FreeTeacherMode;
