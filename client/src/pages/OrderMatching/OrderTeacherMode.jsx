import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import './OrderTeacherMode.css';
import ProblemMonitor from '../FillBlanks/ProblemMonitor';
import LatexRenderer from '../../components/LatexRenderer';

const OrderTeacherMode = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('input'); // input, monitor
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState(['', '']); // Initial 2 empty steps
    const [isPublic, setIsPublic] = useState(false);
    const { currentUser } = useAuth();
    const [createdProblem, setCreatedProblem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // 로그인 체크
    useEffect(() => {
        if (!currentUser) {
            alert('선생님 기능은 로그인이 필요합니다. 로그인 페이지로 이동합니다.');
            navigate('/teacher/login');
        }
    }, [currentUser, navigate]);

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

        if (!currentUser) {
            alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
            navigate('/teacher/login');
            return;
        }

        try {
            setIsSaving(true);

            // 클라이언트에서 ID 및 PIN 생성
            const problemId = Math.random().toString(36).substr(2, 9);
            const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

            const formattedSteps = steps.map((text, index) => ({
                id: `step-${index}`,
                text
            }));

            const newProblem = {
                id: problemId,
                type: 'order-matching',
                pinNumber,
                title,
                steps: formattedSteps, // formattedSteps 사용
                teacherId: currentUser.uid,
                isPublic,
                createdAt: serverTimestamp()
            };

            // Firestore에 직접 저장 (조회 프로젝트와 동일성 보장)
            console.log('[CLIENT-PRE-SAVE] 순서 맞추기 문제 객체:', newProblem);
            await setDoc(doc(db, 'problems', problemId), newProblem);
            console.log('[CLIENT-SAVE] 순서 맞추기 저장 성공:', problemId, 'Teacher:', currentUser.uid);

            const mockBlanks = steps.map((s, i) => ({ id: `step-${i}`, word: s }));

            setCreatedProblem({
                id: problemId,
                pinNumber,
                title,
                type: 'order-matching',
                blanks: mockBlanks,
                originalText: steps.join(' ')
            });
            setStep('monitor');

        } catch (error) {
            console.error('Save Error:', error);
            alert('저장 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setIsSaving(false);
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
                        <>
                            <div className="teacher-top-banner fade-in">
                                <img src="/character.png" alt="DD" className="dd-mini-character-small" />
                                <div className="teacher-msg-small">
                                    <strong>선생님, 오늘 수업의 핵심은 무엇인가요?</strong>
                                    <p>아이들이 이해하기 쉽게 순서대로 정리해 보세요. ✨</p>
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

                                        <div className="options-panel-refined" style={{ marginTop: '2rem' }}>
                                            <label className="custom-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isPublic}
                                                    onChange={(e) => setIsPublic(e.target.checked)}
                                                />
                                                <span className="checkmark"></span>
                                                <span className="checkbox-text">
                                                    <strong>다른 선생님께 이 문제 공개하기</strong> (라이브러리에 공유)
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="action-bar-refined">
                                        <button className="btn-primary-large" onClick={handleSaveProblem} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                            {isSaving ? '저장 중...' : '순서 맞추기 문제 생성 완료'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'monitor' && createdProblem && (
                        <div className="teacher-card fade-in text-center">
                            <div className="success-lottie-area">
                                <div className="success-icon-puffy">
                                    <Check size={48} color="white" strokeWidth={3} />
                                </div>
                                <h2>문제가 생성되었습니다!</h2>
                                <p className="save-confirmation-text">
                                    <Save size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    내 보관함에 안전하게 저장되었습니다.
                                </p>
                            </div>

                            <div className="pin-box-refined">
                                <span className="pin-label">참여 코드 (PIN)</span>
                                <strong className="pin-number">{createdProblem.pinNumber}</strong>
                            </div>

                            <p className="monitor-guide-text">
                                학생들에게 PIN 번호를 알려주세요.<br />
                                학생들이 참여하면 아래에서 실시간 현황을 볼 수 있습니다.
                            </p>

                            <div className="dashboard-action-area" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                                <button className="btn-secondary" onClick={() => navigate('/teacher/dashboard')}>
                                    내 보관함 가기
                                </button>
                            </div>

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
