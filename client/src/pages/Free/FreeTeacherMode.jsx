import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Type, Save, ArrowLeft, Image as ImageIcon, Plus, Trash2, Layout, Maximize2, Loader2, Check, Copy } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import ProblemMonitor from '../FillBlanks/ProblemMonitor';
import './FreeTeacherMode.css';
import SubjectGradeSelector from '../../components/SubjectGradeSelector';
import LatexPreviewHint from '../../components/LatexPreviewHint';
import DidiTipLatexOcrButton from '../../components/ImageToLatex/DidiTipLatexOcrButton';
import { resolveApiUrl } from '../../utils/url';
import { WHITEBOARD_PRESETS, getPresetBackgroundStyle } from '../../utils/whiteboardPresets';
import { DEFAULT_TABLE_CONFIG, normalizeTableConfig } from '../../utils/tableBackground';
import FreeBoardCanvasBackground from '../../components/FreeBoardCanvasBackground';
import TableBackgroundConfig from '../../components/TableBackgroundConfig';

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const IMAGE_SIZE_MAP = { S: 15, M: 30, L: 50, XL: 80 };

const CanvasImagePreviewLayer = ({ item }) => {
    if (!item || item.type !== 'image') return null;

    return (
        <div className="canvas-preview-layer">
            <div
                className="canvas-preview-item canvas-preview-item--solo"
                style={{ width: `${item.width}%` }}
            >
                <img src={resolveApiUrl(item.imageUrl)} alt="preview" draggable="false" />
                <span className="preview-size-badge">{item.width}%</span>
            </div>
        </div>
    );
};

