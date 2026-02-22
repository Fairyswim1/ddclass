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
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();

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
            {/* Sticky Header */}
            <nav className="header-nav sticky-header">
                <div className="brand-logo static-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
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
                        <Gamepad2 size={18} /> 학생 참여
                    </button>
                    {currentUser ? (
                        <div className="user-profile-nav">
                            <span className="user-name"><strong>{currentUser.displayName || '선생님'}</strong>님</span>
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

            <main className="main-content-flow">
                {/* 1. Hero Section */}
                <section className="hero-full-section">
                    <div className="hero-content">
                        <motion.div
                            className="character-floating-wrapper"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                        >
                            <img src="/character.png" alt="DD Character" className="hero-character" />
                            <div className="hero-speech">선생님, 오늘 수업도 디디가 도울게요! ✨</div>
                        </motion.div>

                        <motion.div
                            className="hero-text-area"
                            initial={{ x: -30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                        >
                            <h1 className="hero-title">
                                선생님의 <span className="highlight">아이디어</span>가<br />
                                수업이 되는 순간,<br />
                                <span className="brand-name">DD Class</span>
                            </h1>
                            <p className="hero-subtitle">
                                수업 준비가 즐거워지는 마법! 디디와 함께 쉽고 빠르게<br />
                                아이들이 주인공이 되는 인터랙티브 수업을 설계해 보세요.
                            </p>
                            <div className="hero-cta-group">
                                <button className="btn-hero-primary" onClick={() => navigate('/teacher/login')}>
                                    지금 시작하기 <ArrowRight size={20} />
                                </button>
                                <button className="btn-hero-secondary" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                                    더 알아보기
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Background Deco */}
                    <div className="hero-bg-shapes">
                        <div className="shape circle-1"></div>
                        <div className="shape circle-2"></div>
                        <div className="shape circle-3"></div>
                    </div>
                </section>

                {/* 2. Features Intro Section */}
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
                                    <div className="visual-placeholder yellow">
                                        <div className="placeholder-content">
                                            <p>✨ <strong>빈칸 채우기</strong> 스크린샷이 들어갈 자리입니다</p>
                                        </div>
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
                                    <div className="visual-placeholder green">
                                        <div className="placeholder-content">
                                            <p>✨ <strong>순서 맞추기</strong> 스크린샷이 들어갈 자리입니다</p>
                                        </div>
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
                                    <div className="visual-placeholder blue">
                                        <div className="placeholder-content">
                                            <p>✨ <strong>자유 보드</strong> 스크린샷이 들어갈 자리입니다</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* 3. How It Works Section */}
                <section className="section-padding bg-warm">
                    <div className="container">
                        <header className="section-header text-center">
                            <span className="section-badge">PROCESS</span>
                            <h2>수업 준비부터 모니터링까지 단 3분!</h2>
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

                {/* 4. Library Section */}
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
                                    className="library-mock-grid"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    viewport={{ once: true }}
                                >
                                    {[1, 2, 3, 4].map(n => (
                                        <div key={n} className={`mock-card card-${n}`}></div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. Final CTA Section */}
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
        </div>
    );
};

export default LandingPage;
