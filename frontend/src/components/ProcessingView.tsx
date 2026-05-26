import { useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { JobResult, JobStatusType } from '../types';
import { PIPELINE_STEPS } from '../types';

interface Props {
    jobId: string;
    onComplete: (result: JobResult) => void;
}

const STEP_ORDER: JobStatusType[] = [
    'extracting_audio',
    'transcribing',
    'diarizing',
    'merging',
    'complete',
];

export default function ProcessingView({ jobId, onComplete }: Props) {
    const { progress } = useWebSocket(jobId);

    useEffect(() => {
        if (progress?.result && progress.status === 'complete') {
            // Small delay to let the animation play.
            const timer = setTimeout(() => onComplete(progress.result!), 800);
            return () => clearTimeout(timer);
        }
    }, [progress, onComplete]);

    const currentStatus = progress?.status ?? 'pending';
    const currentIdx = STEP_ORDER.indexOf(currentStatus as JobStatusType);

    return (
        <div className="processing-view">
            <div className="processing-header">
                <h2>Processing Your File</h2>
                <p>{progress?.message || 'Preparing the pipeline…'}</p>
            </div>

            <div className="processing-steps">
                {PIPELINE_STEPS.map((step) => {
                    const stepIdx = STEP_ORDER.indexOf(step.key);
                    const isActive = step.key === currentStatus;
                    const isCompleted = stepIdx < currentIdx;

                    return (
                        <div
                            key={step.key}
                            className={`processing-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''
                                }`}
                        >
                            <div className="processing-step-icon">
                                {isCompleted ? '✓' : step.icon}
                            </div>
                            <span className="processing-step-label">{step.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="processing-progress-bar">
                <div
                    className="processing-progress-fill"
                    style={{ width: `${progress?.progress ?? 0}%` }}
                />
            </div>

            <p className="processing-message">
                {currentStatus === 'error'
                    ? `❌ ${progress?.message}`
                    : currentStatus === 'pending'
                        ? 'Waiting for pipeline to start…'
                        : `${Math.round(progress?.progress ?? 0)}% complete`}
            </p>
        </div>
    );
}
