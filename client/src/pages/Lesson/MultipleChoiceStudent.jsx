import React, { useState, useEffect } from 'react';
import LatexRenderer from '../../components/LatexRenderer';
import './LessonShared.css';

const getOptText = (opt) => (typeof opt === 'object' && opt !== null) ? opt.text : String(opt || '');
const getOptImageUrl = (opt) => (typeof opt === 'object' && opt !== null) ? opt.imageUrl : '';

const getAnswerIndices = (slide) => {
    if (Array.isArray(slide.answerIndices)) return slide.answerIndices;
    if (slide.answerIndex !== undefined) return [slide.answerIndex];
    return [0];
};

const MultipleChoiceStudent = ({ lessonProblemData, lessonRoomId, lessonNickname, lessonSocket }) => {
    const [selected, setSelected] = useState([]); // always array
    const { question, options } = lessonProblemData;
    const allowMultiple = lessonProblemData.allowMultiple || false;
    const answerIndices = getAnswerIndices(lessonProblemData);

    useEffect(() => {
        setSelected([]);
    }, [lessonProblemData.id]);

    const handleSelect = (idx) => {
        let newSelected;
        if (allowMultiple) {
            newSelected = selected.includes(idx)
                ? selected.filter(i => i !== idx)
                : [...selected, idx];
        } else {
            newSelected = [idx];
        }
        setSelected(newSelected);

        if (lessonSocket && lessonRoomId) {
            lessonSocket.emit('submitLessonAnswer', {
                lessonId: lessonRoomId,
                studentName: lessonNickname,
                answer: allowMultiple ? newSelected : newSelected[0]
            });
        }
    };

    const questionImageUrl = lessonProblemData.questionImageUrl || '';
    const isSubmitted = selected.length > 0;

    // 제출 후 정답 표시 여부 (선생님이 공개했을 때만 — 지금은 항상 숨김)
    const showResult = false;

    return (
        <div className="student-container">
            {allowMultiple && (
                <div style={{
                    background: '#f0e9ff', color: '#6d28d9', borderRadius: '8px',
                    padding: '0.5rem 1rem', fontSize: '0.85rem', marginBottom: '0.75rem',
                    textAlign: 'center', fontWeight: 600
                }}>
                    복수 선택 가능 — 해당하는 답을 모두 선택하세요
                </div>
            )}

            <h2 className="question-card">
                <LatexRenderer text={question} />
                {questionImageUrl && (
                    <img
                        src={questionImageUrl}
                        alt="질문 이미지"
                        style={{ display: 'block', maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', margin: '0.75rem auto 0', borderRadius: '10px' }}
                    />
                )}
            </h2>

            <div className="flex flex-col gap-4">
                {options && options.map((opt, idx) => {
                    const isSelected = selected.includes(idx);
                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelect(idx)}
                            className={`option-btn ${isSelected ? 'selected' : ''}`}
                        >
                            {allowMultiple ? (
                                <span style={{
                                    width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                                    border: `2px solid ${isSelected ? '#6d28d9' : '#cbd5e1'}`,
                                    background: isSelected ? '#6d28d9' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '0.75rem'
                                }}>
                                    {isSelected && '✓'}
                                </span>
                            ) : (
                                <span className="option-index">{idx + 1}.</span>
                            )}
                            <span style={{ flex: 1 }}>
                                {getOptImageUrl(opt) && (
                                    <img src={getOptImageUrl(opt)} alt="" style={{ maxHeight: '60px', objectFit: 'contain', marginBottom: '0.25rem', display: 'block' }} />
                                )}
                                <LatexRenderer text={getOptText(opt)} />
                            </span>
                        </button>
                    );
                })}
            </div>

            {isSubmitted && (
                <div className="waiting-msg">
                    {allowMultiple
                        ? `${selected.length}개 선택됨. 선생님을 기다려주세요.`
                        : '답안이 제출되었습니다. 선생님을 기다려주세요.'}
                </div>
            )}
        </div>
    );
};

export default MultipleChoiceStudent;
