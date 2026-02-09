import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Save } from 'lucide-react';
import './TeacherMode.css';
import ProblemMonitor from './ProblemMonitor';

const TeacherMode = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('input'); // input, create, monitor
    const [title, setTitle] = useState('');
    const [inputText, setInputText] = useState('');
    const [words, setWords] = useState([]);
    const [blanks, setBlanks] = useState(new Set()); // Set of indices
    const [allowDuplicates, setAllowDuplicates] = useState(false); // 단어 중복 사용 허용 여부
    const [createdProblem, setCreatedProblem] = useState(null);

    // 1. 텍스트 입력 후 분석
    const handleAnalyzeText = () => {
        if (!title.trim() || !inputText.trim()) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }
        // 간단히 공백으로 분리 (추후 정교한 형태소 분석 가능)
        const splitWords = inputText.split(/\s+/);
        setWords(splitWords);
        setStep('create');
    };

    // 2. 단어 클릭하여 빈칸 토글
    const toggleBlank = (index) => {
        const newBlanks = new Set(blanks);
        if (newBlanks.has(index)) {
            newBlanks.delete(index);
        } else {
            newBlanks.add(index);
        }
        setBlanks(newBlanks);
    };

    // 3. 문제 저장 및 서버 전송
    const handleSaveProblem = async () => {
        if (blanks.size === 0) {
            alert('최소 1개 이상의 빈칸을 만들어주세요.');
            return;
        }

        const blankList = Array.from(blanks).map(index => ({
            index,
            word: words[index],
            id: `blank-${index}`
        }));

        try {
            const response = await fetch('http://localhost:3000/api/fill-blanks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    originalText: inputText,
                    blanks: blankList,
                    allowDuplicates
                })
            });

            const data = await response.json();
            if (data.success) {
                setCreatedProblem({
                    id: data.problemId,
                    pinNumber: data.pinNumber,
                    title,
                    originalText: inputText, // 모니터링 컴포넌트에서 미러링 뷰를 위해 필요
                    blanks: blankList // 모니터링 컴포넌트에서 문항 수를 알기 위해 필요
                });
                setStep('monitor');
            } else {
                alert('문제 생성 실패: ' + data.message);
            }
        } catch (error) {
            console.error('API Error:', error);
            alert('서버 통신 오류');
        }
    };

    return (
        <div className="teacher-mode-container">
            <nav className="teacher-nav">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={20} /> 나가기
                </button>
                <h2>빈칸 채우기 문제 생성</h2>
                <div style={{ width: 20 }}></div>
            </nav>

            <div className="teacher-content">
                {/* STEP 1: 텍스트 입력 */}
                {step === 'input' && (
                    <div className="step-container fade-in">
                        <div className="input-group">
                            <label>문제 제목</label>
                            <input
                                type="text"
                                placeholder="예: 3월 1주차 영단어 퀴즈"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>본문 내용</label>
                            <textarea
                                placeholder="여기에 문제로 낼 지문을 입력하거나 붙여넣으세요..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                rows={10}
                            />
                        </div>
                        <button className="btn-primary" onClick={handleAnalyzeText}>
                            다음: 빈칸 만들기 <ArrowLeft className="rotate-180" size={18} />
                        </button>
                    </div>
                )}

                {/* STEP 2: 빈칸 생성 */}
                {step === 'create' && (
                    <div className="step-container fade-in">
                        <div className="instruction-box">
                            <p>👆 <strong>단어를 클릭</strong>하여 빈칸으로 만드세요. 다시 클릭하면 취소됩니다.</p>
                        </div>

                        <div className="word-editor">
                            {words.map((word, index) => (
                                <span
                                    key={index}
                                    className={`word-chip ${blanks.has(index) ? 'is-blank' : ''}`}
                                    onClick={() => toggleBlank(index)}
                                >
                                    {word}
                                    {blanks.has(index) && <span className="blank-badge">빈칸</span>}
                                </span>
                            ))}
                        </div>

                        {/* 옵션 설정 영역 */}
                        <div className="options-panel">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={!allowDuplicates}
                                    onChange={(e) => setAllowDuplicates(!e.target.checked)}
                                />
                                <span className="check-text">
                                    <strong>사용한 단어 카드 감추기</strong> (한 번씩만 사용 가능)
                                </span>
                            </label>
                        </div>

                        <div className="action-bar">
                            <button className="btn-secondary" onClick={() => setStep('input')}>
                                뒤로가기
                            </button>
                            <button className="btn-primary" onClick={handleSaveProblem}>
                                <Save size={18} /> 문제 생성 완료 ({blanks.size}개)
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: 모니터링 (완료) */}
                {step === 'monitor' && createdProblem && (
                    <div className="step-container fade-in text-center">
                        <div className="success-icon">
                            <Check size={48} color="white" />
                        </div>
                        <h2>문제가 생성되었습니다!</h2>
                        <div className="pin-display-large">
                            <span>PIN CODE</span>
                            <strong>{createdProblem.pinNumber}</strong>
                        </div>
                        <p className="monitor-desc">
                            학생들에게 PIN 번호를 알려주세요.<br />
                            학생들이 접속하면 이곳에 실시간 현황이 표시됩니다.
                        </p>

                        <div className="monitor-wrapper" style={{ marginTop: '2rem', textAlign: 'left' }}>
                            <ProblemMonitor problemData={createdProblem} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherMode;
