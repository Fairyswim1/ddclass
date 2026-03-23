import React from 'react';
import { User } from 'lucide-react';

const ShortAnswerMonitor = ({ problemData, parentStudents }) => {
    const { question, answer: correctAnswer } = problemData;

    return (
        <div className="sa-monitor p-6 bg-white rounded-xl shadow-sm">
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
                    const studentAnswer = student.answer;
                    const hasAnswer = studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '';

                    let isCorrect = false;
                    if (hasAnswer && correctAnswer) {
                        isCorrect = studentAnswer.toLowerCase().includes(correctAnswer.toLowerCase());
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
                                        {studentAnswer}
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