const FreeTeacherMode = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [step, setStep] = useState('input'); // input, monitor
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [backgroundType, setBackgroundType] = useState('blank');
    const [tableConfig, setTableConfig] = useState(DEFAULT_TABLE_CONFIG);
    const [tableConfigOpen, setTableConfigOpen] = useState(true);
    const [items, setItems] = useState([]); // { id, content, type, width, fontSize }
    const [isPublic, setIsPublic] = useState(false);
    const { currentUser, nickname } = useAuth();
    const [inputText, setInputText] = useState('');
    const [fontSizeScale, setFontSizeScale] = useState('M'); // S, M, L
    const [imageSizeScale, setImageSizeScale] = useState('M');
    const [selectedImageItemId, setSelectedImageItemId] = useState(null);
    const [aspectRatio, setAspectRatio] = useState(16 / 9);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [allowReuse, setAllowReuse] = useState(false);
    const [createdProblem, setCreatedProblem] = useState(null);
    const [subject, setSubject] = useState('');
    const [schoolLevel, setSchoolLevel] = useState('');
    const [grade, setGrade] = useState('');
    const { id } = useParams();
    const [prevPin, setPrevPin] = useState('');
    const [bgScale, setBgScale] = useState(1); // 배경 이미지 확대/축소 배율

    // 로그인 체크
    useEffect(() => {
        if (!currentUser) {
            alert('선생님 기능은 로그인이 필요합니다. 로그인 페이지로 이동합니다.');
            navigate('/teacher/login');
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        if (id) {
            fetchProblemForEdit(id);
        }
    }, [id]);

    const fetchProblemForEdit = async (problemId) => {
        try {
            const docRef = doc(db, 'problems', problemId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setTitle(data.title);
                setBackgroundUrl(data.backgroundUrl || '');
                setBackgroundType(data.backgroundType || 'blank');
                setTableConfig(normalizeTableConfig(data.tableConfig || DEFAULT_TABLE_CONFIG));
                setItems(data.items || []);
                setAspectRatio(data.aspectRatio || 16 / 9);
                setIsPublic(data.isPublic || false);
                setAllowReuse(data.allowReuse || false);
                setSubject(data.subject || '');
                setSchoolLevel(data.schoolLevel || '');
                setGrade(data.grade || '');
                setPrevPin(data.pinNumber);
                setBgScale(data.bgScale || 1);
            }
        } catch (error) {
            console.error("Error fetching problem for edit:", error);
            alert("문제 정보를 불러오는 중 오류가 발생했습니다.");
        }
    };

    const handleSelectPreset = (presetId) => {
        setBackgroundUrl('');
        setBackgroundType(presetId);
        if (presetId === 'table') {
            setTableConfig((prev) => normalizeTableConfig(prev));
            setTableConfigOpen(true);
        }
    };

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

                    // 서버 프록시 업로드 사용
                    console.log('[DEBUG] Starting background upload via proxy...');
                    const formData = new FormData();
                    formData.append('file', blob, `bg_${Date.now()}.png`);
                    formData.append('folder', 'problems');

                    const uploadUrl = resolveApiUrl('/api/upload');
                    console.log('[DEBUG] Upload URL:', uploadUrl);

                    const response = await fetch(uploadUrl, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('[DEBUG] Upload response not OK:', response.status, errorText);
                        throw new Error(`서버 응답 오류 (상태: ${response.status})`);
                    }

                    const result = await response.json();
                    console.log('[DEBUG] Upload result:', result);

                    if (result.success) {
                        setBackgroundUrl(result.url);
                        setAspectRatio(viewport.width / viewport.height);
                    } else {
                        throw new Error(result.message || '업로드 실패');
                    }
                } catch (err) {
                    console.error('[DEBUG] Detailed upload error:', err);
                    alert('배경 이미지 설정 중 오류 발생: ' + err.message + '\n콘솔(F12)을 확인해주세요.');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            try {
                // 서버 프록시 업로드 사용
                console.log('[DEBUG] Starting image upload via proxy...');
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', 'problems');

                const uploadUrl = resolveApiUrl('/api/upload');
                console.log('[DEBUG] Upload URL:', uploadUrl);

                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[DEBUG] Upload response not OK:', response.status, errorText);
                    throw new Error(`서버 응답 오류 (상태: ${response.status})`);
                }

                const result = await response.json();
                console.log('[DEBUG] Upload result:', result);

                if (result.success) {
                    const downloadUrl = result.url;
                    setBackgroundUrl(downloadUrl);
                    setBgScale(1);
                    const img = new Image();
                    img.onload = () => setAspectRatio(img.naturalWidth / img.naturalHeight);
                    img.src = downloadUrl;
                } else {
                    throw new Error(result.message || '업로드 실패');
                }
            } catch (error) {
                console.error('[DEBUG] Detailed upload error:', error);
                alert('배경 이미지 업로드 오류: ' + error.message + '\n콘솔(F12)을 확인해주세요.');
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
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            console.log(`[DEBUG] Starting ${files.length} item image upload(s) via proxy...`);

            // Loop through all selected files
            const uploadPromises = files.map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', 'problems');

                const uploadUrl = resolveApiUrl('/api/upload');
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`업로드 실패: ${file.name} (상태: ${response.status})`);
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message || `${file.name} 업로드 실패`);
                }

                return {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    type: 'image',
                    imageUrl: result.url,
                    width: IMAGE_SIZE_MAP[imageSizeScale] || 30,
                };
            });

            const newItems = await Promise.all(uploadPromises);
            setItems(prev => [...prev, ...newItems]);
            console.log(`[DEBUG] Successfully uploaded ${newItems.length} items.`);

        } catch (error) {
            console.error('[DEBUG] Detailed multiple upload error:', error);
            alert('이미지 추가 중 오류 발생: ' + error.message + '\n콘솔(F12)을 확인해주세요.');
        }
        e.target.value = ''; // Reset input so same file can be selected again
    };

    const updateItemWidth = (id, newWidth) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, width: newWidth } : item
        ));
    };

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
        if (selectedImageItemId === id) {
            setSelectedImageItemId(null);
        }
    };

    const handleSelectImageItem = (id) => {
        setSelectedImageItemId((prev) => (prev === id ? null : id));
    };

    const selectedImageItem = items.find(
        (item) => item.id === selectedImageItemId && item.type === 'image'
    );
    const handleSave = async () => {
        const hasBackground = Boolean(backgroundUrl) || backgroundType !== 'blank';
        if (!title || (!hasBackground && items.length === 0)) {
            alert('제목을 입력하고 배경이나 카드를 하나 이상 설정해주세요.');
            return;
        }
        if (!title) {
            alert('제목을 입력해주세요.');
            return;
        }
        if (!subject) {
            alert('과목을 선택해주세요. (필수)');
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

            // 편집 모드면 기존 ID와 PIN 사용
            const problemId = id || Math.random().toString(36).substr(2, 9);
            const pinNumber = id ? prevPin : Math.floor(100000 + Math.random() * 900000).toString();

            const newProblem = {
                id: problemId,
                type: 'free-drop',
                pinNumber,
                title,
                backgroundUrl,
                backgroundType,
                tableConfig: backgroundType === 'table' ? normalizeTableConfig(tableConfig) : null,
                items: items.map(i => ({ ...i, isPlaced: false, x: 0, y: 0 })), // 학생용 초기 상태
                aspectRatio,
                baseWidth: 1000,
                teacherId: currentUser.uid,
                teacherDisplayName: nickname || '선생님',
                isPublic,
                allowReuse,
                subject: subject || null,
                schoolLevel,
                grade: grade || null,
                bgScale: bgScale || 1,
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
                        <div className="free-top-meta-bar">
                            <div className="free-meta-field free-meta-title">
                                <label htmlFor="free-problem-title">문제 제목</label>
                                <input
                                    id="free-problem-title"
                                    type="text"
                                    placeholder="제목을 입력하세요"
                                    value={title}
                                    className="styled-input-mini"
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                                <LatexPreviewHint text={title} compact />
                            </div>
                            <SubjectGradeSelector
                                layout="horizontal"
                                subject={subject}
                                setSubject={setSubject}
                                schoolLevel={schoolLevel}
                                setSchoolLevel={setSchoolLevel}
                                grade={grade}
                                setGrade={setGrade}
                            />
                            <div className="free-top-guide-inline">
                                <span className="guide-inline-label">만드는 방법</span>
                                <div className="guide-inline-steps">
                                    <span><b>1</b> 배경</span>
                                    <span><b>2</b> 카드</span>
                                    <span><b>3</b> 저장</span>
                                </div>
                                <div className="guide-inline-tip">
                                    <span className="guide-inline-tip-text">💡 PDF 1페이지</span>
                                    <DidiTipLatexOcrButton />
                                </div>
                            </div>
                        </div>

                        <div className="workspace-container-flex">
                            {/* Left Sidebar: Tools & List */}
                            <aside className="tool-sidebar">
                                <div className="sidebar-content">
                                    <div className="card-add-container">
                                        <div className="card-type-section text-type">
                                            <div className="section-label">
                                                <span><Type size={16} /> 텍스트 카드</span>
                                            </div>
                                            <div className="input-with-button">
                                                <input
                                                    type="text"
                                                    placeholder="내용을 입력하세요..."
                                                    value={inputText}
                                                    className="styled-input-mini"
                                                    onChange={(e) => setInputText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                                                />
                                                <button className="btn-add-circle" onClick={handleAddText} title="추가"><Plus size={20} /></button>
                                            </div>
                                            <div className="font-size-group">
                                                {[{ scale: 'S', px: 16 }, { scale: 'M', px: 24 }, { scale: 'L', px: 32 }].map(({ scale, px }) => (
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

                                        <div className="card-type-section image-type">
                                            <div className="section-label"><ImageIcon size={16} /> 이미지 카드</div>
                                            <div className="font-size-group image-size-preset-group">
                                                {['S', 'M', 'L', 'XL'].map((scale) => (
                                                    <button
                                                        key={scale}
                                                        type="button"
                                                        className={`btn-size-toggle ${imageSizeScale === scale ? 'active' : ''}`}
                                                        onClick={() => setImageSizeScale(scale)}
                                                    >
                                                        {scale}
                                                    </button>
                                                ))}
                                            </div>
                                            <button className="btn-sidebar-primary-large" onClick={() => itemImageInputRef.current.click()}>
                                                <Upload size={18} /> 이미지 업로드 (다중 선택 가능)
                                            </button>
                                            <p className="image-upload-hint">기본 크기 {IMAGE_SIZE_MAP[imageSizeScale]}% · 목록에서 카드를 클릭하면 캔버스 미리보기</p>
                                            <input type="file" ref={itemImageInputRef} hidden onChange={handleAddImage} accept="image/*" multiple />
                                        </div>
                                    </div>

                                    <div className="reuse-toggle-box">
                                        <label className="toggle-label reuse-label">
                                            <input
                                                type="checkbox"
                                                checked={allowReuse}
                                                onChange={(e) => setAllowReuse(e.target.checked)}
                                            />
                                            <Copy size={14} />
                                            <span className="toggle-text">카드 복사 허용 (여러 번 사용)</span>
                                        </label>
                                    </div>

                                    <div className="sidebar-tray-header">
                                        <Layout size={16} /> 생성된 카드 목록 ({items.length})
                                    </div>
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
                                                <div
                                                    className={`tray-image-card ${selectedImageItemId === item.id ? 'is-selected' : ''}`}
                                                    onClick={() => handleSelectImageItem(item.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleSelectImageItem(item.id);
                                                        }
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                    title="클릭하여 캔버스 크기 미리보기"
                                                >
                                                    <div
                                                        className="tray-image-thumb"
                                                        style={{ width: `${Math.min(100, Math.max(45, item.width * 2.2))}%` }}
                                                    >
                                                        <img src={resolveApiUrl(item.imageUrl)} alt="item" />
                                                        <div className="tray-image-size-label">{item.width}%</div>
                                                    </div>
                                                    <div className="tray-image-controls" onClick={(e) => e.stopPropagation()}>
                                                        <div className="image-size-buttons">
                                                            {['S', 'M', 'L', 'XL'].map(s => (
                                                                <button
                                                                    key={s}
                                                                    className={`btn-img-size ${getImageSizeLabel(item.width) === s ? 'active' : ''}`}
                                                                    onClick={() => updateItemWidthByScale(item.id, s)}
                                                                >{s}</button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            className="btn-delete-mini"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteItem(item.id);
                                                            }}
                                                        >×</button>
                                                    </div>
                                                    <div className="image-slider-row" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="range"
                                                            min="5"
                                                            max="100"
                                                            value={item.width}
                                                            className="image-size-slider"
                                                            onChange={(e) => updateItemWidth(item.id, parseInt(e.target.value))}
                                                        />
                                                        <span className="slider-value">{item.width}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="sidebar-footer">
                                    <div className="visibility-toggle">
                                        <label className="toggle-label">
                                            <input
                                                type="checkbox"
                                                checked={isPublic}
                                                onChange={(e) => setIsPublic(e.target.checked)}
                                            />
                                            <span className="toggle-text">&nbsp; 다른 선생님께 이 문제 공개하기</span>
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
                                <section className={`center-preview-area${!backgroundUrl && backgroundType === 'blank' ? ' setup-mode' : ''}`}>
                                    {!backgroundUrl && backgroundType === 'blank' ? (
                                        <div className="free-bg-setup-stack">
                                            {/* 배경 프리셋 선택 */}
                                            <div className="free-bg-preset-panel">
                                                <div className="free-bg-preset-title">📋 배경 스타일 선택</div>
                                                <div className="wb-preset-grid">
                                                    {WHITEBOARD_PRESETS.map((preset) => {
                                                        if (preset.id === 'custom') return null;
                                                        const isActive = backgroundType === preset.id && !backgroundUrl;
                                                        return (
                                                            <button
                                                                key={preset.id}
                                                                type="button"
                                                                className={`wb-preset-btn ${isActive ? 'active' : ''}`}
                                                                onClick={() => handleSelectPreset(preset.id)}
                                                            >
                                                                <div className="wb-preset-thumb" style={getPresetBackgroundStyle(preset.id)} />
                                                                <span className="wb-preset-label">{preset.emoji} {preset.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div className="free-bg-preset-divider">— 또는 이미지 직접 업로드 —</div>
                                            </div>
                                            {/* 이미지 업로드 존 */}
                                            <div
                                                className={`center-upload-zone ${isDraggingOver ? 'dragging' : ''}`}
                                                onClick={() => fileInputRef.current.click()}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                            >
                                                <div className="upload-icon-circle">
                                                    <Upload size={36} color="#E6B400" />
                                                </div>
                                                <h3>배경 이미지 업로드</h3>
                                                <p>클릭하거나 이미지를 여기로 드래그하세요</p>
                                                <span className="upload-hint">JPG, PNG, PDF 지원 (PDF는 1페이지만)</span>
                                            </div>
                                        </div>
                                    ) : !backgroundUrl ? (
                                        <div className="canvas-wrapper">
                                            <FreeBoardCanvasBackground
                                                backgroundType={backgroundType}
                                                tableConfig={tableConfig}
                                                aspectRatio={aspectRatio}
                                                minHeight={300}
                                            />
                                            <CanvasImagePreviewLayer item={selectedImageItem} />
                                            {backgroundType === 'table' && tableConfigOpen && (
                                                <div className="table-bg-config-overlay">
                                                    <TableBackgroundConfig
                                                        config={tableConfig}
                                                        onChange={setTableConfig}
                                                        onClose={() => setTableConfigOpen(false)}
                                                    />
                                                </div>
                                            )}
                                            {backgroundType === 'table' && !tableConfigOpen && (
                                                <button
                                                    type="button"
                                                    className="table-bg-config-reopen"
                                                    onClick={() => setTableConfigOpen(true)}
                                                >
                                                    📊 표 설정
                                                </button>
                                            )}
                                            <div className="canvas-overlay-tools">
                                                <button
                                                    className="btn-change-bg-prominent"
                                                    onClick={() => { setBackgroundType('blank'); setBackgroundUrl(''); setTableConfig(DEFAULT_TABLE_CONFIG); }}
                                                >
                                                    <ImageIcon size={18} /> 배경 다시 선택하기
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="canvas-wrapper">
                                            <img
                                                src={resolveApiUrl(backgroundUrl)}
                                                alt="background"
                                                className="canvas-bg-img"
                                                style={{ transform: `scale(${bgScale})` }}
                                            />
                                            <CanvasImagePreviewLayer item={selectedImageItem} />
                                            <div className="canvas-overlay-tools">
                                                <div className="zoom-control-panel">
                                                    <span className="zoom-label">배경 확대/축소</span>
                                                    <input
                                                        type="range"
                                                        min="0.5"
                                                        max="3.0"
                                                        step="0.1"
                                                        value={bgScale}
                                                        onChange={(e) => setBgScale(parseFloat(e.target.value))}
                                                        className="zoom-slider"
                                                    />
                                                    <span className="zoom-value">{Math.round(bgScale * 100)}%</span>
                                                    <button className="btn-zoom-reset" onClick={() => setBgScale(1)}>리셋</button>
                                                </div>
                                                <button className="btn-change-bg-prominent" onClick={() => { setBackgroundUrl(''); setBackgroundType('blank'); setBgScale(1); }}>
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
                                <button className="btn-save-all" onClick={() => navigate(`/teacher/monitor/${createdProblem.id}`)} style={{ width: 'auto', padding: '0.8rem 1.5rem' }}>
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
        </div >
    );
};

export default FreeTeacherMode;
