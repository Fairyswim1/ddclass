import React, { useState } from 'react';
import { Users, Send, X } from 'lucide-react';
import LatexRenderer from '../../components/LatexRenderer';

const getOptText = (opt) => (typeof opt === 'object' && opt !== null) ? opt.text : String(opt || '');
const getOptImageUrl = (opt) => (typeof opt === 'object' && opt !== null) ? opt.imageUrl : '';

const MultipleChoiceMonitor = ({ problemData, parentStudents, socket, lessonId }) => {
    const { question, options, answerIndex } = problemData;
    const [msgTarget, setMsgTarget] = useState(null);
    const [msgText, setMsgText] = useState('');

    const voteCounts = Array(options.length).fill(0);
    const studentsByOption = Array(options.length).fill().map(() => []);

    parentStudents.forEach(student => {
        const ans = student.answer;
        if (ans !== undefined && ans !== null && typeof ans !== 'object') {
            const idx = parseInt(ans, 10);
            if (!isNaN(idx) && idx >= 0 && idx < options.length) {
                voteCounts[idx]++;
                studentsByOption[idx].push({ name: student.name, id: student.id });
            }
        }
    });

    const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

    const handleSend = () => {
        if (!socket || !msgTarget || !msgText.trim()) return;
        socket.emit('sendMessage', { studentSocketId: msgTarget.id, message: msgText.trim(), teacherName: '교사' });
        setMsgText('');
        setMsgTarget(null);
    };

    return (
        <div className="mc-monitor p-6 bg-white rounded-xl shadow-sm" style={{ position: 'relative' }}>
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

            <h3 className="text-xl font-bold mb-6 text-slate-800 border-b pb-4">
                문제: {question}
            </h3>

            <div className="options-stats flex flex-col gap-4">
                {options.map((opt, idx) => {
                    const count = voteCounts[idx];
                    const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
                    const isCorrect = idx === answerIndex;
                    const students = studentsByOption[idx];

                    return (
                        <div key={idx} className={`option-stat-card border rounded-lg overflow-hidden ${isCorrect ? 'border-green-300' : 'border-slate-200'}`}>
                            <div className={`p-4 flex items-center justify-between ${isCorrect ? 'bg-green-50' : 'bg-slate-50'}`}>
                                <div className="flex items-center gap-3 flex-1">
                                    <span className={`w-8 h-8 flex justify-center items-center rounded-full font-bold text-sm ${isCorrect ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        {idx + 1}
                                    </span>
                                    <div className={`font-medium flex flex-col gap-1 ${isCorrect ? 'text-green-700' : 'text-slate-700'}`}>
                                        {getOptImageUrl(opt) && <img src={getOptImageUrl(opt)} alt="" style={{ maxHeight: '40px', objectFit: 'contain' }} />}
                                        <LatexRenderer text={getOptText(opt)} />
                                    </div>
                                    {isCorrect && <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded ml-2">정답</span>}
                                </div>
                                <div className="text-right font-bold text-lg text-slate-700 w-24">
                                    {count}명 ({percentage}%)
                                </div>
                            </div>

                            <div className="h-2 w-full bg-slate-100">
                                <div
                                    className={`h-full transition-all duration-500 ${isCorrect ? 'bg-green-500' : 'bg-indigo-400'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            {students.length > 0 && (
                                <div className="p-3 bg-white text-sm text-slate-600 border-t flex flex-wrap gap-2">
                                    <Users size={16} className="text-slate-400 mr-1" />
                                    {students.map(s => (
                                        <span
                                            key={s.name}
                                            className="bg-slate-100 px-2 py-0.5 rounded"
                                            style={{ cursor: socket ? 'pointer' : 'default' }}
                                            title={socket ? '클릭하여 메시지 보내기' : ''}
                                            onClick={() => socket && setMsgTarget({ id: s.id, name: s.name })}
                                        >
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MultipleChoiceMonitor;
