import React from 'react';
import { Users, BarChart3 } from 'lucide-react';
import './LessonShared.css';

const PollMonitor = ({ problemData, parentStudents }) => {
    const { question, options } = problemData;

    const voteCounts = Array(options.length).fill(0);
    const studentsByOption = Array(options.length).fill().map(() => []);

    parentStudents.forEach(student => {
        if (student.answer !== undefined && student.answer !== null) {
            const idx = parseInt(student.answer, 10);
            if (idx >= 0 && idx < options.length) {
                voteCounts[idx]++;
                studentsByOption[idx].push(student.name);
            }
        }
    });

    const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

    const OPTION_COLORS = [
        '#3b82f6', '#14b8a6', '#eab308', '#f43f5e', '#a855f7',
        '#f97316', '#06b6d4', '#ec4899', '#6366f1', '#84cc16'
    ];
    const BG_COLORS = [
        '#eff6ff', '#f0fdfa', '#fefce8', '#fff1f2', '#faf5ff',
        '#fff7ed', '#ecfeff', '#fdf2f8', '#eef2ff', '#f7fee7'
    ];

    return (
        <div className="monitor-card">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <div style={{ padding: '0.5rem', background: '#e0e7ff', color: '#4f46e5', borderRadius: '0.5rem' }}>
                    <BarChart3 size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">
                        {question}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                        총 {totalVotes}명 참여 중
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {options.map((opt, idx) => {
                    const count = voteCounts[idx];
                    const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);

                    const barColor = OPTION_COLORS[idx % OPTION_COLORS.length];
                    const bgColor = BG_COLORS[idx % BG_COLORS.length];

                    return (
                        <div key={idx} className="stat-bar-container">
                            <div className="stat-bar-header" style={{ backgroundColor: bgColor }}>
                                <div className="flex items-center gap-3 flex-1">
                                    <span
                                        style={{
                                            width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: '50%', fontWeight: 'bold', fontSize: '0.875rem',
                                            backgroundColor: barColor, color: 'white'
                                        }}
                                    >
                                        {idx + 1}
                                    </span>
                                    <span className="font-semibold text-lg" style={{ color: barColor }}>
                                        {opt}
                                    </span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="font-bold text-xl" style={{ color: '#1e293b' }}>{count}표</span>
                                    <span className="font-medium" style={{ fontSize: '0.875rem', color: '#64748b' }}>{percentage}%</span>
                                </div>
                            </div>

                            <div className="stat-bar-track">
                                <div
                                    className="stat-bar-fill"
                                    style={{ width: `${percentage}%`, backgroundColor: barColor, transition: 'width 0.7s ease-out' }}
                                />
                            </div>

                            {studentsByOption[idx].length > 0 && (
                                <div className="p-3 bg-white text-sm flex gap-2" style={{ borderTop: '1px solid #e2e8f0', color: '#475569', flexWrap: 'wrap' }}>
                                    {studentsByOption[idx].map(name => (
                                        <span key={name} className="flex items-center gap-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                                            <Users size={12} color="#94a3b8" />
                                            {name}
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

export default PollMonitor;
