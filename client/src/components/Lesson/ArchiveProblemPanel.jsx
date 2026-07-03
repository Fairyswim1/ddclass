import React, { useMemo, useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Archive, GripVertical, Loader2, Search } from 'lucide-react';

const ArchiveProblemPanel = ({ problems, loading, typeIcons, typeLabels, onAddClick }) => {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return problems;
        return problems.filter((p) => {
            const title = (p.title || '').toLowerCase();
            const typeLabel = (typeLabels[p.type] || '').toLowerCase();
            return title.includes(q) || typeLabel.includes(q);
        });
    }, [problems, search, typeLabels]);

    return (
        <aside className="archive-sidebar">
            <div className="archive-sidebar-header">
                <Archive size={18} />
                <span>내 보관함</span>
            </div>
            <p className="archive-sidebar-hint">빈칸·순서·자유보드를 슬라이드 목록으로 끌어오거나 클릭하세요.</p>

            <div className="archive-search-wrap">
                <Search size={14} />
                <input
                    type="text"
                    className="archive-search-input"
                    placeholder="제목 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="archive-loading">
                    <Loader2 size={20} className="animate-spin" />
                    <span>불러오는 중...</span>
                </div>
            ) : (
                <Droppable droppableId="archive-pool" isDropDisabled={false}>
                    {(provided) => (
                        <div
                            className="archive-problem-list"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {filtered.length === 0 ? (
                                <p className="archive-empty">
                                    {problems.length === 0
                                        ? '가져올 수 있는 문제가 없습니다.\n먼저 빈칸·순서·자유보드를 만들어 보관함에 저장하세요.'
                                        : '검색 결과가 없습니다.'}
                                </p>
                            ) : (
                                filtered.map((problem, index) => (
                                    <Draggable
                                        key={problem.id}
                                        draggableId={`archive_${problem.id}`}
                                        index={index}
                                    >
                                        {(dragProvided, snapshot) => (
                                            <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                {...dragProvided.dragHandleProps}
                                                className={`archive-problem-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                                onClick={() => onAddClick(problem)}
                                                title="클릭하면 슬라이드 맨 아래에 추가됩니다"
                                            >
                                                <GripVertical size={14} className="archive-grip" />
                                                <div className="archive-item-body">
                                                    <div className="archive-item-type">
                                                        {typeIcons[problem.type]}
                                                        <span>{typeLabels[problem.type]}</span>
                                                    </div>
                                                    <div className="archive-item-title">
                                                        {problem.title || '제목 없음'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            )}
        </aside>
    );
};

export default ArchiveProblemPanel;
