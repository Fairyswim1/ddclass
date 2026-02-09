import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Type,
    ListOrdered,
    Move,
    ArrowRight,
    Gamepad2,
    LogIn,
    PlayCircle
} from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    const services = [
        {
            id: 'fill-blanks',
            title: '빈칸 채우기',
            description: '문맥을 파악해 빈칸을 채우는 학습 활동입니다. 어휘력과 독해력을 향상시킵니다.',
            icon: <Type size={32} />,
            gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', // Indigo to Violet
            path: '/fill-blanks'
        },
        {
            id: 'order-matching',
            title: '순서 맞추기',
            description: '논리적인 순서대로 카드를 배열하는 활동입니다. 사고력과 절차적 지식을 기릅니다.',
            icon: <ListOrdered size={32} />,
            gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', // Coral to Orange
            path: '/order-matching'
        },
        {
            id: 'free-dnd',
            title: '자유 보드',
            description: '자유롭게 아이템을 배치하며 창의적인 활동을 할 수 있는 캔버스입니다.',
            icon: <Move size={32} />,
            gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', // Cyan to Blue
            path: '/free-dnd'
        }
    ];

    return (
        <div className="landing-page">
            {/* Navbar */}
            <nav className="global-nav">
                <div className="logo">Draggable Class</div>
                <div className="nav-actions">
                    <button className="btn-pin-entry" onClick={() => navigate('/student/join')}>
                        <Gamepad2 size={18} style={{ marginRight: '8px' }} />
                        Game PIN
                    </button>
                    <button className="btn-login-entry">
                        <LogIn size={18} style={{ marginRight: '8px' }} />
                        Login
                    </button>
                </div>
            </nav>

            <div className="split-layout">
                {/* LEFT: Brand Section */}
                <div className="left-panel">
                    <div className="brand-bg-text">D&D</div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="brand-content"
                    >
                        <h1>
                            수업을 <span className="highlight">생동감</span> 있게,<br />
                            학습을 <span className="highlight">몰입감</span> 있게.
                        </h1>
                        <p>
                            단순한 클릭을 넘어, 드래그 앤 드롭으로 완성하는<br />
                            새로운 차원의 인터랙티브 클래스룸을 경험하세요.
                        </p>

                        <div className="brand-actions">
                            <button
                                className="btn-create-start"
                                style={{
                                    background: '#0f172a',
                                    color: 'white',
                                    borderRadius: '12px',
                                    padding: '1rem 2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <PlayCircle size={20} />
                                무료로 시작하기
                            </button>
                            <button className="btn-tutorial">
                                튜토리얼 보기
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT: Services Section (Expanding Cards) */}
                <div className="right-panel">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index, duration: 0.6 }}
                            className="service-card-vertical"
                            onClick={() => navigate(service.path)}
                        >
                            <div
                                className="card-bg"
                                style={{ background: service.gradient }}
                            ></div>

                            <div className="card-content">
                                <div className="card-icon">
                                    {service.icon}
                                </div>
                                <h3 className="card-title">{service.title}</h3>
                                <p className="card-desc">{service.description}</p>

                                <div className="arrow-btn">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
