import React from 'react';
import { X, Eye } from 'lucide-react';
import FillBlanksPreview from './FillBlanksPreview';
import OrderMatchingPreview from './OrderMatchingPreview';
import FreeBoardPreview from './FreeBoardPreview';

const StudentPreviewModal = ({ isOpen, onClose, problem }) => {
    if (!isOpen || !problem) return null;

    const renderPreview = () => {
        switch (problem.type) {
            case 'fill-blanks':
                return <FillBlanksPreview problem={problem} />;
            case 'order-matching':
                return <OrderMatchingPreview problem={problem} />;
            case 'free-drop':
            case 'free-dnd': // both types handled
                return <FreeBoardPreview problem={problem} />;
            default:
                return <div className="p-8 text-center">알 수 없는 문제 유형입니다.</div>;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10000,
            backdropFilter: 'blur(10px)'
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: '32px', width: '95%', maxWidth: '1400px',
                height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                position: 'relative'
            }}>
                <header style={{
                    padding: '1.5rem 2.5rem', borderBottom: '2px solid #F0EEE9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'white', zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            background: '#f3f4f6', padding: '10px', borderRadius: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black'
                        }}>
                            <Eye size={28} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'black', fontWeight: '900', letterSpacing: '-0.5px' }}>학생 화면 미리보기</h2>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#6B7280', fontWeight: '500' }}>문제의 인터랙션과 디자인을 실제 학생 시점에서 검토하세요.</p>
                        </div>
                    </div>

                    {/* 단순화된 닫기 버튼: 배경/애니메이션 제거, 검정색 X */}
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'black',
                            padding: '8px',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '0.6'}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        aria-label="닫기"
                    >
                        <X size={36} strokeWidth={2.5} />
                    </button>
                </header>

                <div style={{ flex: 1, overflowY: 'auto', background: '#F9FAFB', position: 'relative' }}>
                    {renderPreview()}
                </div>

                <footer style={{
                    padding: '1.2rem 2.5rem', background: 'white',
                    borderTop: '2px solid #F0EEE9', textAlign: 'center',
                    fontSize: '1rem', color: '#9CA3AF', fontWeight: '600'
                }}>
                    💡 미리보기 모드입니다. 학생들의 데이터나 진행 상황은 저장되지 않습니다.
                </footer>
            </div>
        </div>
    );
};

export default StudentPreviewModal;
