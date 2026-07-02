import React, { useEffect, useState } from 'react';
import { X, Eye, Maximize2, Minimize2 } from 'lucide-react';
import FillBlanksPreview from './FillBlanksPreview';
import OrderMatchingPreview from './OrderMatchingPreview';
import FreeBoardPreview from './FreeBoardPreview';
import './StudentPreviewModal.css';

const StudentPreviewModal = ({ isOpen, onClose, problem }) => {
    const [isFullscreen, setIsFullscreen] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsFullscreen(true);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isFullscreen) {
                    onClose();
                } else {
                    setIsFullscreen(true);
                }
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isFullscreen, onClose]);

    if (!isOpen || !problem) return null;

    const renderPreview = () => {
        switch (problem.type) {
            case 'fill-blanks':
                return <FillBlanksPreview problem={problem} />;
            case 'order-matching':
                return <OrderMatchingPreview problem={problem} />;
            case 'free-drop':
            case 'free-dnd':
                return <FreeBoardPreview problem={problem} />;
            default:
                return <div className="p-8 text-center">알 수 없는 문제 유형입니다.</div>;
        }
    };

    return (
        <div className="student-preview-overlay" onClick={onClose}>
            <div
                className={`student-preview-modal ${isFullscreen ? 'is-fullscreen' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="student-preview-header">
                    <div className="student-preview-title-wrap">
                        <div className="student-preview-icon">
                            <Eye size={24} />
                        </div>
                        <div>
                            <h2 className="student-preview-title">학생 화면 미리보기</h2>
                            <p className="student-preview-subtitle">
                                문제의 인터랙션과 디자인을 실제 학생 시점에서 검토하세요.
                            </p>
                        </div>
                    </div>

                    <div className="student-preview-actions">
                        <button
                            type="button"
                            className="student-preview-action-btn"
                            onClick={() => setIsFullscreen((prev) => !prev)}
                            aria-label={isFullscreen ? '창 모드로 보기' : '전체 화면으로 보기'}
                            title={isFullscreen ? '창 모드로 보기' : '전체 화면으로 보기'}
                        >
                            {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
                        </button>
                        <button
                            type="button"
                            className="student-preview-action-btn"
                            onClick={onClose}
                            aria-label="닫기"
                            title="닫기"
                        >
                            <X size={28} strokeWidth={2.5} />
                        </button>
                    </div>
                </header>

                <div className="student-preview-body">
                    {renderPreview()}
                </div>

                <footer className="student-preview-footer">
                    미리보기 모드입니다. 학생들의 데이터나 진행 상황은 저장되지 않습니다.
                </footer>
            </div>
        </div>
    );
};

export default StudentPreviewModal;
