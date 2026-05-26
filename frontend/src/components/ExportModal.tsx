import { useState } from 'react';

interface Props {
    jobId: string;
    onClose: () => void;
}

const FORMATS = [
    {
        id: 'txt',
        icon: '📄',
        title: 'Plain Text',
        desc: 'Clean dialogue format with speaker labels',
    },
    {
        id: 'srt',
        icon: '🎬',
        title: 'SRT Subtitles',
        desc: 'Standard subtitle format for video players',
    },
    {
        id: 'json',
        icon: '{ }',
        title: 'JSON',
        desc: 'Structured data with full timestamps and metadata',
    },
];

export default function ExportModal({ jobId, onClose }: Props) {
    const [selected, setSelected] = useState('txt');

    const handleDownload = () => {
        const url = `/api/jobs/${jobId}/export?format=${selected}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                <h3>Export Script</h3>
                <p>Choose a format to download your transcript.</p>

                <div className="export-options">
                    {FORMATS.map((fmt) => (
                        <div
                            key={fmt.id}
                            className={`export-option ${selected === fmt.id ? 'selected' : ''}`}
                            onClick={() => setSelected(fmt.id)}
                        >
                            <div className="export-option-icon">{fmt.icon}</div>
                            <div className="export-option-info">
                                <h4>{fmt.title}</h4>
                                <p>{fmt.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleDownload}>
                        Download
                    </button>
                </div>
            </div>
        </div>
    );
}
