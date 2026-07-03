import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Pen, Trash2 } from 'lucide-react';
import { resolveApiUrl } from '../../utils/url';
import { getPresetBackgroundStyle } from '../../utils/whiteboardPresets';
import { PAINT_PALETTE, PEN_SIZES, ERASER_SIZE_MULTIPLIER } from '../../utils/whiteboardTools';
import './WhiteboardDrawSurface.css';

const WhiteboardDrawSurface = ({
    backgroundType = 'blank',
    backgroundUrl = null,
    question = '',
    onSnapshot,
    fullScreen = false,
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const drawingRef = useRef(false);
    const [tool, setTool] = useState('pen');
    const [primaryColor, setPrimaryColor] = useState('#000000');
    const [secondaryColor, setSecondaryColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(8);
    const [canvasKey, setCanvasKey] = useState(0);

    const presetStyle = backgroundUrl ? {} : getPresetBackgroundStyle(backgroundType);
    const isEraser = tool === 'eraser';

    const setupContext = useCallback((ctx) => {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const dpr = window.devicePixelRatio || 1;
        const displayW = rect.width;
        const displayH = rect.height;

        let saved = null;
        if (canvas.width > 0 && canvas.height > 0) {
            saved = document.createElement('canvas');
            saved.width = displayW;
            saved.height = displayH;
            const sctx = saved.getContext('2d');
            sctx.drawImage(canvas, 0, 0, displayW, displayH);
        }

        canvas.width = Math.round(displayW * dpr);
        canvas.height = Math.round(displayH * dpr);
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        setupContext(ctx);

        if (saved) {
            ctx.drawImage(saved, 0, 0, displayW, displayH);
        }
    }, [setupContext]);

    useEffect(() => {
        resizeCanvas();
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => resizeCanvas());
        observer.observe(container);
        window.addEventListener('resize', resizeCanvas);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [resizeCanvas, canvasKey]);

    useEffect(() => {
        setCanvasKey((k) => k + 1);
    }, [backgroundType, backgroundUrl]);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches?.[0]?.clientX ?? e.clientX;
        const clientY = e.touches?.[0]?.clientY ?? e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const submitSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !onSnapshot) return;
        onSnapshot(canvas.toDataURL('image/png'));
    }, [onSnapshot]);

    const startDrawing = (e) => {
        if (e.cancelable) e.preventDefault();
        canvasRef.current?.setPointerCapture(e.pointerId);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        drawingRef.current = true;
    };

    const draw = (e) => {
        if (!drawingRef.current) return;
        if (e.cancelable) e.preventDefault();
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');

        if (isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = lineWidth * ERASER_SIZE_MULTIPLIER;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = lineWidth;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.closePath();
            ctx.globalCompositeOperation = 'source-over';
        }
        submitSnapshot();
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        submitSnapshot();
    };

    const handleColorClick = (color, useSecondary = false) => {
        if (useSecondary) {
            setSecondaryColor(color);
            setPrimaryColor(color);
        } else {
            setPrimaryColor(color);
        }
        setTool('pen');
    };

    const handleColorContextMenu = (e, color) => {
        e.preventDefault();
        setSecondaryColor(color);
    };

    useEffect(() => {
        const prevent = (e) => {
            if (containerRef.current?.contains(e.target)) e.preventDefault();
        };
        document.addEventListener('touchmove', prevent, { passive: false });
        return () => document.removeEventListener('touchmove', prevent);
    }, []);

    return (
        <div className={`wb-draw-root ${fullScreen ? 'wb-draw-root--fullscreen' : ''}`}>
            {question?.trim() && (
                <div className="wb-draw-question">{question}</div>
            )}

            <div className="wb-draw-workspace">
                <aside className="wb-paint-palette" aria-label="그리기 도구">
                    <div className="wb-paint-tools">
                        <button
                            type="button"
                            className={`wb-paint-tool ${tool === 'pen' ? 'active' : ''}`}
                            onClick={() => setTool('pen')}
                            title="펜 (P)"
                        >
                            <Pen size={18} />
                        </button>
                        <button
                            type="button"
                            className={`wb-paint-tool ${tool === 'eraser' ? 'active' : ''}`}
                            onClick={() => setTool('eraser')}
                            title="지우개 (E)"
                        >
                            <Eraser size={18} />
                        </button>
                        <button
                            type="button"
                            className="wb-paint-tool wb-paint-tool--danger"
                            onClick={handleClear}
                            title="전체 지우기"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <div className="wb-paint-sizes" aria-label="펜 굵기">
                        {PEN_SIZES.map(({ id, size, label }) => (
                            <button
                                key={id}
                                type="button"
                                className={`wb-paint-size-btn ${lineWidth === size && !isEraser ? 'active' : ''}`}
                                onClick={() => { setLineWidth(size); setTool('pen'); }}
                                title={`${label} (${size}px)`}
                            >
                                <span
                                    className="wb-paint-size-dot"
                                    style={{ width: Math.min(size, 20), height: Math.min(size, 20) }}
                                />
                            </button>
                        ))}
                    </div>

                    <div className="wb-paint-colors-wrap">
                        <div className="wb-paint-primary-box" title="왼쪽 클릭: 주 색 / 우클릭: 보조 색">
                            <div className="wb-paint-primary" style={{ background: primaryColor }} />
                            <div className="wb-paint-secondary" style={{ background: secondaryColor }} />
                        </div>
                        <div className="wb-paint-color-grid">
                            {PAINT_PALETTE.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`wb-paint-color-swatch ${primaryColor === color ? 'active' : ''}`}
                                    style={{ background: color }}
                                    onClick={() => handleColorClick(color)}
                                    onContextMenu={(e) => handleColorContextMenu(e, color)}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                </aside>

                <div className="wb-draw-stage">
                    <div
                        ref={containerRef}
                        className="wb-draw-canvas-wrap"
                        style={presetStyle}
                    >
                        {backgroundUrl && (
                            <img
                                src={resolveApiUrl(backgroundUrl)}
                                alt=""
                                className="wb-draw-bg-image"
                            />
                        )}
                        <canvas
                            ref={canvasRef}
                            onPointerDown={startDrawing}
                            onPointerMove={draw}
                            onPointerUp={stopDrawing}
                            onPointerLeave={stopDrawing}
                            onPointerCancel={stopDrawing}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhiteboardDrawSurface;
