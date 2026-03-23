import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { resolveApiUrl } from '../../../utils/url';

const WhiteboardEditor = ({ slide, onChange }) => {
    const { backgroundUrl = null } = slide;
    const [isUploading, setIsUploading] = useState(false);

    const handleBgUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'whiteboard_bgs');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com';
            const res = await fetch(`${apiUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                onChange({ backgroundUrl: data.url });
            } else {
                alert('업로드 실패: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            alert('업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveBg = () => {
        onChange({ backgroundUrl: null });
    };

    return (
        <div className="wb-editor">
            <div className="editor-group">
                <label>배경 이미지 설정 (선택사항)</label>
                <p className="help-text">학생들이 마음껏 그릴 수 있는 화이트보드 배경을 설정합니다. (예: 지도, 수학 그래프 모눈종이 등)</p>

                <div className="bg-upload-area">
                    {backgroundUrl ? (
                        <div className="bg-preview">
                            <img src={resolveApiUrl(backgroundUrl)} alt="Whiteboard Background" />
                            <div className="bg-actions">
                                <button className="btn-remove-bg" onClick={handleRemoveBg}>
                                    <Trash2 size={16} /> 배경 삭제
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="upload-box">
                            {isUploading ? (
                                <Loader2 className="animate-spin text-gray-400" size={32} />
                            ) : (
                                <>
                                    <Upload size={32} className="text-gray-400" />
                                    <span>클릭하여 배경 이미지 업로드</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBgUpload}
                                style={{ display: 'none' }}
                                disabled={isUploading}
                            />
                        </label>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhiteboardEditor;
