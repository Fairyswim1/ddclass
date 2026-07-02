import { resolveApiUrl } from './url';

const TYPE_LABEL = {
  'fill-blanks': '빈칸 채우기',
  'order-matching': '순서 맞추기',
  'multiple-choice': '객관식',
  'short-answer': '주관식',
  'poll': '투표',
  'whiteboard': '화이트보드',
  'free-drop': '자유 보드',
  'image': '이미지',
  'video': '동영상',
  'ppt': 'PPT',
  'website': '웹사이트',
};

/** LaTeX/마크업 제거 후 평문으로 */
export function stripLatexForRecord(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = 280) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function optionText(opt) {
  if (typeof opt === 'object' && opt !== null) return stripLatexForRecord(opt.text || '');
  return stripLatexForRecord(String(opt || ''));
}

/** 문제 데이터에서 AI/템플릿용 내용 요약 추출 */
export function summarizeProblemForRecord(problem) {
  if (!problem) return '학습 활동';

  const parts = [];
  const title = stripLatexForRecord(problem.title);
  if (title) parts.push(`제목: ${title}`);

  switch (problem.type) {
    case 'fill-blanks': {
      const text = stripLatexForRecord(problem.originalText);
      if (text) parts.push(`지문: ${truncate(text)}`);
      const words = (problem.blanks || []).map((b) => b.word).filter(Boolean);
      if (words.length) parts.push(`핵심 어휘: ${words.join(', ')}`);
      break;
    }
    case 'order-matching': {
      const steps = (problem.steps || []).map((s) => stripLatexForRecord(s.text)).filter(Boolean);
      if (steps.length) parts.push(`순서 배열 항목: ${steps.join(' → ')}`);
      break;
    }
    case 'multiple-choice': {
      const q = stripLatexForRecord(problem.question);
      if (q) parts.push(`문제: ${truncate(q)}`);
      const opts = (problem.options || []).map(optionText).filter(Boolean);
      if (opts.length) parts.push(`선택지: ${opts.join(' / ')}`);
      break;
    }
    case 'short-answer': {
      const q = stripLatexForRecord(problem.question);
      if (q) parts.push(`문제: ${truncate(q)}`);
      break;
    }
    case 'video': {
      const quizzes = (problem.quizPoints || [])
        .map((q) => stripLatexForRecord(q.question))
        .filter(Boolean);
      if (quizzes.length) parts.push(`영상 퀴즈: ${quizzes.join(' / ')}`);
      break;
    }
    case 'free-drop': {
      const q = stripLatexForRecord(problem.question);
      if (q) parts.push(`활동 주제: ${truncate(q)}`);
      const items = (problem.items || [])
        .filter((i) => i.type === 'text' && i.content)
        .map((i) => stripLatexForRecord(i.content))
        .filter(Boolean);
      if (items.length) parts.push(`카드 내용: ${items.join(', ')}`);
      break;
    }
    case 'whiteboard':
    case 'poll': {
      const q = stripLatexForRecord(problem.question);
      if (q) parts.push(`주제: ${truncate(q)}`);
      break;
    }
    default:
      break;
  }

  return parts.length > 0 ? parts.join(' | ') : (title || TYPE_LABEL[problem.type] || '학습 활동');
}

const PERF_PHRASE = {
  100: '모두 정확히 해결함',
  80: '대부분 정확히 이해함',
  60: '기본적인 이해를 보였으나 일부 오답이 있음',
  40: '절반 정도를 이해한 것으로 나타남',
  20: '핵심 개념 파악에 어려움을 보임',
  0: '개념 이해가 충분히 이루어지지 않아 추가 지도가 필요함',
};

function perfPhrase(pct) {
  if (pct === 100) return PERF_PHRASE[100];
  if (pct >= 80) return PERF_PHRASE[80];
  if (pct >= 60) return PERF_PHRASE[60];
  if (pct >= 40) return PERF_PHRASE[40];
  if (pct >= 20) return PERF_PHRASE[20];
  return PERF_PHRASE[0];
}

