import { useRef, useEffect, useState, useCallback } from 'react';
import type { JobProgress } from '../types';

/**
 * Custom hook to manage a WebSocket connection for real-time job progress.
 */
export function useWebSocket(jobId: string | null) {
    const wsRef = useRef<WebSocket | null>(null);
    const [progress, setProgress] = useState<JobProgress | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!jobId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/api/ws/${jobId}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);

        ws.onmessage = (event) => {
            try {
                const data: JobProgress = JSON.parse(event.data);
                setProgress(data);
            } catch {
                console.error('Failed to parse WS message:', event.data);
            }
        };

        ws.onerror = () => setConnected(false);
        ws.onclose = () => setConnected(false);

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [jobId]);

    const disconnect = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    return { progress, connected, disconnect };
}
