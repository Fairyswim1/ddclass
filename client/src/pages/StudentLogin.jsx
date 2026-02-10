import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowRight, Play } from 'lucide-react';
import './StudentLogin.css';

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
            <div className="login-card-round">
                <div className="login-header">
                    <img src="/character.png" alt="DD" className="login-character-mini" />
                    <h2>교실 입장하기</h2>
                    <p style={{ color: '#8D7B75' }}>선생님이 알려주신 PIN 번호를 입력하세요!</p>
                </div>

                <div className="input-box">
                    <input
                        type="text"
                        placeholder="PIN 번호 (6자리)"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={6}
                    />
                    <input
                        type="text"
                        placeholder="나만의 닉네임"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                    />
                </div>

                <button className="btn-primary" onClick={handleJoin}>
                    신나게 공부 시작! <Play size={20} fill="currentColor" />
                </button>
            </div>
        </div>
    );
};

export default StudentLogin;
