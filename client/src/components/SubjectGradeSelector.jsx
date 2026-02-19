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
                <select
                    className="sg-select"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                >
                    <option value="">과목 선택</option>
                    {SUBJECTS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
            </div>

            <div className="sg-row">
                {/* 학교급 선택 (필수) */}
                <div className="sg-group flex-1">
                    <label className="sg-label">학교급 <span className="sg-required">*필수</span></label>
                    <select
                        className="sg-select"
                        value={schoolLevel}
                        onChange={(e) => handleSchoolLevelChange(e.target.value)}
                    >
                        <option value="">학교급 선택</option>
                        {SCHOOL_LEVELS.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>
                </div>

                {/* 학년 선택 (선택) */}
                <div className="sg-group flex-1">
                    <label className="sg-label">학년 <span className="sg-optional">선택</span></label>
                    <select
                        className="sg-select"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        disabled={!schoolLevel}
                    >
                        <option value="">학년 선택</option>
                        {schoolLevel && GRADES_MAP[schoolLevel]?.map(g => (
                            <option key={g} value={g}>{g}학년</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default SubjectGradeSelector;
