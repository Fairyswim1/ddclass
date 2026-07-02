/** OpenAI Responses API — 학생별 생기부 문구 생성 (server-only) */

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4o-mini';

const RECORDS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    records: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          text: { type: 'string', description: '생활기록부 세부능력 및 특기사항용 서술형 문구 (2~4문장)' },
        },
        required: ['name', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['records'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `당신은 한국 초·중·고등학교 교사를 돕는 생활기록부(세부능력 및 특기사항) 작성 보조 AI입니다.

주어진 수업 활동(문제 내용)과 학생의 정답률·시도 횟수를 바탕으로, 교사가 검토 후 사용할 생기부 서술형 문구를 작성합니다.

작성 규칙:
1. 반드시 한국어 존댓말 서술체(~함, ~임, ~보임, ~기대됨 등)로 작성
2. 학생 이름으로 시작 (예: "홍길동 학생은 ...")
3. 문제의 실제 학습 내용(주제, 개념, 사건, 용어 등)을 파악하여 구체적으로 서술
   - 예: 순서 맞추기 문제라면 "근대 개항부터 일제강점기까지의 주요 역사적 사건을 시간의 흐름에 맞게 배열하는 능력을 보임"
4. 정답률에 따라 수행 수준을 반영 (높음: 충실히 이해/정확히 파악, 중간: 기본 이해하나 일부 보완 필요, 낮음: 핵심 개념 이해에 어려움, 추가 지도 필요)
5. 시도 횟수가 많으면(4회 이상) 끈기·성실성 언급, 적고 정답률 높으면 빠른 판단력 언급
6. 문제에 없는 사실을 지어내지 말 것
7. 학생당 2~4문장, 250자 내외
8. 입력된 모든 학생에 대해 records 배열에 한 명씩 반환 (이름 정확히 일치)`;

function getModel() {
  return process.env.OPENAI_STUDENT_RECORD_MODEL || DEFAULT_MODEL;
}

function extractOutputText(data) {
  if (!data?.output) return null;
  for (const item of data.output) {
    if (item.type !== 'message') continue;
    for (const part of item.content || []) {
      if (part.type === 'output_text' && part.text) return part.text;
    }
  }
  return null;
}

function buildUserPrompt({ lessonTitle, students }) {
  const header = lessonTitle
    ? `수업 제목: ${lessonTitle}\n\n`
    : '';

  const body = students.map((student, idx) => {
    const slideLines = (student.slides || []).map((slide, sIdx) => {
      const perf = slide.answered
        ? `정답률 ${slide.accuracy}% (${slide.correct}/${slide.total}), 시도 ${slide.submitCount}회`
        : '미응답';
      return `  [활동 ${sIdx + 1}] 유형: ${slide.typeLabel}\n  내용: ${slide.contentSummary}\n  결과: ${perf}`;
    }).join('\n');

    return `[학생 ${idx + 1}] ${student.name}
전체 정답률: ${student.overallAccuracy !== null ? student.overallAccuracy + '%' : '평가 없음'}
평균 시도 횟수: ${student.avgSubmitCount}회
활동 목록:
${slideLines || '  (평가 가능한 활동 없음 — 수업 참여 태도 위주로 작성)'}`;
  }).join('\n\n');

  return header + body;
}

async function generateStudentRecords({ lessonTitle, students }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  if (!students?.length) {
    return { success: true, records: [] };
  }

  const userPrompt = buildUserPrompt({ lessonTitle, students });

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModel(),
      input: [
        { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'student_records',
          schema: RECORDS_JSON_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || `OpenAI API error (${response.status})`;
    throw new Error(msg);
  }

  const rawText = extractOutputText(data);
  if (!rawText) {
    throw new Error('OpenAI returned an empty response.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Failed to parse OpenAI structured output.');
  }

  return {
    success: true,
    records: Array.isArray(parsed.records) ? parsed.records : [],
  };
}

module.exports = {
  generateStudentRecords,
  getModel,
  DEFAULT_MODEL,
};
