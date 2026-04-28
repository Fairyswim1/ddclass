import React, { useState, useRef } from 'react';
import { storage } from '../../../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';

const ImageEditor = ({ slide, onChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const uploadImage = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        setUploading(true);
        setUploadProgress(0);
        const storageRef = ref(storage, `lesson-images/${Date.now()}_${file.name}`);
        const task = uploadBytesResumable(storageRef, file);
        task.on('state_changed',
            (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            (err) => { console.error(err); setUploading(false); alert('업로드 실패: ' + err.message); },
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                onChange({ imageUrl: url });
                setUploading(false);
            }
        );
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadImage(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) uploadImage(file);
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                이미지를 업로드하면 학생들에게 해당 이미지가 표시됩니다. (JPG, PNG, GIF, WEBP)
            </p>

            {slide.imageUrl ? (
                <div style={{ position: 'relative' }}>
                    <img
                        src={slide.imageUrl}
                        alt="업로드된 이미지"
                        style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <button
                        onClick={() => onChange({ imageUrl: null })}
                        style={{
                            position: 'absolute', top: '0.75rem', right: '0.75rem',
                            background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                            borderRadius: '50%', width: '2rem', height: '2rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${isDragging ? '#6366f1' : '#cbd5e1'}`,
                        borderRadius: '12px',
                        padding: '3rem',
                        textAlign: 'center',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        background: isDragging ? '#eef2ff' : '#f8fafc',
                        transition: 'all 0.2s'
                    }}
                >
                    {uploading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                            <p style={{ color: '#6366f1', fontWeight: 'bold' }}>업로드 중... {uploadProgress}%</p>
                            <div style={{ width: '200px', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                                <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#6366f1', borderRadius: '3px', transition: 'width 0.3s' }} />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '1rem', background: '#e0e7ff', borderRadius: '50%' }}>
                                <ImageIcon size={32} style={{ color: '#6366f1' }} />
                            </div>
                            <p style={{ fontWeight: 'bold', color: '#334155' }}>이미지를 드래그하거나 클릭하여 업로드</p>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>JPG, PNG, GIF, WEBP 지원</p>
                            <button
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1.2rem', background: '#6366f1', color: 'white',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                <Upload size={16} /> 파일 선택
                            </button>
                        </div>
                    )}
                </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
    );
};

export default ImageEditor;
