import React from 'react';
import { Users } from 'lucide-react';
import LatexRenderer from '../../components/LatexRenderer';

const getOptText = (opt) => (typeof opt === 'object' && opt !== null) ? opt.text : String(opt || '');
const getOptImageUrl = (opt) => (typeof opt === 'object' && opt !== null) ? opt.imageUrl : '';

const MultipleChoiceMonitor = ({ problemData, parentStudents }) => {
    const { question, options, answerIndex } = problemData;

    // Calculate votes for each option
    const voteCounts = Array(options.length).fill(0);
    const studentsByOption = Array(options.length).fill().map(() => []);

    parentStudents.forEach(student => {
        const ans = student.answer;
        if (ans !== undefined && ans !== null && typeof ans !== 'object') {
            const idx = parseInt(ans, 10);
            if (!isNaN(idx) && idx >= 0 && idx < options.length) {
                voteCounts[idx]++;
                studentsByOption[idx].push(student.name);
            }
        }
    });

    const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

    return (
        <div className="mc-monitor p-6 bg-white rounded-xl shadow-sm">
            <h3 className="text-xl font-bold mb-6 text-slate-800 border-b pb-4">
                문제: {question}
            </h3>

            <div className="options-stats flex flex-col gap-4">
                {options.map((opt, idx) => {
                    const count = voteCounts[idx];
                    const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
                    const isCorrect = idx === answerIndex;

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

                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-slate-100">
                                <div
                                    className={`h-full transition-all duration-500 ${isCorrect ? 'bg-green-500' : 'bg-indigo-400'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            {/* Student List */}
                            {studentsByOption[idx].length > 0 && (
                                <div className="p-3 bg-white text-sm text-slate-600 border-t flex flex-wrap gap-2">
                                    <Users size={16} className="text-slate-400 mr-1" />
                                    {studentsByOption[idx].map(name => (
                                        <span key={name} className="bg-slate-100 px-2 py-0.5 rounded">{name}</span>
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
