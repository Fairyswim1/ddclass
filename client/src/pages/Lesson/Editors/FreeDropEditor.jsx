import React, { useState } from 'react';
import { Upload, Trash2, Plus, Type, Image as ImageIcon, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { resolveApiUrl } from '../../../utils/url';

const FONT_SIZES = { S: 14, M: 22, L: 32 };

const FreeDropEditor = ({ slide, onChange }) => {
    const [uploading, setUploading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [fontSize, setFontSize] = useState('M');
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState('');

    const items = slide.items || [];
    const backgroundUrl = slide.backgroundUrl || '';
    const allowReuse = slide.allowReuse || false;

    const upload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'lesson-images');
        const res = await fetch(resolveApiUrl('/api/upload'), { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || '업로드 실패');
        return data.url;
    };

    const handleBgUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await upload(file);
            onChange({ backgroundUrl: url });
        } catch (err) {
            alert('배경 이미지 업로드 실패: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleAddText = () => {
        if (!inputText.trim()) return;
        const newItem = {
            id: Date.now().toString(),
            type: 'text',
            content: inputText.trim(),
            fontSize: FONT_SIZES[fontSize],
            fontSizeScale: fontSize
        };
        onChange({ items: [...items, newItem] });
        setInputText('');
    };

    const handleAddImage = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        try {
            const uploaded = await Promise.all(files.map(async (file) => {
                const url = await upload(file);
                return {
                    id: Date.now().toString() + Math.random(),
                    type: 'image',
                    imageUrl: url,
                    width: 15
                };
            }));
            onChange({ items: [...items, ...uploaded] });
        } catch (err) {
            alert('이미지 업로드 실패: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveItem = (id) => onChange({ items: items.filter(i => i.id !== id) });

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditingText(item.content);
    };

    const confirmEdit = () => {
        onChange({ items: items.map(i => i.id === editingId ? { ...i, content: editingText } : i) });
        setEditingId(null);
    };

    return (
        <div className="free-editor">
            {/* 문제 설명 */}
            <div className="editor-group">
                <label>문제 설명</label>
                <textarea
                    className="slide-textarea"
                    placeholder="학생들에게 보여줄 문제나 지시사항을 입력하세요"
                    value={slide.question || ''}
                    onChange={(e) => onChange({ question: e.target.value })}
                    rows={2}
                />
            </div>

            {/* 배경 이미지 */}
            <div className="editor-group">
                <label>배경 이미지</label>
                <div className="free-bg-upload">
                    {backgroundUrl ? (
                        <div className="free-bg-preview">
                            <img src={resolveApiUrl(backgroundUrl)} alt="배경 미리보기" />
                            <button className="free-bg-remove" onClick={() => onChange({ backgroundUrl: null })}>
                                <Trash2 size={14} /> 배경 제거
                            </button>
                        </div>
                    ) : (
                        <label className="free-bg-drop">
                            {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                            <span>클릭하거나 이미지를 끌어다 놓으세요</span>
                            <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />
                        </label>
                    )}
                </div>
            </div>

            {/* 카드 아이템 추가 */}
            <div className="editor-group">
                <label>카드 아이템 추가</label>

                {/* 텍스트 카드 추가 */}
                <div className="free-add-text-row">
                    <input
                        type="text"
                        className="slide-input"
                        placeholder="텍스트 카드 내용 입력"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                    />
                    <div className="free-font-size-btns">
                        {['S', 'M', 'L'].map(s => (
                            <button
                                key={s}
                                type="button"
                                className={`free-size-btn ${fontSize === s ? 'active' : ''}`}
                                onClick={() => setFontSize(s)}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="btn-add-option"
                        style={{ marginTop: 0, padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
                        onClick={handleAddText}
                    >
                        <Plus size={16} /> 텍스트 추가
                    </button>
                </div>

                {/* 이미지 카드 추가 */}
                <label className="free-image-upload-btn">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                    이미지 카드 추가 (여러 장 가능)
                    <input type="file" accept="image/*" multiple onChange={handleAddImage} style={{ display: 'none' }} />
                </label>

                {/* 카드 재사용 옵션 */}
                <div className="free-toggle-row" onClick={() => onChange({ allowReuse: !allowReuse })}>
                    {allowReuse
                        ? <ToggleRight size={28} color="#9B7FE8" />
                        : <ToggleLeft size={28} color="#cbd5e1" />}
                    <span>카드 재사용 허용 (같은 카드를 여러 번 배치 가능)</span>
                </div>
            </div>

            {/* 카드 목록 */}
            {items.length > 0 && (
                <div className="editor-group">
                    <label>추가된 카드 ({items.length}개)</label>
                    <div className="free-items-list">
                        {items.map((item) => (
                            <div key={item.id} className="free-item-row">
                                <div className="free-item-preview">
                                    {item.type === 'text' ? (
                                        <>
                                            <Type size={14} color="#64748b" />
                                            {editingId === item.id ? (
                                                <input
                                                    autoFocus
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    onBlur={confirmEdit}
                                                    onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                                                    className="free-inline-edit"
                                                />
                                            ) : (
                                                <span
                                                    style={{ fontSize: item.fontSize, cursor: 'text' }}
                                                    onClick={() => startEdit(item)}
                                                    title="클릭해서 수정"
                                                >
                                                    {item.content}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon size={14} color="#64748b" />
                                            <img
                                                src={resolveApiUrl(item.imageUrl)}
                                                alt="카드 이미지"
                                                style={{ height: '40px', objectFit: 'contain', borderRadius: '4px' }}
                                            />
                                        </>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="btn-remove-option"
                                    onClick={() => handleRemoveItem(item.id)}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FreeDropEditor;
