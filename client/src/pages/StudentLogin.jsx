import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowRight, Play } from 'lucide-react';
import './StudentLogin.css';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
            // Firestore에서 PIN으로 직접 문제 검색
            const q = query(
                collection(db, 'problems'),
                where('pinNumber', '==', pin)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const problemDoc = querySnapshot.docs[0];
                const problemData = problemDoc.data();
                const problemType = problemData.type;

                if (problemType === 'order-matching') {
                    navigate('/student/order-matching', {
                        state: { pin, nickname, autoJoin: true }
                    });
                } else if (problemType === 'free-drop') {
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
            alert('데이터 조회 중 오류가 발생했습니다: ' + error.message);
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
