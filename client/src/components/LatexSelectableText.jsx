import React from 'react';
import LatexRenderer from './LatexRenderer';
import { splitIntoLatexSegments } from '../utils/latexTextSegments';

/**
 * 빈칸 선택 UI용: LaTeX를 렌더링하면서 data-offset/data-length를 유지합니다.
 * @param {Object} props
 * @param {string} props.text
 * @param {number} [props.baseOffset]
 * @param {string} [props.keyPrefix]
 */
const LatexSelectableText = ({ text, baseOffset = 0, keyPrefix = 'seg' }) => {
  if (!text) return null;

  return (
    <>
      {splitIntoLatexSegments(text).map((seg) => {
        const isLatex = /^\$|\\\[|\\\(|\\begin/.test(seg.text.trim());
        return (
        <span
          key={`${keyPrefix}-${baseOffset + seg.startOffset}`}
          data-offset={baseOffset + seg.startOffset}
          data-length={seg.length}
          data-is-latex={isLatex ? 'true' : 'false'}
          className={isLatex ? 'latex-selectable-segment' : undefined}
          title={isLatex ? '수식을 클릭하면 빈칸으로 지정됩니다' : undefined}
        >
          <LatexRenderer text={seg.text} />
        </span>
      );
      })}
    </>
  );
};

export default LatexSelectableText;
