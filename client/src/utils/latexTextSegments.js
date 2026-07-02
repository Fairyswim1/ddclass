/** LaTeX 구분자 기준으로 본문을 분리 (LatexRenderer와 동일 규칙) */
export const LATEX_SEGMENT_REGEX =
  /(\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\\$.*?\\$|\$\$.*?\$\$|\$.*?\$|\\begin\{[\s\S]*?\}[\s\S]*?\\end\{[\s\S]*?\})/g;

/**
 * @param {string} text
 * @returns {{ text: string, startOffset: number, length: number }[]}
 */
export function splitIntoLatexSegments(text) {
  if (!text) return [];

  const segments = [];
  let lastIndex = 0;
  const re = new RegExp(LATEX_SEGMENT_REGEX.source, 'g');
  let match;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const part = text.slice(lastIndex, match.index);
      segments.push({ text: part, startOffset: lastIndex, length: part.length });
    }
    const part = match[0];
    segments.push({ text: part, startOffset: match.index, length: part.length });
    lastIndex = match.index + part.length;
  }

  if (lastIndex < text.length) {
    const part = text.slice(lastIndex);
    segments.push({ text: part, startOffset: lastIndex, length: part.length });
  }

  return segments;
}
