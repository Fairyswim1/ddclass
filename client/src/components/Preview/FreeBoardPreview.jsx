import React, { useState, useEffect, useRef } from 'react';
import { Layout } from 'lucide-react';
import '../../pages/Free/FreeStudentMode.css';

const FreeBoardPreview = ({ problem }) => {
    const [items, setItems] = useState([]);
    const [currentWidth, setCurrentWidth] = useState(1000);
    const [draggingId, setDraggingId] = useState(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    const fontScale = problem ? currentWidth / (problem.baseWidth || 1000) : 1;

    useEffect(() => {
        if (problem) {
            setItems((problem.items || []).map(item => ({
                ...item,
                isPlaced: item.isPlaced || false
            })));
        }
    }, [problem]);

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setCurrentWidth(entry.contentRect.width);
            }
        });
        if (canvasRef.current) observer.observe(canvasRef.current);
        return () => observer.disconnect();
    }, []);

    const handleMouseDown = (e, id, fromTray = false) => {
        const item = items.find(i => i.id === id);
        if (!item || !canvasRef.current) return;
        const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0].clientX;
        const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0].clientY;
        setDraggingId(id);
        if (fromTray || !item.isPlaced) {
            dragOffset.current = { x: 0, y: 0 };
        } else {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            dragOffset.current = {
                x: clientX - canvasRect.left - (item.x / 100) * canvasRect.width,
                y: clientY - canvasRect.top - (item.y / 100) * canvasRect.height
            };
        }
    };

    const handleMouseMove = (e) => {
        if (!draggingId || !canvasRef.current) return;
        const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0].clientX;
        const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0].clientY;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const newXPercent = ((clientX - canvasRect.left - dragOffset.current.x) / canvasRect.width) * 100;
        const newYPercent = ((clientY - canvasRect.top - dragOffset.current.y) / canvasRect.height) * 100;
        setItems(prev => prev.map(item =>
            item.id === draggingId ? {
                ...item,
                x: Math.max(0, Math.min(newXPercent, 100)),
                y: Math.max(0, Math.min(newYPercent, 100)),
                isPlaced: true
            } : item
        ));
    };

    const handleMouseUp = () => setDraggingId(null);
    const handleReturnToTray = (id) => setItems(items.map(item => item.id === id ? { ...item, isPlaced: false, x: 0, y: 0 } : item));

    return (
        <div className="free-student-wrapper" style={{ height: '70vh', background: 'transparent' }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
            <main className="student-main">
                <section className="student-tray-area" style={{ width: '220px' }}>
                    <div className="tray-header"><Layout size={14} /> <span>카드 보관함</span></div>
                    <div className="student-tray">
                        {items.filter(i => !i.isPlaced).map(item => (
                            <div key={item.id} className={`tray-item ${item.type}`} onMouseDown={(e) => handleMouseDown(e, item.id, true)} onTouchStart={(e) => handleMouseDown(e, item.id, true)} style={{ fontSize: item.type === 'text' ? `${item.fontSize * fontScale}px` : 'inherit' }}>
                                {item.type === 'text' ? item.content : <img src={item.imageUrl} alt="img" draggable="false" />}
                            </div>
                        ))}
                    </div>
                </section>
                <section className="student-canvas-workspace">
                    <div className="student-canvas-container" style={{ position: 'relative' }}>
                        <img src={problem.backgroundUrl} alt="bg" style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }} />
                        <div className="student-master-canvas" ref={canvasRef}>
                            {items.filter(i => i.isPlaced).map(item => (
                                <div key={item.id} className={`placed-item ${item.type}`} onMouseDown={(e) => handleMouseDown(e, item.id)} onTouchStart={(e) => handleMouseDown(e, item.id)} style={{ left: `${item.x}%`, top: `${item.y}%`, width: item.type === 'image' ? `${item.width || 15}%` : 'auto', fontSize: item.type === 'text' ? `${item.fontSize * fontScale}px` : 'inherit', transform: 'translate(-50%, -50%)' }}>
                                    {item.type === 'text' ? item.content : <img src={item.imageUrl} alt="img" style={{ width: '100%' }} />}
                                    <button className="item-return-btn" onClick={(e) => { e.stopPropagation(); handleReturnToTray(item.id); }}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default FreeBoardPreview;
