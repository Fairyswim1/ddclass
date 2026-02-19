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
            backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 3000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: '24px', width: '90%', maxWidth: '1200px',
                height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '4px solid #F0EEE9'
            }}>
                <header style={{
                    padding: '1.2rem 2rem', borderBottom: '2px solid #F0EEE9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#FCFBFA'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{
                            background: 'var(--color-brand-blue)', color: 'white',
                            padding: '8px', borderRadius: '12px'
                        }}>
                            <Eye size={20} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-brand-brown)' }}>학생 화면 미리보기</h2>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#8D7B75' }}>실제 학생이 보게 될 화면과 인터랙션을 미리 체험해보세요.</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: '#F0EEE9', border: 'none', borderRadius: '50%',
                        width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
                        color: '#8D7B75'
                    }} onMouseOver={e => e.currentTarget.style.background = '#E5E7EB'}
                        onMouseOut={e => e.currentTarget.style.background = '#F0EEE9'}>
                        <X size={20} />
                    </button>
                </header>

                <div style={{ flex: 1, overflowY: 'auto', background: '#F9F8F6' }}>
                    {renderPreview()}
                </div>

                <footer style={{
                    padding: '1rem 2rem', background: 'white',
                    borderTop: '2px solid #F0EEE9', textAlign: 'center',
                    fontSize: '0.9rem', color: '#A89B96'
                }}>
                    팁: 미리보기 모드입니다. 진행 상황은 서버에 저장되지 않습니다.
                </footer>
            </div>
        </div>
    );
};

export default StudentPreviewModal;
