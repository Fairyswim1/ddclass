import React from 'react';
import { User, Maximize2 } from 'lucide-react';
import { resolveApiUrl } from '../../utils/url';
import './LessonShared.css';

const WhiteboardMonitor = ({ problemData, parentStudents }) => {
    const { backgroundUrl } = problemData;

    return (
        <div className="monitor-card" style={{ backgroundColor: '#f8fafc', minHeight: '500px' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">
                    학생 화이트보드 실시간 현황
                </h3>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b', background: 'white', padding: '0.25rem 0.75rem', borderRadius: '999px', border: '1px solid #e2e8f0' }}>
                    접속 중: {parentStudents.length}명
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg-grid-cols-3 xl:grid-cols-4 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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
                                <button style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <Maximize2 size={16} />
                                </button>
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
