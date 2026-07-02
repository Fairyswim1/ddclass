/** OpenAI Responses API — math image → LaTeX (server-only) */

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const DEFAULT_MODEL = 'gpt-4o-mini';

const OCR_JSON_SCHEMA = {
  type: 'object',
  properties: {
    latexText: {
      type: 'string',
      description: 'Full problem text with inline math as \\( ... \\) and display math as \\[ ... \\]',
    },
    plainText: {
      type: 'string',
      description: 'Problem text with math portions removed or summarized',
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Parts marked [확인 필요: ...] or other uncertainty notes',
    },
    confidence: {
      type: 'number',
      description: 'Confidence score from 0.0 to 1.0',
    },
  },
  required: ['latexText', 'plainText', 'warnings', 'confidence'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a math OCR assistant for Korean teachers creating quiz problems.
Read the uploaded image and convert visible problem text into LaTeX-inclusive text for a quiz input field.

Rules:
- Inline math: \\( ... \\)
- Display math: \\[ ... \\]
- Preserve problem number, choices, conditions, and wording order as shown
- Do NOT generate solutions
- Do NOT infer or guess answers
- Only transcribe visible problem text and formulas
- If uncertain, include [확인 필요: ...] in latexText and add a matching entry in warnings
- Keep Korean text as-is when visible`;

function getModel() {
  return process.env.OPENAI_MATH_OCR_MODEL || DEFAULT_MODEL;
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

async function callOpenAiImageToLatex(base64DataUrl, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModel(),
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: SYSTEM_PROMPT },
            {
              type: 'input_image',
              image_url: base64DataUrl,
              detail: 'high',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'math_ocr_result',
          schema: OCR_JSON_SCHEMA,
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
    latexText: parsed.latexText || '',
    plainText: parsed.plainText || '',
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
  };
}

module.exports = {
  getModel,
  DEFAULT_MODEL,
  callOpenAiImageToLatex,
};
