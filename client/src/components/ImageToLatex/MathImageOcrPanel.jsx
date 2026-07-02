import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, ClipboardCopy, Loader2, Upload } from 'lucide-react';
import LatexRenderer from '../LatexRenderer';
import { useImageToLatex } from '../../hooks/useImageToLatex';
import {
  IMAGE_TO_LATEX_ACCEPT,
  validateImageToLatexFile,
} from '../../utils/imageToLatexValidation';
import './ImageToLatex.css';

/** @typedef {'idle' | 'preview' | 'loading' | 'success' | 'error'} PanelPhase */

const MathImageOcrPanel = () => {
  const fileInputRef = useRef(null);
  const pasteZoneRef = useRef(null);
  const { convertImage, loading, error, reset } = useImageToLatex();

  const [phase, setPhase] = useState(/** @type {PanelPhase} */ ('idle'));
  const [selectedFile, setSelectedFile] = useState(/** @type {File | null} */ (null));
  const [previewUrl, setPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');
  const [editableLatex, setEditableLatex] = useState('');
  const [warnings, setWarnings] = useState(/** @type {string[]} */ ([]));
  const [confidence, setConfidence] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanupPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

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

  const handleCopyAll = useCallback(async () => {
    if (!editableLatex.trim()) {
      setLocalError('복사할 내용이 없습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(editableLatex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLocalError('클립보드 복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.');
    }
  }, [editableLatex]);

  const handleReset = useCallback(() => {
    cleanupPreview();
    setPhase('idle');
    setSelectedFile(null);
    setPreviewUrl('');
    setLocalError('');
    setEditableLatex('');
    setWarnings([]);
    setConfidence(null);
    setIsDragging(false);
    setCopied(false);
    reset();
  }, [cleanupPreview, reset]);

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

  const onPasteImage = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFile(file);
        return;
      }
    }
  }, [handleFile]);

  const displayError = localError || error;
  const showUploadArea = phase === 'idle' || phase === 'error';

  return (
    <div className="image-to-latex-panel">
      <div className="image-to-latex-panel-header">
        <h1>이미지 → LaTeX 변환</h1>
        <p>수식 이미지를 LaTeX로 변환한 뒤, 복사해서 문제 입력란에 붙여넣으세요.</p>
      </div>

      <div className="image-to-latex-panel-body">
        <p className="image-to-latex-disclaimer">
          AI 변환 결과는 오류가 있을 수 있으니 저장 전 반드시 확인하세요.
        </p>

        {showUploadArea && (
          <div className="image-to-latex-upload-section">
            <div
              className={`image-to-latex-dropzone no-click ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              <Upload size={28} color="#FF8E4B" />
              <p>이미지를 <strong>끌어다 놓으세요</strong></p>
              <p>png, jpg, webp · 5MB 이하</p>
            </div>

            <div className="image-to-latex-upload-actions">
              <button
                type="button"
                className="image-to-latex-btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                파일 선택
              </button>
            </div>

            <div
              ref={pasteZoneRef}
              className="image-to-latex-paste-zone"
              tabIndex={0}
              onPaste={onPasteImage}
              onClick={() => pasteZoneRef.current?.focus()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pasteZoneRef.current?.focus();
                }
              }}
              role="button"
              aria-label="이미지 붙여넣기 영역"
            >
              <strong>캡처 이미지 붙여넣기</strong>
              <span>이 영역을 클릭한 뒤 Ctrl+V (Mac: ⌘+V)</span>
            </div>
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

        {displayError && phase !== 'loading' && (
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
                <div className="image-to-latex-preview-label">미리보기</div>
                <div className="image-to-latex-preview-box">
                  <LatexRenderer text={editableLatex} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="image-to-latex-panel-footer">
        {phase !== 'idle' && (
          <button type="button" className="image-to-latex-btn-secondary" onClick={handleReset}>
            처음부터
          </button>
        )}
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
            onClick={handleCopyAll}
            disabled={!editableLatex.trim()}
          >
            {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
            {copied ? ' 복사됨!' : ' 전체 복사'}
          </button>
        )}
      </div>
    </div>
  );
};

export default MathImageOcrPanel;
