import React, { useState } from 'react';
import { User, Maximize2, X, Send } from 'lucide-react';
import { resolveApiUrl } from '../../utils/url';
import './LessonShared.css';

const WhiteboardMonitor = ({ problemData, parentStudents, socket, lessonId }) => {
    const { backgroundUrl } = problemData;
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [msgTarget, setMsgTarget] = useState(null);
    const [msgText, setMsgText] = useState('');

    const handleSend = () => {
        if (!socket || !msgTarget || !msgText.trim()) return;
        socket.emit('sendMessage', { studentSocketId: msgTarget.id, message: msgText.trim(), teacherName: '교사' });
        setMsgText('');
        setMsgTarget(null);
    };

    return (
        <div className="monitor-card" style={{ backgroundColor: '#f8fafc', minHeight: '500px', position: 'relative' }}>
            {/* 확대 모달 */}
            {expandedStudent && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
                    onClick={() => setExpandedStudent(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{expandedStudent.name}의 화이트보드</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {socket && (
                                    <button
                                        onClick={() => { setMsgTarget({ id: expandedStudent.id, name: expandedStudent.name }); setExpandedStudent(null); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                                    >
                                        <Send size={14} /> 메시지
                                    </button>
                                )}
                                <button onClick={() => setExpandedStudent(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'white' }}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div style={{ position: 'relative', background: 'white', borderRadius: '12px', overflow: 'hidden', maxHeight: '75vh', aspectRatio: '4/3' }}>
                            {backgroundUrl && (
                                <img
                                    src={resolveApiUrl(backgroundUrl)} alt="background"
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', opacity: 0.5 }}
                                />
                            )}
                            {expandedStudent.hasImage ? (
                                <img
                                    src={expandedStudent.data}
                                    alt={`${expandedStudent.name}'s drawing`}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '1rem' }}>
                                    아직 그리지 않았습니다
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 개별 메시지 모달 */}
            {msgTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontWeight: 'bold', color: '#1e293b' }}>💬 {msgTarget.name}에게 메시지</h3>
                            <button onClick={() => setMsgTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>
                        <textarea
                            value={msgText} onChange={e => setMsgText(e.target.value)}
                            placeholder="메시지를 입력하세요..."
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            style={{ width: '100%', minHeight: '80px', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'none', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                            autoFocus
                        />
                        <button onClick={handleSend} disabled={!msgText.trim()}
                            style={{ marginTop: '0.75rem', width: '100%', padding: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Send size={16} /> 보내기
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">학생 화이트보드 실시간 현황</h3>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b', background: 'white', padding: '0.25rem 0.75rem', borderRadius: '999px', border: '1px solid #e2e8f0' }}>
                    접속 중: {parentStudents.length}명
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {parentStudents.map((student) => {
                    const studentAnswer = student.answer;
                    const hasImage = studentAnswer && studentAnswer.type === 'image' && studentAnswer.data;

                    return (
                        <div
                            key={student.id || student.name}
                            className="wb-grid-card"
                            style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div className="wb-grid-header">
                                <div className="flex items-center gap-2" style={{ flex: 1 }}>
                                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={16} />
                                    </div>
                                    <span style={{ fontWeight: 'bold', color: '#334155' }}>{student.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {socket && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMsgTarget({ id: student.id, name: student.name }); }}
                                            style={{ color: '#4f46e5', background: '#eef2ff', border: 'none', cursor: 'pointer', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                                            title="메시지 보내기"
                                        >
                                            💬
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setExpandedStudent({ id: student.id, name: student.name, hasImage, data: hasImage ? studentAnswer.data : null })}
                                        style={{ color: '#94a3b8', background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: '6px', padding: '0.3rem 0.5rem' }}
                                        title="크게 보기"
                                    >
                                        <Maximize2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="wb-grid-canvas">
                                {backgroundUrl && (
                                    <img
                                        src={resolveApiUrl(backgroundUrl)}
                                        alt="background"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', opacity: 0.5 }}
                                    />
                                )}

                                {hasImage ? (
                                    <img
                                        src={studentAnswer.data}
                                        alt={`${student.name}'s drawing`}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                                    />
                                ) : (
                                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, background: 'rgba(255,255,255,0.8)', padding: '0.25rem 0.75rem', borderRadius: '999px', backdropFilter: 'blur(4px)' }}>
                                            아직 그리지 않았습니다
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {parentStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-6 text-center" style={{ gridColumn: '1 / -1', color: '#94a3b8', background: 'white', borderRadius: '12px', border: '2px dashed #e2e8f0', padding: '3rem' }}>
                        <User size={48} color="#e2e8f0" style={{ marginBottom: '1rem' }} />
                        <p className="text-lg font-medium">참여 중인 학생이 없습니다.</p>
                        <p className="text-sm">학생들이 PIN 번호를 입력하고 들어오면 이곳에 나타납니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhiteboardMonitor;
