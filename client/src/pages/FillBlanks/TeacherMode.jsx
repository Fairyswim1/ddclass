import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Save } from 'lucide-react';
import './TeacherMode.css';
import ProblemMonitor from './ProblemMonitor';
import LatexRenderer from '../../components/LatexRenderer';

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

        // 텍스트를 분석하여 단어와 수식을 분리
        // 1. \[ ... \] : 디스플레이 수식
        // 2. \( ... \) : 인라인 수식
        // 3. $ ... $ : 인라인 수식
        // 4. \S+ : 일반 단어
        const regex = /(\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\\$.*?\\$|\$.*?\$|\S+)/g;
        const matches = inputText.match(regex) || [];

        setWords(matches);
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
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com'}/api/fill-blanks`, {
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
            <nav className="header-nav teacher-header">
                <div className="brand-logo static-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <span className="logo-icon">☁️</span>
                    <div className="logo-text-fixed">
                        <span className="logo-dd">D</span>
                        <span className="logo-full">rag&</span>
                        <span className="logo-dd">D</span>
                        <span className="logo-full">rop</span>
                        <span className="logo-class">Class</span>
                    </div>
                </div>
                <div className="nav-btns">
                    <button className="btn-ghost" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> 나가기
                    </button>
                </div>
            </nav>

            <main className="teacher-main-layout">
                <div className="teacher-content-area">
                    {/* STEP 1: 텍스트 입력 */}
                    {step === 'input' && (
                        <>
                            <div className="teacher-top-banner fade-in">
                                <img src="/character.png" alt="DD" className="dd-mini-character-small" />
                                <div className="teacher-msg-small">
                                    <strong>선생님, 오늘 수업도 디디가 도울게요!</strong>
                                    <p>아이들을 설레게 할 멋진 지문을 입력해 보세요. ✨</p>
                                </div>
                            </div>

                            <div className="teacher-card fade-in">

                                <div className="form-section">
                                    <div className="input-group">
                                        <label>문제 제목</label>
                                        <input
                                            type="text"
                                            className="styled-input"
                                            placeholder=""
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>본문 내용</label>
                                        <textarea
                                            className="styled-textarea"
                                            placeholder={"여기에 문제로 낼 지문을 입력하거나 붙여넣으세요.\n(띄어쓰기 단위로 빈칸을 만들 수 있습니다.)"}
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            rows={12}
                                        />
                                        {(inputText.includes('$') || inputText.includes('\\[')) && (
                                            <div className="latex-hint">
                                                💡 LaTeX 수식이 감지되었습니다. $ 기호나 \[, \( 기호 사이의 텍스트는 수식으로 변환됩니다.
                                            </div>
                                        )}
                                    </div>
                                    <button className="btn-primary-large" onClick={handleAnalyzeText}>
                                        다음: 빈칸 만들기
                                    </button>
                                </div>
                            </div>
                    )}

                            {/* STEP 2: 빈칸 생성 */}
                            {step === 'create' && (
                                <div className="teacher-card fade-in">
                                    <div className="card-header">
                                        <h3>빈칸을 선택해주세요</h3>
                                        <p>👆 <strong>단어를 클릭</strong>하여 빈칸으로 만드세요. 다시 클릭하면 취소됩니다.</p>
                                    </div>

                                    <div className="word-editor-refined">
                                        {words.map((word, index) => (
                                            <span
                                                key={index}
                                                className={`word-chip-refined ${blanks.has(index) ? 'is-blank' : ''}`}
                                                onClick={() => toggleBlank(index)}
                                            >
                                                <LatexRenderer text={word} />
                                                {blanks.has(index) && <span className="blank-indicator">빈칸</span>}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="options-panel-refined">
                                        <label className="custom-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={!allowDuplicates}
                                                onChange={(e) => setAllowDuplicates(!e.target.checked)}
                                            />
                                            <span className="checkmark"></span>
                                            <span className="checkbox-text">
                                                <strong>사용한 단어 카드 감추기</strong> (한 번씩만 사용 가능)
                                            </span>
                                        </label>
                                    </div>

                                    <div className="action-bar-refined">
                                        <button className="btn-ghost" onClick={() => setStep('input')}>
                                            뒤로가기
                                        </button>
                                        <button className="btn-primary-large" onClick={handleSaveProblem}>
                                            <Save size={20} /> 문제 생성 완료 ({blanks.size}개)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: 모니터링 (완료) */}
                            {step === 'monitor' && createdProblem && (
                                <div className="teacher-card fade-in text-center">
                                    <div className="success-lottie-area">
                                        <div className="success-icon-puffy">
                                            <Check size={48} color="white" strokeWidth={3} />
                                        </div>
                                        <h2>멋진 문제가 만들어졌어요!</h2>
                                    </div>

                                    <div className="pin-box-refined">
                                        <span className="pin-label">참여 코드 (PIN)</span>
                                        <strong className="pin-number">{createdProblem.pinNumber}</strong>
                                    </div>

                                    <p className="monitor-guide-text">
                                        학생들에게 PIN 번호를 알려주세요.<br />
                                        학생들이 참여하면 아래에서 실시간 현황을 볼 수 있습니다.
                                    </p>

                                    <div className="monitor-container-refined">
                                        <ProblemMonitor problemData={createdProblem} />
                                    </div>
                                </div>
                            )}
                        </div>

                    {/* Sidebar Guide */}
                    <aside className="teacher-guide-sidebar">
                        <div className="guide-card">
                            <h3>어떻게 만드나요? ☁️</h3>
                            <div className="guide-steps">
                                <div className={`guide-step-item ${step === 'input' ? 'active' : ''}`}>
                                    <div className="step-num">1</div>
                                    <div className="step-info">
                                        <h4>지문 입력</h4>
                                        <p>수업에 사용할 제목과<br />본문 내용을 입력해주세요.</p>
                                    </div>
                                </div>
                                <div className={`guide-step-item ${step === 'create' ? 'active' : ''}`}>
                                    <div className="step-num">2</div>
                                    <div className="step-info">
                                        <h4>빈칸 선택</h4>
                                        <p>문제로 내고 싶은 단어를<br />클릭해 빈칸으로 만드세요.</p>
                                    </div>
                                </div>
                                <div className={`guide-step-item ${step === 'monitor' ? 'active' : ''}`}>
                                    <div className="step-num">3</div>
                                    <div className="step-info">
                                        <h4>PIN 공유</h4>
                                        <p>생성된 PIN 번호를 학생들에게<br />공유하고 수업 시작!</p>
                                    </div>
                                </div>
                            </div>

                            <div className="tip-box">
                                <h5>💡 디디의 꿀팁</h5>
                                <p>수학 선생님이라면 <strong>latex 수식</strong>을<br />사용해 수식을 입력해보세요!</p>
                            </div>
                        </div>
                    </aside>
            </main>
        </div>
    );
};

export default TeacherMode;
