import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import './TeacherMode.css';
import ProblemMonitor from './ProblemMonitor';
import LatexRenderer from '../../components/LatexRenderer';
import SubjectGradeSelector from '../../components/SubjectGradeSelector';

const TeacherMode = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('input'); // input, create, monitor
    const [title, setTitle] = useState('');
    const [inputText, setInputText] = useState('');
    const [blanks, setBlanks] = useState([]); // Array of { id, startOffset, endOffset, word }
    const [allowDuplicates, setAllowDuplicates] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const { currentUser, nickname } = useAuth();
    const [createdProblem, setCreatedProblem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [subject, setSubject] = useState('');
    const [schoolLevel, setSchoolLevel] = useState('');
    const [grade, setGrade] = useState('');
    const { id } = useParams();
    const [prevPin, setPrevPin] = useState('');
    const textRef = useRef(null);

    // 로그인 체크
    useEffect(() => {
        if (!currentUser) {
            alert('선생님 기능은 로그인이 필요합니다. 로그인 페이지로 이동합니다.');
            navigate('/teacher/login');
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        if (id) {
            fetchProblemForEdit(id);
        }
    }, [id]);

    const fetchProblemForEdit = async (problemId) => {
        try {
            const docRef = doc(db, 'problems', problemId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setTitle(data.title);
                setInputText(data.originalText);
                setAllowDuplicates(data.allowDuplicates);
                setIsPublic(data.isPublic || false);
                setSubject(data.subject || '');
                setSchoolLevel(data.schoolLevel || '');
                setGrade(data.grade || '');
                setPrevPin(data.pinNumber);

                // Handle both old (index-based) and new (offset-based) formats
                if (data.blanks.length > 0 && data.blanks[0].startOffset !== undefined) {
                    setBlanks(data.blanks);
                } else {
                    // Backwards compatibility logic removed for simplicity in creation mode, 
                    // users edit by creating new blanks if it's the old format.
                    setBlanks([]);
                }

                setStep('create');
            }
        } catch (error) {
            console.error("Error fetching problem for edit:", error);
            alert("문제 정보를 불러오는 중 오류가 발생했습니다.");
        }
    };

    const handleAnalyzeText = () => {
        if (!title.trim() || !inputText.trim()) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }
        if (!schoolLevel) {
            alert('학교급을 선택해주세요. (필수)');
            return;
        }

        // Normalize newlines to avoid offset drifting (\r\n -> \n)
        setInputText(prev => prev.replace(/\r\n/g, '\n'));
        setStep('create');
    };

    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        if (!textRef.current || !textRef.current.contains(range.commonAncestorContainer)) return;

        // Find the base offset from the parent span's data-offset
        const getOffset = (container, offset) => {
            let node = container;
            while (node && node !== textRef.current) {
                if (node.dataset && node.dataset.offset !== undefined) {
                    return parseInt(node.dataset.offset, 10) + offset;
                }
                // If it's a text node inside a span, the offset is relative to the text node.
                // But range.startOffset is already what we need if the container is the text node.
                // We just need to sum up previous sibling lengths if there are multiple text nodes/elements.
                if (node.parentNode && node.parentNode.dataset && node.parentNode.dataset.offset !== undefined) {
                    let totalOffset = parseInt(node.parentNode.dataset.offset, 10);
                    let sib = node.previousSibling;
                    while (sib) {
                        totalOffset += (sib.textContent || '').length;
                        sib = sib.previousSibling;
                    }
                    return totalOffset + offset;
                }
                node = node.parentNode;
            }
            return offset;
        };

        const startOffset = getOffset(range.startContainer, range.startOffset);
        const endOffset = getOffset(range.endContainer, range.endOffset);

        // Source of truth: slice from the original inputText using the calculated offsets
        const selectedText = inputText.slice(startOffset, endOffset);

        if (!selectedText.trim()) return;

        // Check for overlaps
        const hasOverlap = blanks.some(b =>
            (startOffset >= b.startOffset && startOffset < b.endOffset) ||
            (endOffset > b.startOffset && endOffset <= b.endOffset) ||
            (startOffset <= b.startOffset && endOffset >= b.endOffset)
        );

        if (hasOverlap) {
            selection.removeAllRanges();
            return;
        }

        const newBlank = {
            id: `blank-${Date.now()}`,
            startOffset,
            endOffset,
            word: selectedText
        };

        setBlanks([...blanks, newBlank].sort((a, b) => a.startOffset - b.startOffset));
        selection.removeAllRanges();
    };

    const removeBlank = (id) => {
        setBlanks(blanks.filter(b => b.id !== id));
    };

    const renderInteractiveText = () => {
        if (!inputText) return null;
        if (blanks.length === 0) return inputText;

        const elements = [];
        let currentIndex = 0;

        blanks.forEach(blank => {
            if (blank.startOffset > currentIndex) {
                elements.push(
                    <span key={`text-${currentIndex}`} data-offset={currentIndex}>
                        {inputText.slice(currentIndex, blank.startOffset)}
                    </span>
                );
            }
            elements.push(
                <span
                    key={`blank-${blank.id}`}
                    onClick={() => removeBlank(blank.id)}
                    className="word-chip-refined is-blank"
                    style={{ cursor: 'pointer', margin: '0 2px' }}
                >
                    <LatexRenderer text={blank.word} />
                    <span className="blank-indicator" style={{ userSelect: 'none', pointerEvents: 'none' }}></span>
                </span>
            );
            currentIndex = blank.endOffset;
        });

        if (currentIndex < inputText.length) {
            elements.push(
                <span key={`text-end`} data-offset={currentIndex}>{inputText.slice(currentIndex)}</span>
            );
        }

        return elements;
    };

    const handleSaveProblem = async () => {
        if (blanks.length === 0) {
            alert('최소 하나 이상의 빈칸을 지정해주세요.');
            return;
        }

        if (!subject) {
            alert('과목을 선택해주세요. (필수)');
            return;
        }

        if (!schoolLevel) {
            alert('학교급을 선택해주세요. (필수)');
            return;
        }

        if (!currentUser) {
            alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
            navigate('/teacher/login');
            return;
        }

        const blankList = blanks;

        try {
            setIsSaving(true);
            const problemId = id || Math.random().toString(36).substr(2, 9);
            const pinNumber = id ? prevPin : Math.floor(100000 + Math.random() * 900000).toString();

            const newProblem = {
                id: problemId,
                type: 'fill-blanks',
                pinNumber,
                title,
                originalText: inputText,
                blanks: blankList,
                allowDuplicates,
                teacherId: currentUser.uid,
                teacherDisplayName: nickname || '선생님',
                isPublic,
                subject: subject || null,
                schoolLevel,
                grade: grade || null,
                createdAt: serverTimestamp()
            };

            await setDoc(doc(db, 'problems', problemId), newProblem);

            setCreatedProblem({
                id: problemId,
                pinNumber,
                title,
                type: 'fill-blanks',
                blanks: blankList,
                originalText: inputText
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

            {step === 'input' && (
                <div className="teacher-top-banner-wrapper">
                    <div className="teacher-top-banner fade-in compact-banner">
                        <img src="/character.png" alt="DD" className="dd-mini-character-small" />
                        <div className="teacher-msg-small">
                            <strong>멋진 빈칸 채우기 문제를 만들어봐요! ✨</strong>
                            <p>아이들이 핵심 단어를 추측하며 배울 수 있게 지문을 입력해 보세요.</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="teacher-main-layout">
                <div className="teacher-content-area">
                    {step === 'input' && (
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
                                        <div className="latex-preview-container" style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '12px', border: '2px dashed #0ea5e9' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#0ea5e9', fontWeight: '800', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                ✨ 실시간 수식 미리보기
                                            </span>
                                            <div style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: '600' }}>
                                                <LatexRenderer text={title} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <SubjectGradeSelector
                                    subject={subject}
                                    setSubject={setSubject}
                                    schoolLevel={schoolLevel}
                                    setSchoolLevel={setSchoolLevel}
                                    grade={grade}
                                    setGrade={setGrade}
                                />
                                <div className="input-group">
                                    <label>본문 내용</label>
                                    <textarea
                                        className="styled-textarea"
                                        placeholder={"여기에 문제로 낼 지문을 입력하거나 붙여넣으세요.\n(💡 은, 는, 이, 가 등 조사는 띄어쓰지 않아도 자동으로 분리되어 단어만 선택할 수 있습니다!)"}
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

                    {step === 'create' && (
                        <div className="teacher-card fade-in">
                            <div className="card-header">
                                <h3>빈칸을 선택해주세요</h3>
                                <p>👉 본문에서 <strong>빈칸으로 만들 부분을 마우스로 드래그</strong>하여 선택하세요.</p>
                                <div style={{ marginTop: '0.8rem', padding: '0.8rem 1rem', background: '#F0F9FF', borderRadius: '8px', display: 'inline-block', border: '1px solid #D0EFFF' }}>
                                    <span style={{ color: '#2D6A8D', fontSize: '0.9rem', fontWeight: '600' }}>
                                        💡 이제 조사 띄어쓰기 없이도 원하는 부분만 콕 집어서 빈칸을 만들 수 있습니다!
                                    </span>
                                </div>
                            </div>

                            <div
                                className="word-editor-refined"
                                style={{
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '2.5',
                                    fontSize: '1.25rem',
                                    padding: '2rem',
                                    userSelect: 'text',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    background: '#fcfcfc',
                                    minHeight: '200px'
                                }}
                                ref={textRef}
                                onMouseUp={handleMouseUp}
                            >
                                {renderInteractiveText()}
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

                            <div className="action-bar-refined">
                                <button className="btn-ghost" onClick={() => setStep('input')}>
                                    뒤로가기
                                </button>
                                <button className="btn-primary-large" onClick={handleSaveProblem} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    {isSaving ? '저장 중...' : `문제 생성 완료 (${blanks.length}개)`}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'monitor' && createdProblem && (
                        <div className="teacher-card fade-in text-center">
                            <div className="success-lottie-area">
                                <div className="success-icon-puffy">
                                    <Check size={48} color="white" strokeWidth={3} />
                                </div>
                                <h2>멋진 문제가 만들어졌어요!</h2>
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
                            <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#4A7A96', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                <li style={{ marginBottom: '0.5rem' }}>
                                    <strong>조사 자동 분리!</strong><br />
                                    '대한민국은' 처럼 붙여 써도 '대한민국'만 빈칸으로 뚫을 수 있어요.
                                </li>
                                <li>
                                    수학 선생님이라면 <strong>latex 수식</strong>을 사용해 수식을 입력해보세요! ($ 기호 사용)
                                </li>
                            </ul>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default TeacherMode;
