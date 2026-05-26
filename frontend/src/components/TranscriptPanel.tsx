import { useState, useRef, useEffect, useMemo, type JSX } from 'react';
import type { Segment, Speaker } from '../types';
import SpeakerBadge from './SpeakerBadge';

interface Props {
    segments: Segment[];
    speakers: Speaker[];
    speakerColorMap: Map<string, string>;
    activeIndex: number;
    onSeek: (time: number) => void;
    onRenameSpeaker: (speakerId: string, newName: string) => void;
}

function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function highlightText(text: string, query: string): JSX.Element {
    if (!query) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i}>{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
        </>
    );
}

export default function TranscriptPanel({
    segments,
    speakers,
    speakerColorMap,
    activeIndex,
    onSeek,
    onRenameSpeaker,
}: Props) {
    const [search, setSearch] = useState('');
    const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
    const activeRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active segment.
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [activeIndex]);

    const filteredSegments = useMemo(() => {
        return segments
            .map((seg, idx) => ({ seg, idx }))
            .filter(({ seg }) => {
                if (activeSpeaker && seg.speaker !== activeSpeaker) return false;
                if (search && !seg.text.toLowerCase().includes(search.toLowerCase())) return false;
                return true;
            });
    }, [segments, search, activeSpeaker]);

    const speakerDisplayName = (id: string) =>
        speakers.find((s) => s.id === id)?.display_name ?? id;

    return (
        <div className="transcript-panel glass-card">
            {/* Toolbar */}
            <div className="transcript-toolbar">
                <input
                    className="transcript-search"
                    type="text"
                    placeholder="🔍 Search transcript…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button
                    className={`speaker-filter-btn ${!activeSpeaker ? 'active' : ''}`}
                    style={
                        !activeSpeaker
                            ? { background: 'var(--bg-card-hover)', borderColor: 'var(--accent-start)' }
                            : undefined
                    }
                    onClick={() => setActiveSpeaker(null)}
                >
                    All
                </button>
                {speakers.map((s) => (
                    <button
                        key={s.id}
                        className={`speaker-filter-btn ${activeSpeaker === s.id ? 'active' : ''}`}
                        style={
                            activeSpeaker === s.id
                                ? { background: speakerColorMap.get(s.id), borderColor: 'transparent' }
                                : undefined
                        }
                        onClick={() => setActiveSpeaker(activeSpeaker === s.id ? null : s.id)}
                    >
                        {s.display_name}
                    </button>
                ))}
            </div>

            {/* Segments */}
            {filteredSegments.map(({ seg, idx }) => {
                const color = speakerColorMap.get(seg.speaker) ?? '#888';
                const isActive = idx === activeIndex;

                return (
                    <div
                        key={idx}
                        ref={isActive ? activeRef : undefined}
                        className={`transcript-segment ${isActive ? 'active' : ''}`}
                        style={{ borderLeftColor: color }}
                        onClick={() => onSeek(seg.start)}
                    >
                        <div className="transcript-segment-header">
                            <SpeakerBadge
                                speakerId={seg.speaker}
                                displayName={speakerDisplayName(seg.speaker)}
                                color={color}
                                onRename={(newName) => onRenameSpeaker(seg.speaker, newName)}
                            />
                            <span className="segment-time">
                                {formatTime(seg.start)} – {formatTime(seg.end)}
                            </span>
                        </div>
                        <div className="segment-text">
                            {highlightText(seg.text, search)}
                        </div>
                    </div>
                );
            })}

            {filteredSegments.length === 0 && (
                <div className="empty-state">
                    <p>No segments match your filters.</p>
                </div>
            )}
        </div>
    );
}
