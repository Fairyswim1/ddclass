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
                    background: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{
                            color: 'black',
                            display: 'flex', alignItems: 'center'
                        }}>
                            <Eye size={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'black', fontWeight: '800' }}>학생 화면 미리보기</h2>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>실제 학생이 보게 될 화면과 인터랙션을 미리 체험해보세요.</p>
                        </div>
                    </div>

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
