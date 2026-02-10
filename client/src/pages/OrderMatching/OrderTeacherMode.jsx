import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save, Check } from 'lucide-react';
import './OrderTeacherMode.css';
import ProblemMonitor from '../FillBlanks/ProblemMonitor';
import LatexRenderer from '../../components/LatexRenderer';

const OrderTeacherMode = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('input'); // input, monitor
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState(['', '']); // Initial 2 empty steps
    const [createdProblem, setCreatedProblem] = useState(null);

    const handleAddStep = () => {
        setSteps([...steps, '']);
    };

    const handleReset = () => {
        if (window.confirm('모든 단계 내용을 지우시겠습니까?')) {
            setSteps(['', '']);
        }
    };

    const handleRemoveStep = (index) => {
        if (steps.length <= 2) {
            alert('최소 2개의 단계가 필요합니다.');
            return;
        }
        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps);
    };

    const handleStepChange = (index, value) => {
        const newSteps = [...steps];
        newSteps[index] = value;
        setSteps(newSteps);
    };

    const handleMoveStep = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === steps.length - 1) return;

        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setSteps(newSteps);
    };

    const handleSaveProblem = async () => {
        // Validation
        if (!title.trim()) {
            alert('문제 제목을 입력해주세요.');
            return;
        }
        if (steps.some(s => !s.trim())) {
            alert('모든 단계의 내용을 입력해주세요.');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/order-matching`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    steps: steps
                })
            });

            const data = await response.json();
            if (data.success) {
                // Adapt data for ProblemMonitor
                // ProblemMonitor expects: id, title, blanks(length) for progress
                // We'll mock 'blanks' as steps to reuse the progress bar logic
                const mockBlanks = steps.map((s, i) => ({ id: `step-${i}`, word: s }));

                setCreatedProblem({
                    id: data.problemId,
                    pinNumber: data.pinNumber,
                    title,
                    type: 'order-matching',
                    blanks: mockBlanks, // Reusing 'blanks' prop for progress calculation
                    originalText: steps.join(' ') // Minimal content for monitor
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
                    {step === 'input' && (
                        <div className="teacher-card fade-in">
                            <div className="teacher-welcome-area">
                                <img src="/character.png" alt="DD" className="dd-mini-character" />
                                <div className="teacher-msg">
                                    <strong>선생님, 오늘 수업의 핵심은 무엇인가요?</strong>
                                    <p>아이들이 이해하기 쉽게 순서대로 정리해 보세요. ✨</p>
                                </div>
                            </div>

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
                                    {(title.includes('$') || title.includes('\\[')) && (
                                        <div className="latex-hint">
                                            💡 제목에 LaTeX 수식이 포함되었습니다.
                                        </div>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label>단계 내용 입력</label>
                                    <p className="helper-text">
                                        아래에서 <strong>직접 한 단계씩 입력</strong>하거나,
                                        <strong>내용을 한꺼번에 붙여넣어</strong> 자동으로 나눌 수 있습니다.
                                    </p>
                                    <textarea
                                        className="styled-textarea"
                                        placeholder={"여기에 전체 내용을 붙여넣으세요.\n줄바꿈을 기준으로 단계가 자동으로 나누어집니다."}
                                        rows={4}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const lines = value.split('\n').filter(line => line.trim() !== '');
                                            if (lines.length > 0) {
                                                setSteps(lines);
                                            }
                                        }}
                                    />
                                </div>

                                <div className="steps-editor-refined">
                                    <div className="section-header-with-action">
                                        <label>단계별 확인 및 수정 (정답 순서)</label>
                                        <button className="btn-text-action" onClick={handleReset}>
                                            <Trash2 size={14} /> 전체 초기화
                                        </button>
                                    </div>
                                    <p className="helper-text">학생들에게는 이 순서가 무작위로 섞여서 보입니다.</p>

                                    {steps.map((text, index) => (
                                        <div key={index} className="step-input-card">
                                            <div className="step-header">
                                                <span className="step-badge">{index + 1}단계</span>
                                                <div className="step-actions">
                                                    <button onClick={() => handleMoveStep(index, 'up')} disabled={index === 0} className="btn-mini-icon">
                                                        <ArrowUp size={16} />
                                                    </button>
                                                    <button onClick={() => handleMoveStep(index, 'down')} disabled={index === steps.length - 1} className="btn-mini-icon">
                                                        <ArrowDown size={16} />
                                                    </button>
                                                    <button onClick={() => handleRemoveStep(index)} className="btn-mini-icon delete" disabled={steps.length <= 2}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                className="styled-input-compact"
                                                placeholder={`단계 ${index + 1}의 내용을 입력하세요`}
                                                value={text}
                                                onChange={(e) => handleStepChange(index, e.target.value)}
                                            />
                                            {(text.includes('$') || text.includes('\\[')) && (
                                                <div className="step-latex-preview-refined">
                                                    <LatexRenderer text={text} />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button className="btn-add-step-refined" onClick={handleAddStep}>
                                        <Plus size={18} /> 새로운 단계 추가
                                    </button>
                                </div>

                                <div className="action-bar-refined">
                                    <button className="btn-primary-large" onClick={handleSaveProblem}>
                                        <Save size={20} /> 순서 맞추기 문제 생성 완료
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'monitor' && createdProblem && (
                        <div className="teacher-card fade-in text-center">
                            <div className="success-lottie-area">
                                <div className="success-icon-puffy">
                                    <Check size={48} color="white" strokeWidth={3} />
                                </div>
                                <h2>문제가 생성되었습니다!</h2>
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

                <aside className="teacher-guide-sidebar">
                    <div className="guide-card">
                        <h3>어떻게 만드나요? ☁️</h3>
                        <div className="guide-steps">
                            <div className={`guide-step-item ${step === 'input' ? 'active' : ''}`}>
                                <div className="step-num">1</div>
                                <div className="step-info">
                                    <h4>내용 입력</h4>
                                    <p>제목과 각 단계별 내용을<br />순서대로 입력해주세요.</p>
                                </div>
                            </div>
                            <div className={`guide-step-item ${step === 'monitor' ? 'active' : ''}`}>
                                <div className="step-num">2</div>
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

export default OrderTeacherMode;
