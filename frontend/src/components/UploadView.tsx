import { useState, useRef, useCallback } from 'react';

interface Props {
    onUploadComplete: (jobId: string) => void;
}

const ACCEPTED = '.mp4,.mkv,.avi,.mov,.webm,.flv,.mp3,.wav,.flac,.ogg,.m4a,.aac';

function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadView({ onUploadComplete }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [dragover, setDragover] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback((files: FileList | null) => {
        setError('');
        if (!files || files.length === 0) return;
        setFile(files[0]);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragover(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles],
    );

    const handleSubmit = useCallback(async () => {
        if (!file) return;
        setUploading(true);
        setUploadProgress(0);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            const result = await new Promise<{ job_id: string }>((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                });
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error(xhr.responseText || 'Upload failed'));
                    }
                });
                xhr.addEventListener('error', () => reject(new Error('Network error')));
                xhr.open('POST', '/api/upload');
                xhr.send(formData);
            });

            onUploadComplete(result.job_id);
        } catch (err: any) {
            setError(err.message || 'Upload failed');
            setUploading(false);
        }
    }, [file, onUploadComplete]);

    return (
        <div className="upload-view">
            <div className="upload-hero">
                <h1>
                    Turn Videos Into <span className="gradient-text">Scripts</span>
                </h1>
                <p>
                    Upload a video or audio file and our AI will transcribe every word,
                    identify each speaker, and build a clean script document — all
                    automatically.
                </p>
            </div>

            {/* Drop Zone */}
            <div
                className={`upload-dropzone glass-card ${dragover ? 'dragover' : ''}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragover(true);
                }}
                onDragLeave={() => setDragover(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="upload-icon">📂</div>
                <div className="upload-text">
                    <h3>Drag & drop your file here</h3>
                    <p>or click to browse</p>
                </div>
                <button className="upload-browse-btn" onClick={(e) => e.stopPropagation()}>
                    Browse Files
                </button>
            </div>

            {/* File Preview */}
            {file && (
                <div className="upload-file-preview glass-card">
                    <div className="upload-file-icon">
                        {file.type.startsWith('video/') ? '🎬' : '🎵'}
                    </div>
                    <div className="upload-file-info">
                        <div className="upload-file-name">{file.name}</div>
                        <div className="upload-file-size">{formatSize(file.size)}</div>
                        {uploading && (
                            <div className="upload-progress-bar">
                                <div
                                    className="upload-progress-fill"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                    {!uploading && (
                        <button
                            className="upload-file-remove"
                            onClick={() => setFile(null)}
                        >
                            ×
                        </button>
                    )}
                </div>
            )}

            {/* Submit */}
            <button
                className="upload-submit-btn"
                disabled={!file || uploading}
                onClick={handleSubmit}
            >
                {uploading
                    ? `Uploading… ${uploadProgress}%`
                    : 'Extract Script'}
            </button>

            {error && (
                <p style={{ color: '#fa709a', fontSize: '0.9rem' }}>{error}</p>
            )}

            <p className="upload-formats">
                Supports MP4, MKV, AVI, MOV, WebM, MP3, WAV, FLAC, OGG, M4A
            </p>
        </div>
    );
}
