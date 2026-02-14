import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users, Layout, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import ProblemMonitor from './FillBlanks/ProblemMonitor';
import './MonitorPage.css';

const MonitorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [problemData, setProblemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                setLoading(true);
                const docRef = doc(db, 'problems', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProblemData({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setError('문제를 찾을 수 없습니다.');
                }
            } catch (err) {
                console.error('Error fetching problem:', err);
                setError('데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProblem();
    }, [id]);

    if (loading) {
        return (
            <div className="monitor-page-loading">
                <Loader2 className="animate-spin" size={48} />
                <p>실시간 모니터링 환경을 준비 중입니다...</p>
            </div>
        );
    }

    if (error || !problemData) {
        return (
            <div className="monitor-page-error">
                <h2>⚠️ 오류</h2>
                <p>{error || '데이터를 불러올 수 없습니다.'}</p>
                <button className="btn-primary" onClick={() => navigate('/teacher/dashboard')}>
                    보관함으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="monitor-page-wrapper">
            <nav className="monitor-nav">
                <div className="nav-left">
                    <button onClick={() => navigate('/teacher/dashboard')} className="btn-back-dash">
                        <ArrowLeft size={20} /> 보관함으로 돌아가기
                    </button>
                </div>
                <div className="nav-center">
                    <h1 className="problem-title-display">{problemData.title} <span className="type-label">({problemData.type === 'fill-blanks' ? '빈칸 채우기' : problemData.type === 'order-matching' ? '순서 맞추기' : '자유 보드'})</span></h1>
                </div>
                <div className="nav-right">
                    <div className="pin-pill">
                        <span className="label">참여 코드 (PIN)</span>
                        <span className="value">{problemData.pinNumber}</span>
                    </div>
                </div>
            </nav>

            <main className="monitor-content-area">
                <div className="monitor-description">
                    <p>학생들에게 PIN 번호를 공유하고 실시간 진행 상황을 확인하세요.</p>
                </div>
                <div className="monitor-component-container">
                    <ProblemMonitor problemData={problemData} />
                </div>
            </main>
        </div>
    );
};

export default MonitorPage;
