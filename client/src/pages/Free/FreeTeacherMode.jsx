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
    const [items, setItems] = useState([]); // { id, x, y, content, type, isPlaced, width }
    const [inputText, setInputText] = useState('');
    const [fontSize, setFontSize] = useState(16);
    const [aspectRatio, setAspectRatio] = useState(16 / 9);

    const fileInputRef = useRef(null);
    const itemImageInputRef = useRef(null);
    const canvasRef = useRef(null);
    const [draggingId, setDraggingId] = useState(null);
    const [resizingId, setResizingId] = useState(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const initialResizeData = useRef({ width: 0, startX: 0 });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            console.log('PDF file detected, starting conversion...');
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const typedarray = new Uint8Array(event.target.result);
                    const loadingTask = pdfjsLib.getDocument({ data: typedarray });
                    const pdf = await loadingTask.promise;
                    console.log('PDF document loaded, pages:', pdf.numPages);

                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for quality
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    console.log('Page 1 rendered to canvas');
                    const dataUrl = canvas.toDataURL('image/png');

                    const blob = await (await fetch(dataUrl)).blob();
                    const formData = new FormData();
                    formData.append('image', blob, 'pdf-bg.png');

                    const response = await fetch('http://localhost:3000/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success) {
                        console.log('Converted PDF background uploaded:', data.url);
                        setBackgroundUrl(data.url);
                        setAspectRatio(viewport.width / viewport.height);
                    }
                } catch (err) {
                    console.error('PDF Processing Error:', err);
                    alert('PDF 변환 중 오류가 발생했습니다: ' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('http://localhost:3000/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    setBackgroundUrl(data.url);
                    const img = new Image();
                    img.onload = () => {
                        setAspectRatio(img.naturalWidth / img.naturalHeight);
                    };
                    img.src = data.url;
                }
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleAddText = () => {
        if (!inputText.trim()) return;
        const newItem = {
            id: Date.now().toString(),
            type: 'text',
            content: inputText,
            fontSize: fontSize,
            x: 50,
            y: 50,
            isPlaced: false,
            width: 15 // Default relative width in %
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
            const response = await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                const newItem = {
                    id: Date.now().toString(),
                    type: 'image',
                    imageUrl: data.url,
                    x: 50,
                    y: 50,
                    isPlaced: false,
                    width: 15 // %
                };
                setItems([...items, newItem]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const startResizing = (e, id) => {
        e.stopPropagation();
        e.preventDefault();
        const item = items.find(i => i.id === id);
        if (!item) return;
        setResizingId(id);
        initialResizeData.current = {
            width: item.width || 15,
            startX: e.clientX
        };
    };

    const handleMouseDown = (e, id, fromTray = false) => {
        e.stopPropagation();
        const item = items.find(i => i.id === id);
        if (!item) return;

        setDraggingId(id);

        if (fromTray || !item.isPlaced) {
            dragOffset.current = { x: 0, y: 0 };
        } else {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const pxX = (item.x / 100) * canvasRect.width;
            const pxY = (item.y / 100) * canvasRect.height;
            dragOffset.current = {
                x: e.clientX - canvasRect.left - pxX,
                y: e.clientY - canvasRect.top - pxY
            };
        }
    };

    const handleMouseMove = (e) => {
        if (resizingId) {
            const deltaX = e.clientX - initialResizeData.current.startX;
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const deltaPercent = (deltaX / canvasRect.width) * 100;

            setItems(prev => prev.map(item =>
                item.id === resizingId ? {
                    ...item,
                    width: Math.max(5, Math.min(initialResizeData.current.width + deltaPercent, 80))
                } : item
            ));
            return;
        }

        if (!draggingId || !canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const isOverCanvas = (
            e.clientX >= canvasRect.left &&
            e.clientX <= canvasRect.right && e.clientY >= canvasRect.top &&
            e.clientY <= canvasRect.bottom
        );

        if (isOverCanvas) {
            const newXPercent = ((e.clientX - canvasRect.left - dragOffset.current.x) / canvasRect.width) * 100;
            const newYPercent = ((e.clientY - canvasRect.top - dragOffset.current.y) / canvasRect.height) * 100;

            setItems(prev => prev.map(item =>
                item.id === draggingId ? {
                    ...item,
                    x: Math.max(0, Math.min(newXPercent, 100)),
                    y: Math.max(0, Math.min(newYPercent, 100)),
                    isPlaced: true
                } : item
            ));
        }
    };

    const handleMouseUp = () => {
        setDraggingId(null);
        setResizingId(null);
    };

    const handleDeleteItem = (id) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleSave = async () => {
        if (!title || !backgroundUrl) {
            alert('제목과 배경 이미지를 설정해주세요.');
            return;
        }
        // Only save placed items? Or all? 
        // Typically all, but students only see what's set.
        try {
            const response = await fetch('http://localhost:3000/api/free-drop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    backgroundUrl,
                    items, // Now includes isPlaced
                    aspectRatio,
                    baseWidth: canvasRef.current?.offsetWidth || 1000
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
        <div className="free-teacher-wrapper" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            {/* Sidebar */}
            <aside className="teacher-sidebar">
                <div className="sidebar-header">
                    <button onClick={() => navigate('/')} className="btn-icon-text">
                        <ArrowLeft size={18} /> 뒤로가기
                    </button>
                    <h3>설정 패널</h3>
                </div>

                <div className="sidebar-content">
                    <div className="form-group">
                        <label>문제 제목</label>
                        <input
                            type="text"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>배경 이미지</label>
                        {!backgroundUrl ? (
                            <div className="sidebar-upload-box" onClick={() => fileInputRef.current.click()}>
                                <Upload size={24} />
                                <span>이미지 선택</span>
                            </div>
                        ) : (
                            <div className="sidebar-image-preview">
                                <img src={backgroundUrl} alt="prev" />
                                <button className="btn-small-outline" onClick={() => setBackgroundUrl('')}>변경</button>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*,.pdf" />
                    </div>

                    <div className="divider"></div>

                    <div className="form-group">
                        <label>텍스트 카드 추가</label>
                        <div className="input-with-button">
                            <input
                                type="text"
                                placeholder="내용 입력..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                            />
                            <button className="btn-add" onClick={handleAddText}><Plus size={18} /></button>
                        </div>
                        <div className="font-size-row">
                            <Type size={14} />
                            <input
                                type="number"
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                min="10" max="80"
                            />
                            <span>px</span>
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
                        <Save size={18} /> 문제 생성하기
                    </button>
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="teacher-workspace">
                {/* Item Tray */}
                <section className="item-tray-section">
                    <div className="tray-header">
                        <Layout size={16} />
                        <span>생성된 카드 보관함 (여기에 있는 카드를 아래 배경으로 끌어다 놓으세요)</span>
                    </div>
                    <div className="item-tray">
                        {items.filter(i => !i.isPlaced).length === 0 && (
                            <div className="empty-tray-msg">생성된 카드가 없습니다. 사이드바에서 카드를 추가해보세요.</div>
                        )}
                        {items.filter(i => !i.isPlaced).map(item => (
                            <div
                                key={item.id}
                                className={`tray-item ${item.type}`}
                                onMouseDown={(e) => handleMouseDown(e, item.id, true)}
                                style={{
                                    fontSize: item.type === 'text' ? `${item.fontSize}px` : 'inherit',
                                    opacity: draggingId === item.id ? 0.5 : 1
                                }}
                            >
                                {item.type === 'text' ? item.content : <img src={item.imageUrl} alt="item" draggable="false" />}
                                <button className="item-del-btn" onClick={() => handleDeleteItem(item.id)}>×</button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Canvas Area */}
                <section className="canvas-workspace">
                    {!backgroundUrl ? (
                        <div className="no-bg-overlay">
                            <ImageIcon size={64} />
                            <p>배경 이미지를 먼저 업로드해주세요.</p>
                        </div>
                    ) : (
                        <div className="canvas-container-box" style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
                            <img
                                src={backgroundUrl}
                                alt="background"
                                className="canvas-bg-img"
                                style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }}
                            />
                            <div
                                className="master-canvas"
                                ref={canvasRef}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%'
                                }}
                            >
                                {items.filter(i => i.isPlaced).map(item => (
                                    <div
                                        key={item.id}
                                        className={`placed-item ${item.type}`}
                                        onMouseDown={(e) => handleMouseDown(e, item.id)}
                                        style={{
                                            left: `${item.x}%`,
                                            top: `${item.y}%`,
                                            width: item.type === 'image' ? `${item.width || 15}%` : 'auto',
                                            fontSize: item.type === 'text' ? `${item.fontSize}px` : 'inherit',
                                            zIndex: draggingId === item.id ? 1000 : 10,
                                            transform: 'translate(-50%, -50%)',
                                            opacity: draggingId === item.id ? 0.8 : 1
                                        }}
                                    >
                                        {item.type === 'text' ? item.content : <img src={item.imageUrl} alt="item" style={{ width: '100%' }} draggable="false" />}
                                        <button className="item-del-btn" onClick={() => handleDeleteItem(item.id)}>×</button>

                                        {item.type === 'image' && (
                                            <div
                                                className="resize-handle"
                                                onMouseDown={(e) => startResizing(e, item.id)}
                                            >
                                                <Maximize2 size={12} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default FreeTeacherMode;
