import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import MathImageOcrModal from './MathImageOcrModal';
import { insertTextAtCursor, focusWithCursor } from '../../utils/insertAtCursor';
import './ImageToLatex.css';

/**
 * @param {Object} props
 * @param {React.RefObject<HTMLTextAreaElement|HTMLInputElement>} [props.targetRef]
 * @param {() => HTMLTextAreaElement|HTMLInputElement|null} [props.getTargetElement]
 * @param {string} props.value
 * @param {(newValue: string) => void} props.onChange
 * @param {string} [props.className]
 * @param {boolean} [props.small]
 */
const ImageToLatexButton = ({
  targetRef,
  getTargetElement,
  value,
  onChange,
  className = '',
  small = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleInsert = (latexText) => {
    const el = getTargetElement?.() ?? targetRef?.current ?? null;
    const { newValue, cursorPos } = insertTextAtCursor(el, value, latexText);
    onChange(newValue);
    focusWithCursor(el, cursorPos);
  };

  return (
    <>
      <button
        type="button"
        className={`btn-latex-toggle ${small ? 'sm' : ''} ${className}`.trim()}
        onClick={() => setModalOpen(true)}
        title="수식 이미지를 LaTeX로 변환"
      >
        <Camera size={small ? 12 : 14} />
        {!small && ' 이미지→LaTeX'}
      </button>
      <MathImageOcrModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onInsert={handleInsert}
      />
    </>
  );
};

export default ImageToLatexButton;
