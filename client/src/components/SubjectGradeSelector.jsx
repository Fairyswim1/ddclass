import React from 'react';
import './SubjectGradeSelector.css';

const SUBJECTS = [
    { value: 'korean', label: '국어' },
    { value: 'english', label: '영어' },
    { value: 'math', label: '수학' },
    { value: 'social', label: '사회' },
    { value: 'science', label: '과학' },
    { value: 'arts', label: '예체능' },
    { value: 'other', label: '기타' },
];

const SCHOOL_LEVELS = [
    { value: 'elementary', label: '초등' },
    { value: 'middle', label: '중등' },
    { value: 'high', label: '고등' },
];

const GRADES_MAP = {
    elementary: [1, 2, 3, 4, 5, 6],
    middle: [1, 2, 3],
    high: [1, 2, 3],
};

const SubjectGradeSelector = ({ subject, setSubject, schoolLevel, setSchoolLevel, grade, setGrade }) => {
    const handleSchoolLevelChange = (level) => {
        setSchoolLevel(level);
        setGrade(''); // 학교급 바뀌면 학년 초기화
    };

    return (
        <div className="sg-selector">
            {/* 과목 선택 */}
            <div className="sg-group">
                <label className="sg-label">과목</label>
                <div className="sg-chips">
                    {SUBJECTS.map(s => (
                        <button
                            key={s.value}
                            type="button"
                            className={`sg-chip ${subject === s.value ? 'active' : ''}`}
                            onClick={() => setSubject(subject === s.value ? '' : s.value)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 학교급 선택 (필수) */}
            <div className="sg-group">
                <label className="sg-label">학교급 <span className="sg-required">*필수</span></label>
                <div className="sg-chips">
                    {SCHOOL_LEVELS.map(l => (
                        <button
                            key={l.value}
                            type="button"
                            className={`sg-chip level ${schoolLevel === l.value ? 'active' : ''}`}
                            onClick={() => handleSchoolLevelChange(l.value)}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 학년 선택 (선택) */}
            {schoolLevel && (
                <div className="sg-group">
                    <label className="sg-label">학년 <span className="sg-optional">선택</span></label>
                    <div className="sg-chips">
                        {GRADES_MAP[schoolLevel]?.map(g => (
                            <button
                                key={g}
                                type="button"
                                className={`sg-chip grade ${grade === g ? 'active' : ''}`}
                                onClick={() => setGrade(grade === g ? '' : g)}
                            >
                                {g}학년
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectGradeSelector;
