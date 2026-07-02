import React from 'react';
import LatexRenderer from './LatexRenderer';
import { buildSelectableSegments } from '../utils/blankTextSelection';

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
      {buildSelectableSegments(text, baseOffset).map((seg) => (
        <span
          key={`${keyPrefix}-${seg.startOffset}`}
          data-offset={seg.startOffset}
          data-length={seg.length}
          data-is-latex={seg.isLatex ? 'true' : 'false'}
          className={seg.isLatex ? 'latex-selectable-segment' : 'text-selectable-segment'}
          title={seg.isLatex ? '수식을 클릭하면 이 수식만 빈칸으로 지정됩니다' : undefined}
          onMouseDown={seg.isLatex ? (e) => e.preventDefault() : undefined}
        >
          <LatexRenderer text={seg.text} />
        </span>
      ))}
    </>
  );
};

export default LatexSelectableText;
