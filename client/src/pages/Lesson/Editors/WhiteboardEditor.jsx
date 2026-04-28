import React, { useState } from 'react';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { resolveApiUrl } from '../../../utils/url';
import { WHITEBOARD_PRESETS, getPresetBackgroundStyle } from '../../../utils/whiteboardPresets';

const WhiteboardEditor = ({ slide, onChange }) => {
    const backgroundType = slide.backgroundType || 'blank';
    const backgroundUrl = slide.backgroundUrl || null;
    const [isUploading, setIsUploading] = useState(false);

    const handleSelectPreset = (id) => {
        if (id === 'custom') return; // 업로드 버튼으로만 설정
        onChange({ backgroundType: id, backgroundUrl: null });
    };

    const handleBgUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'whiteboard_bgs');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com';
            const res = await fetch(`${apiUrl}/api/upload`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                onChange({ backgroundType: 'custom', backgroundUrl: data.url });
            } else {
                alert('업로드 실패: ' + data.message);
            }
        } catch (err) {
            alert('업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="wb-editor">
            <div className="editor-group">
                <label>문제 설명 (선택사항)</label>
                <textarea
                    className="slide-textarea"
                    placeholder="화이트보드 활동 안내사항을 입력하세요..."
                    value={slide.question || ''}
                    onChange={(e) => onChange({ question: e.target.value })}
                    rows={2}
                />
            </div>

            <div className="editor-group">
                <label>배경 선택</label>
                <p className="help-text">기본 배경 중 하나를 선택하거나, 직접 이미지를 업로드하세요.</p>

                <div className="wb-preset-grid">
                    {WHITEBOARD_PRESETS.map((preset) => {
                        if (preset.id === 'custom') return null; // 아래에 별도 버튼
                        const isActive = backgroundType === preset.id && !backgroundUrl;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                className={`wb-preset-btn ${isActive ? 'active' : ''}`}
                                onClick={() => handleSelectPreset(preset.id)}
                            >
                                <div
                                    className="wb-preset-thumb"
                                    style={getPresetBackgroundStyle(preset.id)}
                                />
                                <span className="wb-preset-label">{preset.emoji} {preset.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 커스텀 이미지 업로드 */}
                <div className="wb-custom-upload-section">
                    <div className="wb-custom-upload-label">🖼️ 직접 이미지 업로드</div>
                    {backgroundUrl ? (
                        <div className="free-bg-preview">
                            <img src={resolveApiUrl(backgroundUrl)} alt="커스텀 배경" style={{ maxHeight: 120 }} />
                            <button
                                className="free-bg-remove"
                                onClick={() => onChange({ backgroundType: 'blank', backgroundUrl: null })}
                            >
                                <Trash2 size={14} /> 이미지 제거
                            </button>
                        </div>
                    ) : (
                        <label className={`free-bg-drop wb-custom-drop ${backgroundType === 'custom' ? 'active' : ''}`}>
                            {isUploading
                                ? <Loader2 size={20} className="animate-spin" />
                                : <Upload size={20} />}
                            <span>클릭하여 이미지 업로드</span>
                            <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} disabled={isUploading} />
                        </label>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhiteboardEditor;
