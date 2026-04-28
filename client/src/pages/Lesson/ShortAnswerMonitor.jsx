import React, { useState } from 'react';
import { User, Send, X } from 'lucide-react';

const ShortAnswerMonitor = ({ problemData, parentStudents, socket, lessonId }) => {
    const { question, answer: correctAnswer } = problemData;
    const [msgTarget, setMsgTarget] = useState(null); // { id, name }
    const [msgText, setMsgText] = useState('');

    const handleSend = () => {
        if (!socket || !msgTarget || !msgText.trim()) return;
        socket.emit('sendMessage', { studentSocketId: msgTarget.id, message: msgText.trim(), teacherName: '교사' });
        setMsgText('');
        setMsgTarget(null);
    };

    return (
        <div className="sa-monitor p-6 bg-white rounded-xl shadow-sm" style={{ position: 'relative' }}>
            {/* 개별 메시지 모달 */}
            {msgTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

            <h3 className="text-xl font-bold mb-2 text-slate-800">
                문제: {question}
            </h3>
            {correctAnswer && (
                <div className="text-sm bg-indigo-50 text-indigo-700 p-3 rounded-lg border border-indigo-100 mb-6 inline-block">
                    <span className="font-bold mr-2">모범 답안 (키워드):</span>
                    {correctAnswer}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {parentStudents.map((student) => {
                    const rawAnswer = student.answer;
                    const displayAnswer = (typeof rawAnswer === 'string' || typeof rawAnswer === 'number')
                        ? String(rawAnswer) : null;
                    const hasAnswer = displayAnswer !== null && displayAnswer !== '';

                    let isCorrect = false;
                    if (hasAnswer && correctAnswer) {
                        isCorrect = displayAnswer.toLowerCase().includes(String(correctAnswer).toLowerCase());
                    }

                    return (
                        <div
                            key={student.id || student.name}
                            className={`
                                flex flex-col p-4 rounded-xl border-2 transition-all h-32
                                ${hasAnswer
                                    ? (correctAnswer && isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-indigo-100 shadow-sm')
                                    : 'bg-slate-50 border-dashed border-slate-200 opacity-60'
                                }
                            `}
                            style={{ cursor: socket ? 'pointer' : 'default' }}
                            title={socket ? '클릭하여 메시지 보내기' : ''}
                            onClick={() => socket && setMsgTarget({ id: student.id, name: student.name })}
                        >
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100/50">
                                <User size={14} className={hasAnswer ? 'text-indigo-400' : 'text-slate-400'} />
                                <span className={`font-medium text-sm truncate ${hasAnswer ? 'text-slate-700' : 'text-slate-400'}`}>
                                    {student.name}
                                </span>
                            </div>

                            <div className="flex-1 flex items-center justify-center text-center overflow-y-auto custom-scrollbar">
                                {hasAnswer ? (
                                    <span className={`text-base font-bold break-words w-full ${isCorrect ? 'text-green-700' : 'text-slate-800'}`}>
                                        {displayAnswer}
                                    </span>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        <span className="text-xs uppercase tracking-wider font-semibold opacity-50">Typing</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {parentStudents.length === 0 && (
                <div className="text-center p-8 text-slate-400">
                    접속한 학생이 없습니다.
                </div>
            )}
        </div>
    );
};

export default ShortAnswerMonitor;
