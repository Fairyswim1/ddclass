import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowRight } from 'lucide-react';
import './FillBlanks/StudentMode.css'; // Reusing existing styles

const StudentLogin = () => {
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [nickname, setNickname] = useState('');

    const handleJoin = async () => {
        if (!pin || !nickname) {
            alert('PIN 번호와 닉네임을 모두 입력해주세요.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/find-problem/${pin}`);
            const data = await response.json();

            if (data.success) {
                if (data.type === 'order-matching') {
                    navigate('/student/order-matching', {
                        state: { pin, nickname, autoJoin: true }
                    });
                } else if (data.type === 'free-drop') {
                    navigate('/student/free-dnd', {
                        state: { pin, nickname, autoJoin: true }
                    });
                } else {
                    // Default to fill-blanks
                    navigate('/student/fill-blanks', {
                        state: { pin, nickname, autoJoin: true }
                    });
                }
            } else {
                alert('유효하지 않은 PIN 번호입니다.');
            }
        } catch (error) {
            console.error('Login Error:', error);
            alert('서버 연결 오류');
        }
    };

    return (
        <div className="student-login-container">
            <div className="login-card glass-panel">
                <div className="icon-circle">
                    <User size={32} color="white" />
                </div>
                <h2>Game Entry</h2>
                <p style={{ marginBottom: '1rem', color: '#64748b' }}>PIN 번호를 입력하여 화이트보드에 입장하세요.</p>

                <input
                    type="text"
                    placeholder="PIN 번호 (6자리)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={6}
                />
                <input
                    type="text"
                    placeholder="닉네임"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                />
                <button className="btn-primary" onClick={handleJoin}>
                    입장하기 <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default StudentLogin;
