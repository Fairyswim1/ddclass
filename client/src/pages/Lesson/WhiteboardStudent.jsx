import React, { useRef, useState, useEffect } from 'react';
import { resolveApiUrl } from '../../utils/url';
import { Eraser, Pen, Trash2 } from 'lucide-react';
import './LessonShared.css';

const WhiteboardStudent = ({ lessonProblemData, lessonRoomId, lessonNickname, lessonSocket }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [isEraser, setIsEraser] = useState(false);

    const { backgroundUrl } = lessonProblemData;

    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            if (canvas.width !== container.clientWidth) {
                canvas.width = container.clientWidth;
                canvas.height = Math.max(container.clientHeight, 500);

                const ctx = canvas.getContext('2d');
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    useEffect(() => {
        handleClear();
    }, [lessonProblemData.id]);

    const startDrawing = (e) => {
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');

        ctx.strokeStyle = isEraser ? '#ffffff' : color;
        if (isEraser && backgroundUrl) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = lineWidth * 3;
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.lineWidth = lineWidth;
        }

        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const ctx = canvasRef.current.getContext('2d');
        ctx.closePath();
        ctx.globalCompositeOperation = "source-over";
        submitSnapshot();
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        if (e.touches && e.touches.length > 0) {
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        }
        return {
            offsetX: e.nativeEvent.offsetX,
            offsetY: e.nativeEvent.offsetY
        };
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        submitSnapshot();
    };

    const submitSnapshot = () => {
        if (lessonSocket && lessonRoomId) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            lessonSocket.emit('submitLessonAnswer', {
                lessonId: lessonRoomId,
                studentName: lessonNickname,
                answer: { type: 'image', data: dataUrl }
            });
        }
    };

    useEffect(() => {
        const preventScroll = (e) => {
            if (e.target === canvasRef.current) {
                e.preventDefault();
            }
        };
        document.addEventListener('touchmove', preventScroll, { passive: false });
        return () => document.removeEventListener('touchmove', preventScroll);
    }, []);

    return (
        <div className="student-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', padding: '1rem' }}>
            <div className="wb-toolbar">
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className={`wb-tool-btn ${!isEraser ? 'active' : ''}`}
                        onClick={() => setIsEraser(false)}
                    >
                        <Pen size={20} /> <span>펜</span>
                    </button>
                    <button
                        className={`wb-tool-btn ${isEraser ? 'active' : ''}`}
                        onClick={() => setIsEraser(true)}
                    >
                        <Eraser size={20} /> <span>지우개</span>
                    </button>

                    <div style={{ width: '1px', background: '#e2e8f0', margin: '0 0.5rem' }}></div>

                    {!isEraser && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(c => (
                                <button
                                    key={c}
                                    style={{
                                        width: '2rem', height: '2rem', borderRadius: '50%',
                                        backgroundColor: c, border: `2px solid ${color === c ? '#1e293b' : 'transparent'}`,
                                        transform: color === c ? 'scale(1.1)' : 'scale(1)',
                                        transition: 'transform 0.2s', cursor: 'pointer'
                                    }}
                                    onClick={() => { setColor(c); setIsEraser(false); }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <button
                    className="wb-tool-btn"
                    style={{ color: '#ef4444' }}
                    onClick={handleClear}
                >
                    <Trash2 size={20} /> <span>전체 지우기</span>
                </button>
            </div>

            <div
                ref={containerRef}
                className="wb-canvas-container"
                style={{ cursor: 'crosshair' }}
            >
                {backgroundUrl && (
                    <img
                        src={resolveApiUrl(backgroundUrl)}
                        alt="배경"
                        style={{
                            position: 'absolute', top: 0, left: 0,
                            width: '100%', height: '100%',
                            objectFit: 'contain', pointerEvents: 'none', zIndex: 1
                        }}
                    />
                )}
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                />
            </div>
        </div>
    );
};

export default WhiteboardStudent;
