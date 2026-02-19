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
    BookOpen
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
            {/* Top Bar */}
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
                    <button className="btn-ghost" onClick={() => navigate('/teacher/library')}>
                        <BookOpen size={18} /> 라이브러리
                    </button>
                    <button className="btn-ghost" onClick={() => navigate('/student/join')}>
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

            <main className="main-container">
                <section className="welcome-section">
                    <motion.div
                        className="character-container"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 100 }}
                    >
                        <img src="/character.png" alt="DD Character" className="main-character-refined" />
                        <div className="speech-bubble">선생님, 오늘 수업도 디디가 도울게요! ✨</div>
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
                </section>

                {/* Right Side: Game Cards */}
                <section className="modes-section">
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
                </section>
            </main>

            <footer className="landing-footer">
                © 2026 DD Class - 선생님의 즐거운 수업 파트너, 디디
            </footer>
        </div >
    );
};

export default LandingPage;
