import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { X, Check } from 'lucide-react';
import LatexRenderer from '../LatexRenderer';
import '../../pages/OrderMatching/OrderStudentMode.css';

const OrderMatchingPreview = ({ problem }) => {
    const [shuffledSteps, setShuffledSteps] = useState([]);
    const [userOrder, setUserOrder] = useState([]);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        if (problem) {
            const normalizedSteps = (problem.steps || []).map((step, idx) => {
                if (typeof step === 'string') return { id: `step-${idx}`, text: step };
                return step;
            });
            setShuffledSteps([...normalizedSteps].sort(() => Math.random() - 0.5));
            setUserOrder([]);
            setIsCompleted(false);
        }
    }, [problem]);

    const onDragEnd = (result) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const newUserOrder = [...userOrder];
        const newShuffledSteps = [...shuffledSteps];

        if (source.droppableId !== destination.droppableId) {
            if (source.droppableId === 'bank' && destination.droppableId === 'answer') {
                const [item] = newShuffledSteps.splice(source.index, 1);
                newUserOrder.splice(destination.index, 0, item);
            } else if (source.droppableId === 'answer' && destination.droppableId === 'bank') {
                const [item] = newUserOrder.splice(source.index, 1);
                newShuffledSteps.splice(destination.index, 0, item);
            }
        } else {
            if (source.droppableId === 'answer') {
                const [removed] = newUserOrder.splice(source.index, 1);
                newUserOrder.splice(destination.index, 0, removed);
            } else {
                const [removed] = newShuffledSteps.splice(source.index, 1);
                newShuffledSteps.splice(destination.index, 0, removed);
            }
        }

        setUserOrder(newUserOrder);
        setShuffledSteps(newShuffledSteps);

        // Check completion logic
        if (newUserOrder.length === problem.steps.length) {
            const correctIds = problem.steps.map(s => s.id).join(',');
            const userIds = newUserOrder.map(s => s.id).join(',');
            setIsCompleted(userIds === correctIds);
        } else {
            setIsCompleted(false);
        }
    };

    const handleRemoveStep = (index) => {
        const newUserOrder = [...userOrder];
        const [item] = newUserOrder.splice(index, 1);
        setShuffledSteps([...shuffledSteps, item]);
        setUserOrder(newUserOrder);
        setIsCompleted(false);
    };

    return (
        <div className="om-student-container" style={{ minHeight: 'auto', background: 'transparent' }}>
            <main className="om-game-content" style={{ padding: '1rem 0' }}>
                <div className="header-area">
                    <h2 className="problem-title"><LatexRenderer text={problem.title} /></h2>
                    <p className="instruction">카드를 드래그하여 순서를 맞추세요.</p>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="split-layout">
                        <div className="scan-zone answer-zone">
                            <h3 className="zone-title">답안 영역 ({userOrder.length})</h3>
                            <Droppable droppableId="answer">
                                {(provided, snapshot) => (
                                    <div className={`scroll-area ${snapshot.isDraggingOver ? 'drag-over' : ''}`} ref={provided.innerRef} {...provided.droppableProps}>
                                        {userOrder.map((item, index) => (
                                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`order-card filled ${snapshot.isDragging ? 'dragging' : ''}`}>
                                                        <div className="card-index">{index + 1}</div>
                                                        <div className="card-text"><LatexRenderer text={item.text} /></div>
                                                        <button className="btn-return" onClick={() => handleRemoveStep(index)}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {userOrder.length === 0 && <div className="empty-drop-guide-message">여기에 카드를 놓으세요</div>}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>

                        <div className="scan-zone resource-zone">
                            <h3 className="zone-title">카드 보관함</h3>
                            <Droppable droppableId="bank">
                                {(provided, snapshot) => (
                                    <div className={`scroll-area ${snapshot.isDraggingOver ? 'drag-over' : ''}`} ref={provided.innerRef} {...provided.droppableProps}>
                                        {shuffledSteps.length === 0 ? (
                                            <div className="empty-placeholder">
                                                <Check size={32} style={{ opacity: 0.3 }} />
                                                모두 배치함
                                            </div>
                                        ) : (
                                            shuffledSteps.map((item, index) => (
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`order-card bank-item ${snapshot.isDragging ? 'dragging' : ''}`}>
                                                            <LatexRenderer text={item.text} />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    </div>
                </DragDropContext>

                <div className="game-footer">
                    {isCompleted ? (
                        <div className="status-badge success">🎉 미리보기 정답!</div>
                    ) : (
                        <div className="status-badge neutral">{userOrder.length} / {problem.steps.length} 완료됨</div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default OrderMatchingPreview;
