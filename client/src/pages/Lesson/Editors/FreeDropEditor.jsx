import React, { useState } from 'react';
import { Upload, Trash2, Plus, Type, Image as ImageIcon, Loader2 } from 'lucide-react';
import { resolveApiUrl } from '../../../utils/url';

const FreeDropEditor = ({ slide, updateSlide }) => {
    const [uploading, setUploading] = useState(false);

    const items = slide.items || [];
    const backgroundUrl = slide.backgroundUrl || '';

    const handleBgUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com'}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('업로드 실패');

            const data = await response.json();
            updateSlide(slide.id, { backgroundUrl: data.url });
        } catch (error) {
            console.error('Error uploading background:', error);
            alert('배경 이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const handleAddText = () => {
        const newItems = [...items, {
            id: Date.now().toString(),
            type: 'text',
            text: '새 텍스트',
            x: 50,
            y: 50,
            scale: 1,
            isLocked: false
        }];
        updateSlide(slide.id, { items: newItems });
    };

    const handleAddImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com'}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('업로드 실패');

            const data = await response.json();
            const newItems = [...items, {
                id: Date.now().toString(),
                type: 'image',
                src: data.url,
                x: 50,
                y: 50,
                scale: 1,
                isLocked: false
            }];
            updateSlide(slide.id, { items: newItems });
        } catch (error) {
            console.error('Error uploading item image:', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveItem = (id) => {
        const newItems = items.filter(i => i.id !== id);
        updateSlide(slide.id, { items: newItems });
    };

    return (
        <div className="free-editor">
            <div className="editor-group" style={{ marginBottom: '1.5rem' }}>
                <label>자유 배치 문제</label>
                <input
                    type="text"
                    className="slide-input"
                    placeholder="문제를 입력하세요"
                    value={slide.question || ''}
                    onChange={(e) => updateSlide(slide.id, { question: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '0.5rem' }}
                />
            </div>

            <div className="editor-group" style={{ marginBottom: '1.5rem' }}>
                <label>배경 이미지</label>
                <div className="bg-upload-container" style={{ marginTop: '0.5rem', padding: '1.5rem', border: '2px dashed #cbd5e1', borderRadius: '0.5rem', textAlign: 'center', background: '#f8fafc', position: 'relative' }}>
                    {backgroundUrl ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={resolveApiUrl(backgroundUrl)} alt="background preview" style={{ maxHeight: '150px', objectFit: 'contain', borderRadius: '0.25rem' }} />
                            <button
                                onClick={() => updateSlide(slide.id, { backgroundUrl: null })}
                                style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <div>
                            <input
                                type="file"
                                id={`bg-upload-${slide.id}`}
                                accept="image/*"
                                onChange={handleBgUpload}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor={`bg-upload-${slide.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: '#475569', fontWeight: 500 }}>
                                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                                배경 이미지 업로드
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="editor-group">
                <label>이동 가능한 오브젝트 아이템</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                    <button
                        onClick={handleAddText}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', color: '#334155' }}
                    >
                        <Type size={16} /> 텍스트 추가
                    </button>
                    <div>
                        <input
                            type="file"
                            id={`item-upload-${slide.id}`}
                            accept="image/*"
                            onChange={handleAddImage}
                            style={{ display: 'none' }}
                        />
                        <label
                            htmlFor={`item-upload-${slide.id}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', color: '#334155' }}
                        >
                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                            이미지 추가
                        </label>
                    </div>
                </div>

                {items.length > 0 && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white' }}>
                        {items.map((item, index) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: index < items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {item.type === 'text' ? <Type size={16} color="#64748b" /> : <ImageIcon size={16} color="#64748b" />}
                                    <span style={{ fontWeight: 500, color: '#334155' }}>
                                        {item.type === 'text' ? '텍스트 항목' : '이미지 항목'}
                                    </span>
                                </div>
                                <button
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    onClick={() => handleRemoveItem(item.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', color: '#94a3b8' }}>
                        설정된 아이템이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
};

export default FreeDropEditor;
