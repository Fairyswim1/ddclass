import React from 'react';
import LatexRenderer from './LatexRenderer';
import './LatexPreviewHint.css';

export function hasLatexMarkup(text) {
  if (!text) return false;
  return text.includes('$') || text.includes('\\[') || text.includes('\\(');
}

/**
 * @param {Object} props
 * @param {string} props.text
 * @param {string} [props.label]
 * @param {boolean} [props.compact]
 */
const LatexPreviewHint = ({ text, label = '✨ 실시간 수식 미리보기', compact = false }) => {
  if (!hasLatexMarkup(text)) return null;

  return (
    <div className={`latex-preview-hint ${compact ? 'compact' : ''}`}>
      <span className="latex-preview-hint-label">{label}</span>
      <div className="latex-preview-hint-body">
        <LatexRenderer text={text} />
      </div>
    </div>
  );
};

export default LatexPreviewHint;
