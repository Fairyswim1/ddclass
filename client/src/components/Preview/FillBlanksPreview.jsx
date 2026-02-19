import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import LatexRenderer from '../LatexRenderer';
import '../../pages/FillBlanks/StudentMode.css';

const FillBlanksPreview = ({ problem }) => {
    const [userAnswers, setUserAnswers] = useState({});
    const [draggedWord, setDraggedWord] = useState(null);
    const [shuffledWords, setShuffledWords] = useState([]);

    useEffect(() => {
        if (problem) {
            const words = problem.blanks.map(b => b.word);
            setShuffledWords([...words].sort(() => Math.random() - 0.5));
        }
    }, [problem]);

    const handleDragStart = (e, word) => {
        setDraggedWord(word);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, blankId) => {
        e.preventDefault();
        if (draggedWord) {
            setUserAnswers({ ...userAnswers, [blankId]: draggedWord });
            setDraggedWord(null);
        }
    };

    const handleRemoveAnswer = (blankId) => {
        const newAnswers = { ...userAnswers };
        delete newAnswers[blankId];
        setUserAnswers(newAnswers);
    };

    const renderTextWithBlanks = () => {
        if (!problem) return null;
        const words = problem.originalText.split(/\s+/);
        const blankMap = new Map(problem.blanks.map(b => [b.index, b]));

        return (
            <div className="text-content">
                {words.map((word, index) => {
                    if (blankMap.has(index)) {
                        const blank = blankMap.get(index);
                        const userAnswer = userAnswers[blank.id];

                        return (
                            <span
                                key={index}
                                className={`blank-slot ${userAnswer ? 'filled' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, blank.id)}
                                onClick={() => userAnswer && handleRemoveAnswer(blank.id)}
                            >
                                {userAnswer ? (
                                    <>
                                        <LatexRenderer text={userAnswer} />
                                        <button className="btn-remove-word">
                                            <X size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <span className="placeholder">&nbsp;</span>
                                )}
                            </span>
                        );
                    }
                    return <span key={index} className="normal-word"><LatexRenderer text={word} /> </span>;
                })}
            </div>
        );
    };

    const renderWordBank = () => {
        if (!problem) return null;
        let visibleWords = [];

        if (problem.allowDuplicates) {
            const uniqueWords = [...new Set(shuffledWords)];
            visibleWords = uniqueWords.map(word => ({ word, id: word }));
        } else {
            const usedValues = Object.values(userAnswers);
            const remainingWords = [...shuffledWords];
            usedValues.forEach(used => {
                const idx = remainingWords.indexOf(used);
                if (idx > -1) remainingWords.splice(idx, 1);
            });
            visibleWords = remainingWords.map((word, i) => ({ word, id: `${word}-${i}` }));
        }

        return (
            <div className="word-bank">
                <h3>단어 카드 {problem.allowDuplicates ? '(무한)' : '(드래그)'}</h3>
                <div className="cards-grid">
                    {visibleWords.map((item) => (
                        <div
                            key={item.id}
                            className="word-card draggable"
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.word)}
                        >
                            <LatexRenderer text={item.word} />
                        </div>
                    ))}
                    {visibleWords.length === 0 && (
                        <div className="empty-bank-message">모든 카드를 사용했습니다! 🎉</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fb-student-container" style={{ minHeight: 'auto', background: 'transparent' }}>
            <main className="fb-game-content" style={{ padding: '1rem 0' }}>
                <div className="problem-area">
                    <h2 className="problem-title"><LatexRenderer text={problem.title} /></h2>
                    <div className="text-display">
                        {renderTextWithBlanks()}
                    </div>
                </div>

                <div className="game-sidebar">
                    {Object.keys(userAnswers).length === problem?.blanks.length && (
                        <div className="result-card fade-in">
                            <h3>🎉 미리보기 완료!</h3>
                            <div className="score-display">
                                <span>{problem.blanks.filter(b => userAnswers[b.id] === b.word).length} / {problem.blanks.length} 정답</span>
                            </div>
                        </div>
                    )}
                    {renderWordBank()}
                </div>
            </main>
        </div>
    );
};

export default FillBlanksPreview;
