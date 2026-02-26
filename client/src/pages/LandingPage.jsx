import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Gamepad2,
    LogIn,
    ArrowRight,
    Star,
    Sparkles,
    Layout,
    Heart,
    MousePointer2,
    BookOpen,
    Users,
    Layers,
    MonitorPlay,
    Share2,
    Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';
import StudentPreviewModal from '../components/Preview/StudentPreviewModal';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const [popularProblems, setPopularProblems] = React.useState([]);
    const [isLoadingPopular, setIsLoadingPopular] = React.useState(true);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
    const [previewProblem, setPreviewProblem] = React.useState(null);

    React.useEffect(() => {
        fetchPopularProblems();
    }, []);

    const fetchPopularProblems = async () => {
        try {
            setIsLoadingPopular(true);
            const q = query(
                collection(db, 'problems'),
                where('isPublic', '==', true),
                orderBy('likeCount', 'desc'),
                limit(4)
            );
            const querySnapshot = await getDocs(q);
            const items = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPopularProblems(items);
        } catch (error) {
            console.error("Error fetching popular problems:", error);
        } finally {
            setIsLoadingPopular(false);
        }
    };

    const services = [
        {
            id: 'fill-blanks',
            title: '주요 용어 & 빈칸 채우기',
            description: '전 과목 핵심 용어 학습, 국어·영어 어휘력 향상 등 다양한 수업의 핵심 활동으로 활용해보세요.',
            icon: <Star size={24} fill="currentColor" />,
            color: 'var(--color-brand-yellow)',
            path: '/fill-blanks'
        },
        {
            id: 'order-matching',
            title: '논리적인 순서 맞추기',
            description: '영어 문장 완성, 역사의 시간 흐름, 수학적 증명 순서 등 순서가 중요한 모든 학습에 적합합니다.',
            icon: <Sparkles size={24} fill="currentColor" />,
            color: 'var(--color-brand-green)',
            path: '/order-matching'
        },
        {
            id: 'free-dnd',
            title: '창의적인 자유 보드',
            description: '원하는 배경과 그림 위에 텍스트나 이미지를 마음껏 배치하며 상상력을 자극하는 활동을 설계해보세요.',
            icon: <Layout size={24} fill="currentColor" />,
            color: 'var(--color-brand-blue)',
            path: '/free-dnd'
        }
    ];

    return (
        <div className="landing-page">
            {/* 1. Original Header */}
            <nav className="header-nav">
                <div className="brand-logo static-logo">
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
                    <button className="btn-nav-library" onClick={() => navigate('/teacher/library')}>
                        <BookOpen size={18} /> 라이브러리
                    </button>
                    <button className="btn-nav-student" onClick={() => navigate('/student/join')}>
                        <Gamepad2 size={18} /> 학생 참여 (PIN)
                    </button>
                    {currentUser ? (
                        <div className="user-profile-nav">
                            <span className="user-name"><strong>{currentUser.displayName || '선생님'}</strong>님 반갑습니다!</span>
                            <button className="btn-ghost" onClick={() => navigate('/teacher/dashboard')}>
                                내 보관함
                            </button>
                            <button className="btn-primary" onClick={logout}>
                                로그아웃
                            </button>
                        </div>
                    ) : (
                        <button className="btn-primary" onClick={() => navigate('/teacher/login')}>
                            <LogIn size={18} /> 선생님 로그인
                        </button>
                    )}
                </div>
            </nav>

            <main className="main-wrapper">
                {/* 2. Original Hero Section */}
                <section className="main-container original-hero-area">
                    <div className="welcome-section">
                        <motion.div
                            className="character-container"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 100 }}
                        >
                            <img src="/character.png" alt="DD Character" className="main-character-refined" />
                            <div className="original-speech-bubble">선생님, 오늘 수업도 디디가 도울게요! ✨</div>
                        </motion.div>

                        <div className="hero-text">
                            <h1 className="title-text">
                                선생님의 <span className="accent">아이디어</span>가<br />
                                수업이 되는 순간,<br />
                                DD Class
                            </h1>
                            <p className="subtitle-text">
                                수업 준비가 즐거워지는 마법! 디디와 함께 쉽고 빠르게<br />
                                아이들이 주인공이 되는 인터랙티브 수업을 설계해 보세요.
                            </p>
                        </div>

                        {/* Floating Decorative Items */}
                        <div className="floating-deco-container">
                            <motion.div drag dragConstraints={{ left: -100, right: 600, top: -100, bottom: 400 }} className="deco star-sky" style={{ top: '5%', left: '10%' }}><Star size={40} fill="#FFCE44" color="#FFCE44" /></motion.div>
                            <motion.div drag dragConstraints={{ left: -200, right: 500, top: -300, bottom: 200 }} className="deco heart-pink" style={{ top: '70%', left: '2%' }}><Heart size={32} fill="#FF8E4B" color="#FF8E4B" /></motion.div>
                            <motion.div drag dragConstraints={{ left: -500, right: 200, top: -200, bottom: 300 }} className="deco sparkles-blue" style={{ top: '35%', left: '85%' }}><Sparkles size={36} color="#4FB6FF" /></motion.div>
                        </div>
                    </div>

                    {/* Original Right Side: Game Cards */}
                    <div className="modes-section">
                        <div className="cards-header">
                            <h3>무엇을 해볼까요?</h3>
                        </div>
                        <div className="modes-grid">
                            {services.map((service, index) => (
                                <motion.div
                                    key={service.id}
                                    className="mode-round-card"
                                    whileHover={{ scale: 1.03, translateY: -5 }}
                                    onClick={() => navigate(service.path)}
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 + (index * 0.1) }}
                                >
                                    <div className="mode-icon-box" style={{ backgroundColor: service.color }}>
                                        {service.icon}
                                    </div>
                                    <div className="mode-info">
                                        <h4>{service.title}</h4>
                                        <p>{service.description}</p>
                                    </div>
                                    <div className="mode-arrow">
                                        <ArrowRight size={20} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 2.5 Popular Content Section (EBSMath Style) */}
                <section className="popular-content-section container">
                    <div className="popular-header">
                        <div className="title-area">
                            <span className="popular-badge">TRENDING</span>
                            <h2>실시간 인기 수업 콘텐츠 🔥</h2>
                            <p>전국의 선생님들이 가장 많이 활용 중인 리얼 수업 자료입니다.</p>
                        </div>
                        <button className="btn-text-more" onClick={() => navigate('/teacher/library')}>
                            전체 라이브러리 보기 <ArrowRight size={18} />
                        </button>
                    </div>

                    <div className="popular-grid">
                        {isLoadingPopular ? (
                            [1, 2, 3, 4].map(n => (
                                <div key={n} className="popular-card skeleton">
                                    <div className="skeleton-thumb"></div>
                                    <div className="skeleton-line"></div>
                                    <div className="skeleton-line short"></div>
                                </div>
                            ))
                        ) : (
                            popularProblems.map((problem, index) => (
                                <motion.div
                                    key={problem.id}
                                    className="popular-card"
                                    initial={{ y: 20, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => {
                                        setPreviewProblem(problem);
                                        setIsPreviewOpen(true);
                                    }}
                                >
                                    <div className={`popular-thumb-box ${problem.type}`}>
                                        <div className="thumb-icon">
                                            {problem.type === 'fill-blanks' && <Star size={32} fill="white" />}
                                            {problem.type === 'order-matching' && <Sparkles size={32} fill="white" />}
                                            {problem.type === 'free-drop' || problem.type === 'free-dnd' ? <Layout size={32} fill="white" /> : <Layers size={32} fill="white" />}
                                        </div>
                                        <div className="thumb-metadata">
                                            <span className="t-badge">{problem.schoolLevel === 'high' ? '고등' : problem.schoolLevel === 'middle' ? '중등' : '초등'}</span>
                                            <span className="t-badge">{problem.subject === 'korean' ? '국어' : problem.subject === 'math' ? '수학' : problem.subject || '기타'}</span>
                                        </div>
                                    </div>
                                    <div className="popular-info">
                                        <h4 className="p-title">{problem.title}</h4>
                                        <div className="p-stats">
                                            <span className="p-author"><Users size={14} /> {problem.teacherDisplayName || '선생님'}</span>
                                            <span className="p-likes"><Heart size={14} fill="#FF5252" color="#FF5252" /> {problem.likeCount || 0}</span>
                                        </div>
                                    </div>
                                    <div className="hover-overlay">
                                        <button className="btn-preview-mini">수업 미리보기</button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                {/* 3. New Detailed Sections Scroll Flow */}
                <div className="scroll-intro-flow">
                    {/* Features Intro Section */}
                    <section className="section-padding white-bg">
                        <div className="container">
                            <header className="section-header text-center">
                                <motion.span
                                    className="section-badge"
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                >FEATURES</motion.span>
                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true }}
                                >어떤 수업이든 디디 하나면 충분해요</motion.h2>
                            </header>

                            <div className="feature-detail-list">
                                {/* Feature 1: Fill Blanks */}
                                <motion.div
                                    className="feature-item"
                                    initial={{ y: 50, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                >
                                    <div className="feature-text">
                                        <div className="feature-icon-box yellow">
                                            <Star size={32} fill="white" />
                                        </div>
                                        <h3>주요 용어 & 빈칸 채우기</h3>
                                        <p>중요한 개념을 빈칸으로 만들어보세요. 아이들이 직접 드래그해서 정답을 맞히며 핵심 내용을 완벽하게 학습합니다.</p>
                                        <ul className="feature-bullets">
                                            <li>텍스트 입력만으로 자동 빈칸 생성</li>
                                            <li>수학 선생님을 위한 LaTeX 수식 완벽 지원</li>
                                            <li>학생별 실시간 정답 현황 모니터링</li>
                                        </ul>
                                    </div>
                                    <div className="feature-visual">
                                        <div className="visual-image-box video-box">
                                            <video
                                                src="/bin.mp4"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="feature-video"
                                            />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Feature 2: Order Matching */}
                                <motion.div
                                    className="feature-item reverse"
                                    initial={{ y: 50, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                >
                                    <div className="feature-text">
                                        <div className="feature-icon-box green">
                                            <Sparkles size={32} fill="white" />
                                        </div>
                                        <h3>논리적인 순서 맞추기</h3>
                                        <p>인과관계가 중요한 과학 실험 순서, 역사적 사건의 흐름 등을 게임처럼 재미있게 배열하며 익힙니다.</p>
                                        <ul className="feature-bullets">
                                            <li>단계별 카드 자동 생성 및 무작위 배열</li>
                                            <li>직관적인 드래그 앤 드롭 인터페이스</li>
                                            <li>문장 완성, 증명 순서 등 다양한 멀티 활용</li>
                                        </ul>
                                    </div>
                                    <div className="feature-visual">
                                        <div className="visual-image-box video-box">
                                            <video
                                                src="/sun.mp4"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="feature-video"
                                            />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Feature 3: Free Board */}
                                <motion.div
                                    className="feature-item"
                                    initial={{ y: 50, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                >
                                    <div className="feature-text">
                                        <div className="feature-icon-box blue">
                                            <Layout size={32} fill="white" />
                                        </div>
                                        <h3>창의적인 자유 보드</h3>
                                        <p>배경 이미지를 업로드하고 그 위에 텍스트와 그림 카드를 배치하세요. 분류하기, 맵 꾸미기 등 독창적인 활동이 가능합니다.</p>
                                        <ul className="feature-bullets">
                                            <li>학습지나 교과서 이미지를 배경으로 활용</li>
                                            <li>이미지 및 텍스트 카드 무제한 추가</li>
                                            <li>창의적 사고와 협업 활동에 최적화</li>
                                        </ul>
                                    </div>
                                    <div className="feature-visual">
                                        <div className="visual-image-box video-box">
                                            <video
                                                src="/free.mp4"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="feature-video"
                                            />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Feature 4: Real-time Monitoring */}
                                <motion.div
                                    className="feature-item reverse"
                                    initial={{ y: 50, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                >
                                    <div className="feature-text">
                                        <div className="feature-icon-box purple">
                                            <MonitorPlay size={32} fill="white" />
                                        </div>
                                        <h3>실시간 학생 화면 모니터링</h3>
                                        <p>선생님 화면 하나로 반 전체 학생의 활동을 한눈에 살펴보세요. 도움이 필요한 학생을 즉시 파악하고 피드백을 전달할 수 있습니다.</p>
                                        <ul className="feature-bullets">
                                            <li>학생 한 명 한 명의 화면을 실시간 대시보드로 확인</li>
                                            <li>막히는 학생에게 즉시 메시지 및 칭찬 스티커 전송</li>
                                            <li>수업 집중도 및 참여도를 즉각적으로 파악</li>
                                        </ul>
                                    </div>
                                    <div className="feature-visual">
                                        <div className="visual-image-box video-box monitor-video">
                                            <video
                                                src="/feed.mp4"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="feature-video"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </section>

                    {/* How It Works Section */}
                    <section className="section-padding bg-warm">
                        <div className="container">
                            <header className="section-header text-center">
                                <span className="section-badge">PROCESS</span>
                                <h2>준비는 가볍게, 수업은 깊이 있게</h2>
                            </header>

                            <div className="process-grid">
                                {[
                                    { step: '01', title: '문제 만들기', desc: '내용을 입력하거나 파일을 업로드하여 뚝딱 문제를 생성합니다.', icon: <Zap size={32} /> },
                                    { step: '02', title: 'PIN 공유하기', desc: '생성된 6자리 PIN 번호를 학생들에게 공유합니다. 별도 가입이 필요 없어요.', icon: <Share2 size={32} /> },
                                    { step: '03', title: '실시간 관찰', desc: '학생들이 문제를 푸는 과정을 실시간 대시보드로 지켜보며 피드백합니다.', icon: <MonitorPlay size={32} /> }
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        className="process-card"
                                        initial={{ y: 30, opacity: 0 }}
                                        whileInView={{ y: 0, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.2 }}
                                    >
                                        <div className="process-step">{item.step}</div>
                                        <div className="process-icon">{item.icon}</div>
                                        <h4>{item.title}</h4>
                                        <p>{item.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Library Section */}
                    <section className="section-padding white-bg">
                        <div className="container">
                            <div className="library-teaser-box">
                                <div className="library-teaser-text">
                                    <span className="section-badge">COMMUNITY</span>
                                    <h2>선생님들의 아이디어를 공유하세요</h2>
                                    <p>이미 다른 선생님들이 만들어둔 수많은 문제들을 바로 가져다 수업에 활용할 수 있습니다. 함께 나누면 수업 준비가 더 가벼워집니다.</p>
                                    <button className="btn-secondary-large" onClick={() => navigate('/teacher/library')}>
                                        라이브러리 둘러보기 <BookOpen size={20} />
                                    </button>
                                </div>
                                <div className="library-teaser-visual">
                                    <motion.div
                                        className="library-image-box"
                                        initial={{ x: 50, opacity: 0 }}
                                        whileInView={{ x: 0, opacity: 1 }}
                                        viewport={{ once: true }}
                                    >
                                        <img src="/images/feature-library.png" alt="공개 라이브러리 화면" className="library-screenshot" />
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Final CTA Section */}
                    <section className="cta-final-section">
                        <motion.div
                            className="cta-container"
                            initial={{ scale: 0.95, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                        >
                            <h2>지금 바로 첫 번째 수업을 만들어보세요</h2>
                            <p>디디와 함께라면 수업 준비 시간이 반으로 줄어듭니다.</p>
                            <div className="cta-btn-group">
                                <button className="btn-cta-primary" onClick={() => navigate('/teacher/login')}>
                                    선생님으로 시작하기
                                </button>
                                <button className="btn-cta-outline" onClick={() => navigate('/student/join')}>
                                    학생으로 참여하기
                                </button>
                            </div>
                        </motion.div>
                    </section>
                </div>
            </main>

            <footer className="refined-footer">
                <div className="container">
                    <div className="footer-top">
                        <div className="footer-brand">
                            <span className="footer-logo">☁️ DD Class</span>
                            <p>선생님의 즐거운 수업 파트너, 디디</p>
                        </div>
                        <div className="footer-links">
                            <div className="link-group">
                                <h5>서비스</h5>
                                <a onClick={() => navigate('/fill-blanks')}>빈칸 채우기</a>
                                <a onClick={() => navigate('/order-matching')}>순서 맞추기</a>
                                <a onClick={() => navigate('/free-dnd')}>자유 보드</a>
                            </div>
                            <div className="link-group">
                                <h5>관리</h5>
                                <a onClick={() => navigate('/teacher/dashboard')}>내 보관함</a>
                                <a onClick={() => navigate('/teacher/library')}>라이브러리</a>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>© 2026 DD Class. All rights reserved.</p>
                    </div>
                </div>
            </footer>
            <StudentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                problem={previewProblem}
            />
        </div>
    );
};

export default LandingPage;
