import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

const OrderMatchingEditor = ({ slide, updateSlide }) => {
    // Default steps if none exist
    const steps = slide.steps || [
        { id: '1', text: '' },
        { id: '2', text: '' },
        { id: '3', text: '' }
    ];

    const handleAddStep = () => {
        const newSteps = [...steps, { id: Date.now().toString(), text: '' }];
        updateSlide(slide.id, { steps: newSteps });
    };

    const handleUpdateStep = (id, text) => {
        const newSteps = steps.map(s => s.id === id ? { ...s, text } : s);
        updateSlide(slide.id, { steps: newSteps });
    };

    const handleRemoveStep = (id) => {
        if (steps.length <= 2) return; // Prevent removing below 2 options
        const newSteps = steps.filter(s => s.id !== id);
        updateSlide(slide.id, { steps: newSteps });
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(steps);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        updateSlide(slide.id, { steps: items });
    };

    return (
        <div className="order-editor">
            <div className="editor-group" style={{ marginBottom: '1.5rem' }}>
                <label>순서 맞추기 문제</label>
                <input
                    type="text"
                    className="slide-input"
                    placeholder="문제를 입력하세요 (예: 다음 사건을 일어난 순서대로 나열하세요)"
                    value={slide.question || ''}
                    onChange={(e) => updateSlide(slide.id, { question: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '0.5rem' }}
                />
            </div>

            <div className="editor-group">
                <label>정답 순서 (위에서 아래로 올바른 순서대로 배치하세요)</label>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="steps-list">
                        {(provided) => (
                            <div className="options-list" style={{ marginTop: '0.5rem' }} {...provided.droppableProps} ref={provided.innerRef}>
                                {steps.map((step, index) => (
                                    <Draggable key={step.id} draggableId={step.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="option-item"
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', background: 'white', marginBottom: '0.5rem' }}
                                            >
                                                <div {...provided.dragHandleProps} style={{ color: '#9ca3af', cursor: 'grab' }}>
                                                    <GripVertical size={20} />
                                                </div>
                                                <span style={{ fontWeight: 'bold', color: '#6b7280', width: '1.5rem', textAlign: 'center' }}>{index + 1}</span>
                                                <input
                                                    type="text"
                                                    placeholder={`단계 ${index + 1} 내용`}
                                                    value={step.text}
                                                    onChange={(e) => handleUpdateStep(step.id, e.target.value)}
                                                    className="slide-input"
                                                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}
                                                />
                                                <button className="btn-remove-option" style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleRemoveStep(step.id)}>
                                                    <Trash2 size={16} />
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

                <button
                    className="btn-add-option"
                    style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', cursor: 'pointer', width: '100%', justifyContent: 'center', color: '#475569' }}
                    onClick={handleAddStep}
                >
                    <Plus size={16} /> 단계 추가
                </button>
            </div>
        </div>
    );
};

export default OrderMatchingEditor;
