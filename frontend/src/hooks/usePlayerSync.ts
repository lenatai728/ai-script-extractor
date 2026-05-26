import { useRef, useCallback, useEffect, useState } from 'react';
import type { Segment } from '../types';

/**
 * Syncs a media element's playback position with transcript segments.
 */
export function usePlayerSync(segments: Segment[]) {
    const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [activeIndex, setActiveIndex] = useState(-1);

    /* Update active segment based on current playback time. */
    useEffect(() => {
        const idx = segments.findIndex(
            (s) => currentTime >= s.start && currentTime < s.end,
        );
        setActiveIndex(idx);
    }, [currentTime, segments]);

    /* Listen to timeupdate from the media element. */
    const attachMedia = useCallback((el: HTMLVideoElement | HTMLAudioElement | null) => {
        if (mediaRef.current) {
            mediaRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        }
        mediaRef.current = el;
        if (el) {
            el.addEventListener('timeupdate', handleTimeUpdate);
        }
    }, []);

    function handleTimeUpdate() {
        if (mediaRef.current) {
            setCurrentTime(mediaRef.current.currentTime);
        }
    }

    /* Seek to a specific time. */
    const seekTo = useCallback((time: number) => {
        if (mediaRef.current) {
            mediaRef.current.currentTime = time;
            mediaRef.current.play().catch(() => { });
        }
    }, []);

    return { mediaRef, attachMedia, currentTime, activeIndex, seekTo };
}
