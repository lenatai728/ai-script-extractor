import { useState, useRef, useEffect } from 'react';

interface Props {
    speakerId: string;
    displayName: string;
    color: string;
    onRename: (newName: string) => void;
}

export default function SpeakerBadge({ displayName, color, onRename }: Props) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(displayName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setValue(displayName);
    }, [displayName]);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const commit = () => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== displayName) {
            onRename(trimmed);
        } else {
            setValue(displayName);
        }
        setEditing(false);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                className="speaker-name-input"
                style={{ color }}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') {
                        setValue(displayName);
                        setEditing(false);
                    }
                }}
            />
        );
    }

    return (
        <span
            className="speaker-badge speaker-badge-editable"
            style={{ background: color }}
            title="Click to rename speaker"
            onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
            }}
        >
            {displayName}
        </span>
    );
}