/** API 실패 시 사용하는 규칙 기반 폴백 */
export function generateRecordFallback(name, overallAccuracy, avgSubmitCount, problems, slideResults) {
  const objectivePairs = problems
    .map((p, i) => ({ problem: p, result: slideResults?.[i] }))
    .filter((pair) => pair.result?.hasObjective && pair.result?.answered);

  if (objectivePairs.length === 0) {
    const summaries = problems.map((p) => summarizeProblemForRecord(p)).filter((s) => s !== '학습 활동').slice(0, 2);
    const contentRef = summaries.length > 0 ? summaries[0] : '다양한';
    return `${name} 학생은 ${contentRef} 학습 활동에 성실히 참여하였으며, 적극적인 태도로 수업에 임함.`;
  }

  const descParts = objectivePairs.slice(0, 3).map(({ problem, result }) => {
    const summary = summarizeProblemForRecord(problem);
    const perf = perfPhrase(result.percentage);
    return `${summary} 활동에서 ${perf}`;
  });

  let base = `${name} 학생은 `;
  if (descParts.length === 1) {
    base += `${descParts[0]}.`;
  } else if (descParts.length === 2) {
    base += `${descParts[0]}. 또한 ${descParts[1]}.`;
  } else {
    base += `${descParts[0]}. ${descParts[1]}. 아울러 ${descParts[2]}.`;
  }

  let summary = '';
  if (overallAccuracy >= 85) {
    summary = ' 전반적으로 학습 내용을 충실히 습득하여 높은 성취를 보임.';
  } else if (overallAccuracy >= 60) {
    summary = ' 지속적인 연습을 통해 충분한 성장 가능성이 있음.';
  } else if (overallAccuracy >= 30) {
    summary = ' 핵심 개념에 대한 반복 학습과 교사의 개별 피드백을 통해 발전이 기대됨.';
  } else {
    summary = ' 기초 개념부터 단계적으로 접근하는 개별 맞춤 지도가 효과적일 것으로 판단됨.';
  }

  let effort = '';
  if (avgSubmitCount >= 6) {
    effort = ' 반복적인 시도를 통해 끈기 있게 문제를 해결하려는 태도가 돋보임.';
  } else if (avgSubmitCount <= 2 && overallAccuracy >= 70) {
    effort = ' 빠르고 정확한 판단력으로 효율적인 학습 능력을 보임.';
  }

  return base + summary + effort;
}

/** API 요청용 학생 데이터 구성 (slideResults 포함) */
export function buildStudentRecordPayloadFromStats({ lessonTitle, studentStats, problems }) {
  return {
    lessonTitle: lessonTitle || '',
    students: studentStats.map((student) => ({
      name: student.name,
      overallAccuracy: student.overallAccuracy,
      avgSubmitCount: student.avgSubmitCount ?? 0,
      slides: problems.map((prob, idx) => {
        const result = student.slideResults?.[idx];
        return {
          typeLabel: TYPE_LABEL[prob?.type] || prob?.type || '활동',
          contentSummary: summarizeProblemForRecord(prob),
          answered: result?.answered ?? false,
          accuracy: result?.percentage ?? 0,
          correct: result?.correct ?? 0,
          total: result?.total ?? 0,
          submitCount: result?.submitCount ?? 0,
        };
      }),
    })),
  };
}

export async function fetchStudentRecords(payload) {
  const res = await fetch(resolveApiUrl('/api/generate-student-records'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || '생기부 문구 생성에 실패했습니다.');
  }
  return data;
}

/** API 응답을 학생 순서에 맞게 병합 */
export function mergeAiRecords(studentStats, apiRecords, problems, fallbackFn) {
  const byName = new Map((apiRecords || []).map((r) => [r.name, r.text]));

  return studentStats.map((student) => {
    const aiText = byName.get(student.name);
    const record = aiText?.trim()
      ? aiText.trim()
      : fallbackFn(
        student.name,
        student.overallAccuracy ?? 0,
        student.avgSubmitCount ?? 0,
        problems,
        student.slideResults
      );
    return { ...student, record, recordSource: aiText ? 'ai' : 'fallback' };
  });
}
