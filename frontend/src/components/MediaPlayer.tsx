import { useEffect, useRef } from 'react';

interface Props {
    mediaUrl: string;
    filename: string;
    onRef: (el: HTMLVideoElement | HTMLAudioElement | null) => void;
}

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac']);

function isAudioFile(filename: string): boolean {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    return AUDIO_EXTENSIONS.has(ext);
}

export default function MediaPlayer({ mediaUrl, filename, onRef }: Props) {
    const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);

    useEffect(() => {
        onRef(ref.current);
        return () => onRef(null);
    }, [onRef]);

    const isAudio = isAudioFile(filename);

    return (
        <div className="media-player glass-card">
            {isAudio ? (
                <audio ref={ref} src={mediaUrl} controls preload="metadata" />
            ) : (
                <video ref={ref} src={mediaUrl} controls preload="metadata" />
            )}
        </div>
    );
}
