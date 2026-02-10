import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, ArrowLeft, Loader2 } from 'lucide-react';
import './TeacherLogin.css';

const TeacherLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { loginWithGoogle, currentUser } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (currentUser) {
            navigate('/teacher/dashboard');
        }
    }, [currentUser, navigate]);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError('');
            await loginWithGoogle();
            navigate('/teacher/dashboard');
        } catch (err) {
            console.error(err);
            setError('로그인에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <nav className="header-nav">
                <button className="btn-back" onClick={() => navigate('/')}>
                    <ArrowLeft size={18} /> 홈으로
                </button>
            </nav>

            <main className="login-main">
                <motion.div
                    className="login-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="login-header">
                        <div className="login-logo">
                            <span className="logo-icon">☁️</span>
                            <h2>DD Class 선생님 로그인</h2>
                        </div>
                        <p>오늘도 아이들과 함께하는 즐거운 수업을 시작해볼까요? ✨</p>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="login-actions">
                        <button
                            className="btn-google-login"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                            )}
                            Google 계정으로 로그인
                        </button>
                    </div>

                    <div className="login-footer">
                        <p>구글 계정으로 간편하게 시작하세요.</p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default TeacherLogin;
