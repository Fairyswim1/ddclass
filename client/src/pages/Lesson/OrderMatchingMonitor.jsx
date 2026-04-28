import React from 'react';
import { User, Check, X, Clock } from 'lucide-react';
import LatexRenderer from '../../components/LatexRenderer';

const OrderMatchingMonitor = ({ problemData, parentStudents }) => {
    const { title, steps = [] } = problemData;

    const correctIds = steps.map(s => s.id).join(',');

    const getStatus = (answer) => {
        if (!answer || !Array.isArray(answer) || answer.length === 0) return 'empty';
        if (answer.length < steps.length) return 'partial';
        const userIds = answer.map(s => s.id).join(',');
        return userIds === correctIds ? 'correct' : 'wrong';
    };

    const correctCount = parentStudents.filter(s => getStatus(s.answer) === 'correct').length;
    const submittedCount = parentStudents.filter(s => getStatus(s.answer) !== 'empty').length;

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b pb-4">
                <h3 className="text-xl font-bold text-slate-800">
                    문제: <LatexRenderer text={title} />
                </h3>
                <div className="flex gap-3 text-sm">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                        정답 {correctCount}명
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
                        제출 {submittedCount} / {parentStudents.length}명
                    </span>
                </div>
            </div>

            {/* 정답 순서 표시 */}
            <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-xs font-bold text-indigo-500 mb-2 uppercase tracking-wider">정답 순서</p>
                <div className="flex flex-wrap gap-2">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                            <span className="w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                {idx + 1}
                            </span>
                            <LatexRenderer text={step.text} />
                        </div>
                    ))}
                </div>
            </div>

            {/* 학생별 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {parentStudents.map((student) => {
                    const answer = student.answer;
                    const status = getStatus(answer);

                    const borderColor = {
                        correct: 'border-green-300 bg-green-50',
                        wrong: 'border-red-200 bg-red-50',
                        partial: 'border-yellow-200 bg-yellow-50',
                        empty: 'border-dashed border-slate-200 bg-slate-50 opacity-60',
                    }[status];

                    const StatusIcon = {
                        correct: <Check size={14} className="text-green-500" />,
                        wrong: <X size={14} className="text-red-400" />,
                        partial: <Clock size={14} className="text-yellow-500" />,
                        empty: null,
                    }[status];

                    return (
                        <div
                            key={student.id || student.name}
                            className={`flex flex-col p-3 rounded-xl border-2 transition-all ${borderColor}`}
                        >
                            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-slate-100">
                                <User size={13} className="text-slate-400 shrink-0" />
                                <span className="font-medium text-sm truncate text-slate-700 flex-1">{student.name}</span>
                                {StatusIcon}
                            </div>

                            <div className="flex flex-col gap-1">
                                {status === 'empty' ? (
                                    <p className="text-xs text-center text-slate-400 py-2">대기 중...</p>
                                ) : (
                                    answer.map((item, idx) => {
                                        const isCorrectPos = steps[idx]?.id === item.id;
                                        return (
                                            <div
                                                key={item.id}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                                                    isCorrectPos
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-700'
                                                }`}
                                            >
                                                <span className="font-bold shrink-0">{idx + 1}.</span>
                                                <span className="truncate"><LatexRenderer text={item.text} /></span>
                                            </div>
                                        );
                                    })
                                )}
                                {status === 'partial' && (
                                    <p className="text-xs text-center text-yellow-600 mt-1">
                                        {answer.length}/{steps.length} 배치됨
                                    </p>
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

export default OrderMatchingMonitor;
