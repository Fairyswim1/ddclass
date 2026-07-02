import React from 'react';
import { Camera } from 'lucide-react';
import { openImageToLatexWindow } from './openImageToLatexWindow';
import './ImageToLatex.css';

const DidiTipLatexOcrButton = () => (
  <button
    type="button"
    className="btn-latex-ocr-tip"
    onClick={openImageToLatexWindow}
  >
    <Camera size={16} />
    이미지 → LaTeX 변환
  </button>
);

export default DidiTipLatexOcrButton;
