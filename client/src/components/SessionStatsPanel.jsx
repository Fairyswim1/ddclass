import React, { useMemo, useState } from 'react';
import { X, Copy, Check, BarChart2, TrendingUp, Users, Award, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// 문제 유형별 정답 평가
// ─────────────────────────────────────────────
function evaluateAnswer(problem, answer) {
  if (!problem || answer === undefined || answer === null) {
    return { correct: 0, total: 0, percentage: 0, hasObjective: false, answered: false };
  }

  switch (problem.type) {
    case 'fill-blanks': {
      const blanks = problem.blanks || [];
      const total = blanks.length;
      if (total === 0) return { correct: 0, total: 0, percentage: 0, hasObjective: true, answered: false };
      const answered = typeof answer === 'object' && Object.keys(answer).length > 0;
      const correct = blanks.filter(b => answer[b.id] === b.word).length;
      return { correct, total, percentage: Math.round((correct / total) * 100), hasObjective: true, answered };
    }
    case 'order-matching': {
      const steps = problem.steps || [];
      const total = steps.length;
      if (!Array.isArray(answer) || total === 0) return { correct: 0, total: 0, percentage: 0, hasObjective: true, answered: false };
      const answered = answer.length > 0;
      const correct = steps.filter((step, i) => answer[i]?.id === step.id).length;
      return { correct, total, percentage: Math.round((correct / total) * 100), hasObjective: true, answered };
    }
    case 'multiple-choice': {
      const answerIndices = Array.isArray(problem.answerIndices)
        ? problem.answerIndices
        : problem.answerIndex !== undefined
          ? [problem.answerIndex]
          : [0];
      const studentIndices = Array.isArray(answer)
        ? answer.map(Number).filter(n => !isNaN(n))
        : [parseInt(answer, 10)].filter(n => !isNaN(n));
      const answered = studentIndices.length > 0;
      const isCorrect = answered &&
        answerIndices.every(i => studentIndices.includes(i)) &&
        studentIndices.every(i => answerIndices.includes(i));
      return { correct: isCorrect ? 1 : 0, total: 1, percentage: isCorrect ? 100 : 0, hasObjective: true, answered };
    }
    case 'short-answer': {
      const correctAnswer = problem.answer;
      if (!correctAnswer) return { correct: 0, total: 0, percentage: 0, hasObjective: false, answered: false };
      const studentAnswer = typeof answer === 'string' ? answer : '';
      const answered = studentAnswer.trim().length > 0;
      const isCorrect = answered && studentAnswer.toLowerCase().includes(String(correctAnswer).toLowerCase());
      return { correct: isCorrect ? 1 : 0, total: 1, percentage: isCorrect ? 100 : 0, hasObjective: true, answered };
    }
    case 'poll':
      return { correct: 0, total: 0, percentage: 0, hasObjective: false, answered: answer !== null && answer !== undefined };
    default:
      return { correct: 0, total: 0, percentage: 0, hasObjective: false, answered: false };
  }
}

// ─────────────────────────────────────────────
// 문제 유형 → 자연어 서술 헬퍼
// ─────────────────────────────────────────────
const TYPE_VERBAL = {
  'fill-blanks':      { activity: '빈칸 채우기 문제',   doing: '빈칸을 채우는' },
  'order-matching':   { activity: '순서 맞추기 문제',   doing: '순서를 배열하는' },
  'multiple-choice':  { activity: '객관식 문제',        doing: '선택지를 고르는' },
  'short-answer':     { activity: '주관식 문제',        doing: '답을 서술하는' },
};

// 정답률 → 수행 수준 서술어
function perfPhrase(pct) {
  if (pct === 100) return '모두 정확히 해결함';
  if (pct >= 80)   return '대부분 정확히 이해함';
  if (pct >= 60)   return '기본적인 이해를 보였으나 일부 오답이 있음';
  if (pct >= 40)   return '절반 정도를 이해한 것으로 나타남';
  if (pct >= 20)   return '핵심 개념 파악에 어려움을 보임';
  return '개념 이해가 충분히 이루어지지 않아 추가 지도가 필요함';
}

// ─────────────────────────────────────────────
// 생기부 문구 자동 생성 (문제별 구체 묘사)
// ─────────────────────────────────────────────
function generateRecord(name, overallAccuracy, avgSubmitCount, problems, slideResults) {
  // 평가 가능 슬라이드 + 결과 페어
  const objectivePairs = problems
    .map((p, i) => ({ problem: p, result: slideResults?.[i] }))
    .filter(pair => pair.result?.hasObjective && pair.result?.answered);

  if (objectivePairs.length === 0) {
    const titles = problems.map(p => p.title).filter(Boolean).slice(0, 3);
    const contentRef = titles.length > 0 ? `'${titles.join(', ')}' 등의` : '다양한';
    return `${name} 학생은 ${contentRef} 학습 활동에 성실히 참여하였으며, 적극적인 태도로 수업에 임함.`;
  }

  // 문제별 구체 묘사 (최대 3개)
  const descParts = objectivePairs.slice(0, 3).map(({ problem, result }) => {
    const title = problem.title ? `'${problem.title}'` : null;
    const verbal = TYPE_VERBAL[problem.type];
    const activity = verbal ? verbal.activity : '문제';
    const perf = perfPhrase(result.percentage);

    if (title) {
      // 예: '광합성' 내용의 빈칸 채우기 문제에서 대부분 정확히 이해함
      return `${title} 내용의 ${activity}에서 ${perf}`;
    } else {
      return `${activity}에서 ${perf}`;
    }
  });

  // 앞부분: 문제별 설명 나열
  let base = `${name} 학생은 `;
  if (descParts.length === 1) {
    base += descParts[0] + '.';
  } else if (descParts.length === 2) {
    base += `${descParts[0]}. 또한 ${descParts[1]}.`;
  } else {
    base += `${descParts[0]}. ${descParts[1]}. 아울러 ${descParts[2]}.`;
  }

  // 뒷부분: 종합 평가
  let summary = '';
  if (overallAccuracy >= 85) {
    summary = ' 전반적으로 학습 내용을 충실히 습득하여 높은 성취를 보임.';
  } else if (overallAccuracy >= 60) {
    const weakPairs = objectivePairs.filter(p => p.result.percentage < 50);
    if (weakPairs.length > 0 && weakPairs[0].problem.title) {
      summary = ` '${weakPairs[0].problem.title}' 관련 개념에 대한 추가 학습을 통해 더욱 성장할 수 있을 것으로 기대됨.`;
    } else {
      summary = ' 지속적인 연습을 통해 충분한 성장 가능성이 있음.';
    }
  } else if (overallAccuracy >= 30) {
    summary = ' 핵심 개념에 대한 반복 학습과 교사의 개별 피드백을 통해 오개념 교정이 이루어진다면 발전이 기대됨.';
  } else {
    summary = ' 기초 개념부터 단계적으로 접근하는 개별 맞춤 지도가 효과적일 것으로 판단됨.';
  }

  // 학습 태도 (시도 횟수 기반)
  let effort = '';
  if (avgSubmitCount >= 6) {
    effort = ' 반복적인 시도를 통해 끈기 있게 문제를 해결하려는 태도가 돋보임.';
  } else if (avgSubmitCount <= 2 && overallAccuracy >= 70) {
    effort = ' 빠르고 정확한 판단력으로 효율적인 학습 능력을 보임.';
  }

  return base + summary + effort;
}

// ─────────────────────────────────────────────
// 색상 헬퍼
// ─────────────────────────────────────────────
function accuracyColor(pct) {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#d97706';
  return '#dc2626';
}

function accuracyBg(pct) {
  if (pct >= 80) return '#f0fdf4';
  if (pct >= 50) return '#fffbeb';
  return '#fef2f2';
}

// ─────────────────────────────────────────────
// SessionStatsPanel
// props:
//   mode: 'lesson' | 'problem'
//   students: [{ id, name, answer, answers, submitCount, slideSubmitCounts }]
//   problems: [problemData]  (lesson: 여러 개, problem: 1개)
//   title: string
//   onClose: fn
// ─────────────────────────────────────────────
const SessionStatsPanel = ({ mode = 'lesson', students = [], problems = [], title = '수업', onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // 정답 판별 대상 슬라이드 (객관식/주관식/빈칸/순서만 포함)
  const objectiveProblems = useMemo(() =>
    problems.filter(p => ['fill-blanks', 'order-matching', 'multiple-choice', 'short-answer'].includes(p?.type)),
    [problems]
  );

  // 학생별 통계 계산
  const studentStats = useMemo(() => {
    return students.map(student => {
      // 슬라이드별 결과
      const slideResults = problems.map((prob, idx) => {
        const answer = mode === 'lesson'
          ? (student.answers?.[idx] ?? null)
          : (student.answer ?? null);
        const submitCount = mode === 'lesson'
          ? (student.slideSubmitCounts?.[idx] ?? 0)
          : (student.submitCount ?? 0);
        const eval_ = evaluateAnswer(prob, answer);
        return { ...eval_, submitCount };
      });

      // 객관적 평가 가능한 슬라이드만으로 전체 정확도 계산
      const objectiveResults = slideResults.filter((_, i) => objectiveProblems.includes(problems[i]));
      const totalCorrect = objectiveResults.reduce((acc, r) => acc + r.correct, 0);
      const totalPossible = objectiveResults.reduce((acc, r) => acc + r.total, 0);
      const overallAccuracy = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : null;

      // 평균 제출 횟수 (객관적 슬라이드)
      const submitCounts = objectiveResults.map((r) => r.submitCount).filter(c => c > 0);
      const avgSubmitCount = submitCounts.length > 0
        ? Math.round(submitCounts.reduce((a, b) => a + b, 0) / submitCounts.length)
        : 0;

      const record = generateRecord(student.name, overallAccuracy ?? 0, avgSubmitCount, problems, slideResults);

      return { ...student, slideResults, overallAccuracy, avgSubmitCount, record };
    });
  }, [students, problems, mode, objectiveProblems]);

  // 슬라이드별 평균 정확도
  const slideAvgAccuracy = useMemo(() => {
    return problems.map((prob, idx) => {
      const objectiveStudents = studentStats.filter(s => s.slideResults[idx]?.hasObjective);
      if (objectiveStudents.length === 0) return null;
      const avg = Math.round(
        objectiveStudents.reduce((acc, s) => acc + s.slideResults[idx].percentage, 0) / objectiveStudents.length
      );
      return avg;
    });
  }, [studentStats, problems]);

  const handleCopyRecord = (idx, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleCopyAll = () => {
    const allText = studentStats
      .map(s => `[${s.name}] (정답률: ${s.overallAccuracy !== null ? s.overallAccuracy + '%' : '해당없음'})\n${s.record}`)
      .join('\n\n');
    navigator.clipboard.writeText(allText).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  const handleExcelDownload = () => {
    // 헤더 행
    const slideHeaders = problems.map((p, i) => `${i + 1}.${p?.title || '슬라이드'} (${SLIDE_TYPE_LABEL[p?.type] || p?.type || '?'})`);
    const headers = ['학생 이름', ...slideHeaders, '전체 정답률', '평균 시도 횟수', '생기부 문구'];

    // 학생 데이터 행
    const rows = studentStats.map(student => {
      const slideVals = student.slideResults.map(r => {
        if (!r.hasObjective) return r.answered ? '참여' : '미응답';
        if (!r.answered) return '미응답';
        return `${r.percentage}% (${r.correct}/${r.total}, ${r.submitCount}회)`;
      });
      return [
        student.name,
        ...slideVals,
        student.overallAccuracy !== null ? `${student.overallAccuracy}%` : '—',
        student.avgSubmitCount > 0 ? `${student.avgSubmitCount}회` : '—',
        student.record,
      ];
    });

    // 슬라이드 평균 행
    const slideAvgRow = [
      '슬라이드 평균',
      ...slideAvgAccuracy.map(avg => avg !== null ? `${avg}%` : '—'),
      '', '', '',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, [], slideAvgRow]);

    // 열 너비 조정
    ws['!cols'] = [
      { wch: 14 },
      ...problems.map(() => ({ wch: 22 })),
      { wch: 12 }, { wch: 14 }, { wch: 60 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '수업 통계');
    XLSX.writeFile(wb, `${title || '수업'}_통계.xlsx`);
  };

  const SLIDE_TYPE_LABEL = {
    'fill-blanks': '빈칸',
    'order-matching': '순서',
    'multiple-choice': '객관식',
    'short-answer': '주관식',
    'poll': '투표',
    'whiteboard': '화이트보드',
    'free-drop': '자유보드',
    'image': '이미지',
    'video': '영상',
    'ppt': 'PPT',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#0f172a', borderRadius: '20px', width: '100%', maxWidth: '1100px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)', overflow: 'hidden'
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#6366f1', borderRadius: '10px', padding: '0.5rem', display: 'flex' }}>
              <BarChart2 size={20} color="white" />
            </div>
            <div>
              <h2 style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem', margin: 0 }}>
                수업 세션 통계
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>{title}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleExcelDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', background: '#16a34a',
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600
              }}
            >
              <Download size={14} /> 엑셀 저장
            </button>
            <button
              onClick={handleCopyAll}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', background: copiedAll ? '#16a34a' : '#334155',
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600, transition: 'background 0.2s'
              }}
            >
              {copiedAll ? <Check size={14} /> : <Copy size={14} />}
              {copiedAll ? '복사됨!' : '생기부 전체 복사'}
            </button>
            <button onClick={onClose} style={{
              background: '#334155', border: 'none', borderRadius: '8px',
              color: 'white', cursor: 'pointer', padding: '0.5rem', display: 'flex'
            }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 요약 카드 */}
        <div style={{
          display: 'flex', gap: '1rem', padding: '1rem 1.5rem',
          borderBottom: '1px solid #1e293b', flexShrink: 0
        }}>
          {[
            {
              icon: <Users size={18} color="#818cf8" />,
              label: '참여 학생',
              value: `${students.length}명`,
              bg: '#1e1b4b'
            },
            {
              icon: <TrendingUp size={18} color="#34d399" />,
              label: '전체 평균 정답률',
              value: (() => {
                const withAccuracy = studentStats.filter(s => s.overallAccuracy !== null);
                if (withAccuracy.length === 0) return '—';
                return Math.round(withAccuracy.reduce((a, s) => a + s.overallAccuracy, 0) / withAccuracy.length) + '%';
              })(),
              bg: '#052e16'
            },
            {
              icon: <Award size={18} color="#fbbf24" />,
              label: '평균 시도 횟수',
              value: (() => {
                const counts = studentStats.filter(s => s.avgSubmitCount > 0).map(s => s.avgSubmitCount);
                return counts.length > 0
                  ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) + '회'
                  : '—';
              })(),
              bg: '#1c1400'
            },
            {
              icon: <BarChart2 size={18} color="#f87171" />,
              label: '평가 가능 슬라이드',
              value: `${objectiveProblems.length}/${problems.length}개`,
              bg: '#1c0505'
            },
          ].map((card, i) => (
            <div key={i} style={{
              background: card.bg, borderRadius: '12px', padding: '0.75rem 1.25rem',
              flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                padding: '0.4rem', display: 'flex'
              }}>{card.icon}</div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '2px' }}>{card.label}</div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.05rem' }}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 테이블 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
          {students.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: '3rem', fontSize: '1rem' }}>
              아직 수업에 참여한 학생이 없습니다.
            </div>
          ) : (
            <table style={{
              width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px',
              fontSize: '0.85rem'
            }}>
              <thead>
                <tr>
                  <th style={thStyle('left')}>학생</th>
                  {problems.map((prob, idx) => (
                    <th key={idx} style={thStyle('center')}>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '2px' }}>
                        {SLIDE_TYPE_LABEL[prob?.type] || prob?.type || '?'}
                      </div>
                      <div style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.78rem', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {idx + 1}. {prob?.title || '슬라이드'}
                      </div>
                    </th>
                  ))}
                  <th style={thStyle('center')}>전체 정답률</th>
                  <th style={{ ...thStyle('left'), minWidth: '280px' }}>생기부 문구</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.map((student, sIdx) => (
                  <tr key={student.id || student.name}>
                    <td style={tdStyle('left')}>
                      <div style={{ fontWeight: 600, color: 'white' }}>{student.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                        평균 {student.avgSubmitCount}회 시도
                      </div>
                    </td>
                    {student.slideResults.map((result, pIdx) => (
                      <td key={pIdx} style={tdStyle('center')}>
                        {result.hasObjective ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            <div style={{
                              background: result.answered ? accuracyBg(result.percentage) : '#1e293b',
                              borderRadius: '8px', padding: '4px 8px', fontWeight: 700,
                              color: result.answered ? accuracyColor(result.percentage) : '#475569',
                              fontSize: '0.9rem', minWidth: '52px', textAlign: 'center'
                            }}>
                              {result.answered ? `${result.percentage}%` : '—'}
                            </div>
                            {result.answered && (
                              <div style={{ color: '#64748b', fontSize: '0.68rem' }}>
                                {result.correct}/{result.total} · {result.submitCount}회
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center' }}>
                            {result.answered ? '참여' : '—'}
                          </div>
                        )}
                      </td>
                    ))}
                    <td style={tdStyle('center')}>
                      {student.overallAccuracy !== null ? (
                        <div style={{
                          display: 'inline-block',
                          background: accuracyBg(student.overallAccuracy),
                          color: accuracyColor(student.overallAccuracy),
                          borderRadius: '999px', padding: '4px 14px',
                          fontWeight: 700, fontSize: '1rem'
                        }}>
                          {student.overallAccuracy}%
                        </div>
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle('left')}>
                      <div style={{
                        background: '#1e293b', borderRadius: '10px', padding: '0.6rem 0.75rem',
                        display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
                      }}>
                        <p style={{
                          color: '#cbd5e1', fontSize: '0.78rem', lineHeight: 1.6,
                          margin: 0, flex: 1
                        }}>
                          {student.record}
                        </p>
                        <button
                          onClick={() => handleCopyRecord(sIdx, student.record)}
                          style={{
                            background: copiedIndex === sIdx ? '#16a34a' : '#334155',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            color: 'white', padding: '4px 6px', display: 'flex',
                            flexShrink: 0, transition: 'background 0.2s'
                          }}
                          title="생기부 문구 복사"
                        >
                          {copiedIndex === sIdx ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* 슬라이드별 평균 행 */}
                <tr style={{ borderTop: '2px solid #1e293b' }}>
                  <td style={{ ...tdStyle('left'), color: '#94a3b8', fontWeight: 700, paddingTop: '0.75rem' }}>
                    슬라이드 평균
                  </td>
                  {slideAvgAccuracy.map((avg, idx) => (
                    <td key={idx} style={{ ...tdStyle('center'), paddingTop: '0.75rem' }}>
                      {avg !== null ? (
                        <div style={{
                          background: accuracyBg(avg), color: accuracyColor(avg),
                          borderRadius: '8px', padding: '4px 8px', fontWeight: 700,
                          fontSize: '0.88rem', display: 'inline-block'
                        }}>
                          {avg}%
                        </div>
                      ) : (
                        <span style={{ color: '#475569', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  ))}
                  <td style={{ ...tdStyle('center'), paddingTop: '0.75rem' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>전체 평균</div>
                  </td>
                  <td style={tdStyle('left')} />
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* 푸터 안내 */}
        <div style={{
          padding: '0.75rem 1.5rem', borderTop: '1px solid #1e293b',
          color: '#475569', fontSize: '0.75rem', flexShrink: 0
        }}>
          * 정답률은 현재 제출된 최종 답안 기준 | 시도 횟수는 학생이 답안을 변경한 횟수 | 생기부 문구는 AI 초안으로 교사가 검토 후 사용 권장
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// 스타일 헬퍼
// ─────────────────────────────────────────────
function thStyle(align) {
  return {
    textAlign: align,
    padding: '0.5rem 0.75rem',
    color: '#64748b',
    fontWeight: 600,
    background: '#0f172a',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #1e293b'
  };
}

function tdStyle(align) {
  return {
    textAlign: align,
    padding: '0.6rem 0.75rem',
    verticalAlign: 'middle',
    borderBottom: '1px solid #1e293b'
  };
}

export default SessionStatsPanel;
