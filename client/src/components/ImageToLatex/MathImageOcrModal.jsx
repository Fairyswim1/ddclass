import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import LatexRenderer from '../LatexRenderer';
import { useImageToLatex } from '../../hooks/useImageToLatex';
import {
  IMAGE_TO_LATEX_ACCEPT,
  validateImageToLatexFile,
} from '../../utils/imageToLatexValidation';
import './ImageToLatex.css';

/** @typedef {'idle' | 'preview' | 'loading' | 'success' | 'error'} ModalPhase */

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(latexText: string) => void} props.onInsert
 */
const MathImageOcrModal = ({ open, onClose, onInsert }) => {
  const fileInputRef = useRef(null);
  const { convertImage, loading, error, reset } = useImageToLatex();

  const [phase, setPhase] = useState(/** @type {ModalPhase} */ ('idle'));
  const [selectedFile, setSelectedFile] = useState(/** @type {File | null} */ (null));
  const [previewUrl, setPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');
  const [editableLatex, setEditableLatex] = useState('');
  const [warnings, setWarnings] = useState(/** @type {string[]} */ ([]));
  const [confidence, setConfidence] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const cleanupPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const resetState = useCallback(() => {
    cleanupPreview();
    setPhase('idle');
    setSelectedFile(null);
    setPreviewUrl('');
    setLocalError('');
    setEditableLatex('');
    setWarnings([]);
    setConfidence(null);
    setIsDragging(false);
    reset();
  }, [cleanupPreview, reset]);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  useEffect(() => () => cleanupPreview(), [cleanupPreview]);

  const handleFile = useCallback((file) => {
    setLocalError('');
    reset();

    const validation = validateImageToLatexFile(file);
    if (!validation.valid) {
      setLocalError(validation.error);
      setPhase('error');
      return;
    }

    cleanupPreview();
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setPhase('preview');
    setEditableLatex('');
    setWarnings([]);
    setConfidence(null);
  }, [cleanupPreview, reset]);

  const handleConvert = useCallback(async () => {
    if (!selectedFile) return;
    setPhase('loading');
    setLocalError('');

    const result = await convertImage(selectedFile);

    if (!result.success) {
      setLocalError(result.error);
      setPhase('error');
      return;
    }

    setEditableLatex(result.latexText || '');
    setWarnings(result.warnings || []);
    setConfidence(result.confidence ?? null);
    setPhase('success');
  }, [selectedFile, convertImage]);

  const handleInsert = useCallback(() => {
    if (!editableLatex.trim()) {
      setLocalError('삽입할 내용이 없습니다.');
      return;
    }
    onInsert(editableLatex);
    onClose();
  }, [editableLatex, onInsert, onClose]);

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onPaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  }, [handleFile]);

  if (!open) return null;

  const displayError = localError || error;
  const showDropzone = phase === 'idle' || phase === 'error';

  return (
    <div className="image-to-latex-overlay" onClick={onClose}>
      <div
        className="image-to-latex-modal"
        onClick={(e) => e.stopPropagation()}
        onPaste={onPaste}
      >
        <div className="image-to-latex-modal-header">
          <h3>이미지 → LaTeX 변환</h3>
          <button type="button" className="image-to-latex-modal-close" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="image-to-latex-modal-body">
          <p className="image-to-latex-disclaimer">
            AI 변환 결과는 오류가 있을 수 있으니 저장 전 반드시 확인하세요.
          </p>

          {showDropzone && (
            <div
              className={`image-to-latex-dropzone ${isDragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <Upload size={28} color="#FF8E4B" />
              <p><strong>클릭</strong>하거나 이미지를 <strong>끌어다 놓으세요</strong></p>
              <p>Ctrl+V로 캡처 이미지 붙여넣기 · png, jpg, webp · 5MB 이하</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_TO_LATEX_ACCEPT}
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />

          {previewUrl && phase !== 'idle' && (
            <img src={previewUrl} alt="업로드 미리보기" className="image-to-latex-preview-img" />
          )}

          {phase === 'loading' && (
            <div className="image-to-latex-status">
              <Loader2 size={18} className="animate-spin" />
              AI가 수식을 변환하는 중...
            </div>
          )}

          {displayError && (phase === 'error' || phase === 'preview') && phase !== 'loading' && (
            <div className="image-to-latex-error">{displayError}</div>
          )}

          {phase === 'success' && (
            <>
              {confidence != null && (
                <div className="image-to-latex-confidence">
                  신뢰도: {Math.round(confidence * 100)}%
                </div>
              )}
              {warnings.length > 0 && (
                <ul className="image-to-latex-warnings">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <label htmlFor="ocr-latex-edit">변환 결과 (수정 가능)</label>
              <textarea
                id="ocr-latex-edit"
                className="image-to-latex-result-textarea"
                value={editableLatex}
                onChange={(e) => setEditableLatex(e.target.value)}
              />
              {editableLatex && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                    미리보기
                  </div>
                  <div className="image-to-latex-preview-box">
                    <LatexRenderer text={editableLatex} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="image-to-latex-modal-footer">
          <button type="button" className="image-to-latex-btn-secondary" onClick={onClose}>
            취소
          </button>
          {(phase === 'preview' || (phase === 'error' && selectedFile)) && (
            <button
              type="button"
              className="image-to-latex-btn-convert"
              onClick={handleConvert}
              disabled={!selectedFile || loading}
            >
              <Camera size={14} /> LaTeX 변환
            </button>
          )}
          {phase === 'success' && (
            <button
              type="button"
              className="image-to-latex-btn-primary"
              onClick={handleInsert}
              disabled={!editableLatex.trim()}
            >
              입력창에 삽입
            </button>
          )}
          {(phase === 'error' || phase === 'preview') && selectedFile && phase !== 'success' && (
            <button
              type="button"
              className="image-to-latex-btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              다른 이미지
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MathImageOcrModal;
