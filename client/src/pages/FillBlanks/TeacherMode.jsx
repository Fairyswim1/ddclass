import React, { useState, useEffect } from 'react';
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
    const [words, setWords] = useState([]);
    const [blanks, setBlanks] = useState(new Set()); // Set of indices
    const [allowDuplicates, setAllowDuplicates] = useState(false); // 단어 중복 사용 허용 여부
    const [isPublic, setIsPublic] = useState(false);
    const { currentUser, nickname } = useAuth();
    const [createdProblem, setCreatedProblem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [subject, setSubject] = useState('');
    const [schoolLevel, setSchoolLevel] = useState('');
    const [grade, setGrade] = useState('');
    const { id } = useParams();
    const [prevPin, setPrevPin] = useState('');

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

                const regex = /(\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\\$.*?\\$|\$.*?\$|\\begin\{[\s\S]*?\}[\s\S]*?\\end\{[\s\S]*?\}|\n|\S+)/g;
                const matches = data.originalText.match(regex) || [];
                setWords(matches);

                const restoredBlanks = new Set(data.blanks.map(b => b.index));
                setBlanks(restoredBlanks);

                setStep('create');
            }
        } catch (error) {
            console.error("Error fetching problem for edit:", error);
            alert("문제 정보를 불러오는 중 오류가 발생했습니다.");
        }
    };

    // 한국어 조사 분리 헬퍼
    const KOREAN_PARTICLES = [
        '에서는', '에서도', '으로는', '으로도', '부터는', '까지는', '에서', '부터', '까지', '보다',
        '밖에', '조차', '마저', '처럼', '만큼', '대로',
        '으로', '에게', '한테', '께서',
        '은', '는', '이', '가', '을', '를', '의', '에', '도', '로', '와', '과', '만', '요'
    ];

    const splitKoreanParticles = (tokens) => {
        const result = [];
        for (const token of tokens) {
            if (token === '\n' || token.startsWith('$') || token.startsWith('\\')) {
                result.push(token);
                continue;
            }
            // 한글이 포함된 토큰만 조사 분리 시도
            if (/[가-힣]/.test(token)) {
                let found = false;
                for (const particle of KOREAN_PARTICLES) {
                    if (token.endsWith(particle) && token.length > particle.length) {
                        const stem = token.slice(0, -particle.length);
                        // stem에 한글이 최소 1자 이상 있어야 분리
                        if (/[가-힣]/.test(stem)) {
                            result.push(stem, particle);
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) result.push(token);
            } else {
                result.push(token);
            }
        }
        return result;
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

        const regex = /(\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\\$.*?\\$|\$.*?\$|\\begin\{[\s\S]*?\}[\s\S]*?\\end\{[\s\S]*?\}|\n|\S+)/g;
        const matches = inputText.match(regex) || [];

        // 한국어 조사 분리 적용
        const splitWords = splitKoreanParticles(matches);

        setWords(splitWords);
        setStep('create');
    };

    const toggleBlank = (index) => {
        const newBlanks = new Set(blanks);
        if (newBlanks.has(index)) {
            newBlanks.delete(index);
        } else {
            newBlanks.add(index);
        }
        setBlanks(newBlanks);
    };

    const handleSaveProblem = async () => {
        if (blanks.size === 0) {
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

        const blankList = Array.from(blanks).map(index => ({
            index,
            word: words[index],
            id: `blank-${index}`
        }));

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
                words, // 토큰 배열 저장 (미리보기/학생 모드 호환용)
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

                    {step === 'create' && (
                        <div className="teacher-card fade-in">
                            <div className="card-header">
                                <h3>빈칸을 선택해주세요</h3>
                                <p>👆 <strong>단어를 클릭</strong>하여 빈칸으로 만드세요. 다시 클릭하면 취소됩니다.</p>
                            </div>

                            <div className="word-editor-refined">
                                {words.map((word, index) => {
                                    if (word === '\n') {
                                        return <div key={index} className="word-break" />;
                                    }
                                    return (
                                        <span
                                            key={index}
                                            className={`word-chip-refined ${blanks.has(index) ? 'is-blank' : ''}`}
                                            onClick={() => toggleBlank(index)}
                                        >
                                            <LatexRenderer text={word} />
                                            {blanks.has(index) && <span className="blank-indicator">빈칸</span>}
                                        </span>
                                    );
                                })}
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
                                    {isSaving ? '저장 중...' : `문제 생성 완료 (${blanks.size}개)`}
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
                            <p>수학 선생님이라면 <strong>latex 수식</strong>을<br />사용해 수식을 입력해보세요!</p>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default TeacherMode;
