import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save, Check } from 'lucide-react';
import './OrderTeacherMode.css';
import ProblemMonitor from '../FillBlanks/ProblemMonitor'; // Reuse or adapt? Reuse for now if compatible

const OrderTeacherMode = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('input'); // input, monitor
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState(['', '']); // Initial 2 empty steps
    const [createdProblem, setCreatedProblem] = useState(null);

    const handleAddStep = () => {
        setSteps([...steps, '']);
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
            const response = await fetch('http://localhost:3000/api/order-matching', {
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
            <nav className="teacher-nav">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={20} /> 나가기
                </button>
                <h2>순서 맞추기 문제 생성</h2>
                <div style={{ width: 20 }}></div>
            </nav>

            <div className="teacher-content">
                {step === 'input' && (
                    <div className="step-container fade-in">
                        <div className="input-group">
                            <label>문제 제목</label>
                            <input
                                type="text"
                                placeholder="예: 광합성 과정 순서 맞추기"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label>단계 내용 일괄 입력</label>
                            <p className="helper-text">여기에 전체 텍스트를 붙여넣으면 줄바꿈 기준으로 자동 분할됩니다.</p>
                            <textarea
                                placeholder="예:\n1단계 내용\n2단계 내용\n3단계 내용"
                                rows={6}
                                className="bulk-textarea"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // 빈 줄은 제외하고 분할
                                    const lines = value.split('\n').filter(line => line.trim() !== '');
                                    if (lines.length > 0) {
                                        setSteps(lines);
                                    }
                                }}
                            />
                        </div>

                        <div className="steps-editor">
                            <label>단계별 확인 및 수정 (정답 순서)</label>
                            <p className="helper-text">학생들에게는 이 순서가 섞여서 보입니다.</p>

                            {steps.map((text, index) => (
                                <div key={index} className="step-input-row">
                                    <span className="step-number">{index + 1}</span>
                                    <input
                                        type="text"
                                        placeholder={`단계 ${index + 1} 내용`}
                                        value={text}
                                        onChange={(e) => handleStepChange(index, e.target.value)}
                                    />
                                    <div className="step-actions">
                                        <button
                                            onClick={() => handleMoveStep(index, 'up')}
                                            disabled={index === 0}
                                            className="btn-icon"
                                        >
                                            <ArrowUp size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleMoveStep(index, 'down')}
                                            disabled={index === steps.length - 1}
                                            className="btn-icon"
                                        >
                                            <ArrowDown size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveStep(index)}
                                            className="btn-icon delete"
                                            disabled={steps.length <= 2}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button className="btn-add-step" onClick={handleAddStep}>
                                <Plus size={18} /> 단계 추가하기
                            </button>
                        </div>

                        <div className="action-bar right">
                            <button className="btn-primary" onClick={handleSaveProblem}>
                                <Save size={18} /> 문제 생성 완료
                            </button>
                        </div>
                    </div>
                )}

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

export default OrderTeacherMode;
