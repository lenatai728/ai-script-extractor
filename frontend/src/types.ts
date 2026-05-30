/* ── Shared TypeScript types ──────────────────────────────────────────── */

export type JobStatusType =
    | 'pending'
    | 'extracting_audio'
    | 'transcribing'
    | 'diarizing'
    | 'merging'
    | 'complete'
    | 'error';

export interface Segment {
    speaker: string;
    start: number;
    end: number;
    text: string;
}

export interface Speaker {
    id: string;
    display_name: string;
}

export interface JobProgress {
    job_id: string;
    status: JobStatusType;
    progress: number;
    message: string;
    result?: JobResult;
}

export interface Language {
    name: string;
    code: string;
}

export interface JobResult {
    job_id: string;
    status: JobStatusType;
    filename: string;
    language: string;
    duration: number;
    segments: Segment[];
    speakers: Speaker[];
    media_url: string;
}

/** Quick-pick languages shown as pill buttons. English is default. */
export const QUICK_LANGUAGES: Language[] = [
    { name: 'English', code: 'en' },
    { name: 'Mandarin', code: 'zh' },
    { name: 'Cantonese', code: 'yue' },
    { name: 'Japanese', code: 'ja' },
    { name: 'Korean', code: 'ko' },
];

export interface JobSummary {
    job_id: string;
    filename: string;
    status: JobStatusType;
    duration: number;
    speaker_count: number;
    segment_count: number;
}

/** Pipeline step metadata for the progress view. */
export interface PipelineStep {
    key: JobStatusType;
    label: string;
    icon: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
    { key: 'extracting_audio', label: 'Extracting Audio', icon: '🎵' },
    { key: 'transcribing', label: 'Transcribing', icon: '📝' },
    { key: 'diarizing', label: 'Identifying Speakers', icon: '🎤' },
    { key: 'merging', label: 'Building Script', icon: '🔗' },
    { key: 'complete', label: 'Complete', icon: '✅' },
];

/** 8 distinct speaker colours (HSL). */
export const SPEAKER_COLORS = [
    '#4facfe',
    '#f093fb',
    '#43e97b',
    '#fa709a',
    '#fee140',
    '#a18cd1',
    '#ff9a9e',
    '#30cfd0',
];
