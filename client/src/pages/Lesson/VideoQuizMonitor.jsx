import React, { useState } from 'react';
import { User, CheckCircle, XCircle, Clock } from 'lucide-react';

const fmtSec = (sec) => {
  const s = Math.max(0, parseInt(sec, 10) || 0);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

function formatStudentQuizAnswer(quiz, rawAnswer) {
  if (rawAnswer === undefined || rawAnswer === null) return null;
  if (quiz.type === 'multiple-choice') {
    const idx = typeof rawAnswer === 'number' ? rawAnswer : parseInt(rawAnswer, 10);
    if (!Number.isNaN(idx) && quiz.options?.[idx] !== undefined) {
      return quiz.options[idx];
    }
    return String(rawAnswer);
  }
  return String(rawAnswer);
}

function getCorrectAnswerLabel(quiz) {
  if (quiz.type === 'multiple-choice') {
    return quiz.options?.[quiz.answerIndex] ?? '—';
  }
  return quiz.answer || '—';
}

const VideoQuizMonitor = ({ problemData, parentStudents = [] }) => {
  const quizPoints = [...(problemData?.quizPoints || [])].sort(
    (a, b) => (a.timeSeconds ?? 0) - (b.timeSeconds ?? 0)
  );
  const [expandedQuizId, setExpandedQuizId] = useState(quizPoints[0]?.id ?? null);

  if (quizPoints.length === 0) {
    return (
      <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.9rem' }}>
        이 영상에는 중간 퀴즈가 없습니다.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 800, color: '#334155' }}>
        📝 영상 퀴즈 응답 현황
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {quizPoints.map((quiz, index) => {
          const isOpen = expandedQuizId === quiz.id;
          const responses = parentStudents.map((student) => {
            const slideAnswer = student.answer;
            const entry = slideAnswer?.__videoQuiz ? slideAnswer[quiz.id] : null;
            return {
              student,
              entry,
              displayAnswer: entry ? formatStudentQuizAnswer(quiz, entry.answer) : null,
              isCorrect: entry?.isCorrect === true,
              hasAnswer: !!entry,
            };
          });
          const answeredCount = responses.filter((r) => r.hasAnswer).length;
          const correctCount = responses.filter((r) => r.isCorrect).length;

          return (
            <div
              key={quiz.id}
              style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: 'white' }}
            >
              <button
                type="button"
                onClick={() => setExpandedQuizId(isOpen ? null : quiz.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: isOpen ? '#eef2ff' : '#f8fafc',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6366f1', background: '#e0e7ff', borderRadius: '999px', padding: '2px 8px' }}>
                      퀴즈 {index + 1}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                      <Clock size={12} /> {fmtSec(quiz.timeSeconds)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {quiz.type === 'multiple-choice' ? '객관식' : '주관식'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
                    {quiz.question || '(질문 없음)'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>응답 {answeredCount}/{parentStudents.length}</div>
                  <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>정답 {correctCount}명</div>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '0.85rem 1rem 1rem', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    정답: <strong style={{ color: '#16a34a' }}>{getCorrectAnswerLabel(quiz)}</strong>
                  </div>

                  {parentStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem 0', fontSize: '0.88rem' }}>
                      접속한 학생이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
                      {responses.map(({ student, displayAnswer, isCorrect, hasAnswer }) => (
                        <div
                          key={student.id || student.name}
                          style={{
                            border: '2px solid',
                            borderColor: !hasAnswer ? '#e2e8f0' : isCorrect ? '#86efac' : '#fca5a5',
                            background: !hasAnswer ? '#f8fafc' : isCorrect ? '#f0fdf4' : '#fef2f2',
                            borderRadius: '10px',
                            padding: '0.75rem',
                            minHeight: '88px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <User size={13} color="#64748b" />
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {student.name}
                            </span>
                          </div>
                          {hasAnswer ? (
                            <>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.35, wordBreak: 'break-word' }}>
                                {displayAnswer}
                              </div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 800, color: isCorrect ? '#16a34a' : '#dc2626' }}>
                                {isCorrect ? <CheckCircle size={13} /> : <XCircle size={13} />}
                                {isCorrect ? '정답' : '오답'}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>미응답</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VideoQuizMonitor;
