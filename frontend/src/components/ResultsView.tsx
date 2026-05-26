import type { JobResult } from '../types';
import { SPEAKER_COLORS } from '../types';
import MediaPlayer from './MediaPlayer';
import TranscriptPanel from './TranscriptPanel';
import { usePlayerSync } from '../hooks/usePlayerSync';

interface Props {
    result: JobResult;
    onResultUpdate: (r: JobResult) => void;
    onExport: () => void;
}

function formatDuration(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ResultsView({ result, onResultUpdate, onExport }: Props) {
    const { attachMedia, activeIndex, seekTo } = usePlayerSync(result.segments);

    const handleRenameSpeaker = async (speakerId: string, newName: string) => {
        try {
            await fetch(`/api/jobs/${result.job_id}/speakers/${speakerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_name: newName }),
            });

            // Update local state.
            const updated = {
                ...result,
                speakers: result.speakers.map((s) =>
                    s.id === speakerId ? { ...s, display_name: newName } : s,
                ),
            };
            onResultUpdate(updated);
        } catch {
            // Silently fail.
        }
    };

    // Build speaker → color map.
    const speakerColorMap = new Map<string, string>();
    result.speakers.forEach((s, i) => {
        speakerColorMap.set(s.id, SPEAKER_COLORS[i % SPEAKER_COLORS.length]);
    });

    return (
        <div className="results-view">
            {/* Header */}
            <div className="results-header">
                <div>
                    <h2>📝 Script: {result.filename}</h2>
                </div>
                <div className="results-stats">
                    <div className="results-stat">
                        <div className="results-stat-value">{result.speakers.length}</div>
                        <div className="results-stat-label">Speakers</div>
                    </div>
                    <div className="results-stat">
                        <div className="results-stat-value">{result.segments.length}</div>
                        <div className="results-stat-label">Segments</div>
                    </div>
                    <div className="results-stat">
                        <div className="results-stat-value">
                            {formatDuration(result.duration)}
                        </div>
                        <div className="results-stat-label">Duration</div>
                    </div>
                </div>
                <div className="results-actions">
                    <button className="btn btn-primary" onClick={onExport}>
                        ↓ Export
                    </button>
                </div>
            </div>

            {/* Body: Player + Transcript */}
            <div className="results-body">
                <MediaPlayer
                    mediaUrl={result.media_url}
                    filename={result.filename}
                    onRef={attachMedia}
                />
                <TranscriptPanel
                    segments={result.segments}
                    speakers={result.speakers}
                    speakerColorMap={speakerColorMap}
                    activeIndex={activeIndex}
                    onSeek={seekTo}
                    onRenameSpeaker={handleRenameSpeaker}
                />
            </div>
        </div>
    );
}
