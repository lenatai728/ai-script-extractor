import { useState, useCallback } from 'react';
import type { JobResult, JobSummary } from './types';
import UploadView from './components/UploadView';
import ProcessingView from './components/ProcessingView';
import ResultsView from './components/ResultsView';
import ExportModal from './components/ExportModal';

type View = 'upload' | 'processing' | 'results' | 'history';

export default function App() {
  const [view, setView] = useState<View>('upload');
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [history, setHistory] = useState<JobSummary[]>([]);

  const handleUploadComplete = useCallback((newJobId: string) => {
    setJobId(newJobId);
    setView('processing');
  }, []);

  const handleProcessingComplete = useCallback((jobResult: JobResult) => {
    setResult(jobResult);
    setView('results');

    // Refresh history.
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((data: JobSummary[]) => setHistory(data))
      .catch(() => { });
  }, []);

  const handleLoadJob = useCallback(async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`);
    if (res.ok) {
      const data: JobResult = await res.json();
      setResult(data);
      setJobId(id);
      setView('results');
    }
  }, []);

  const openNewUpload = useCallback(() => {
    setView('upload');
    setJobId(null);
    setResult(null);
  }, []);

  const openHistory = useCallback(async () => {
    const res = await fetch('/api/jobs');
    if (res.ok) {
      const data: JobSummary[] = await res.json();
      setHistory(data);
    }
    setView('history');
  }, []);

  return (
    <>
      {/* Background glows */}
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      {/* Header */}
      <header className="app-header">
        <div className="app-logo" onClick={openNewUpload}>
          <div className="app-logo-icon">🎬</div>
          <div className="app-logo-text">
            <span>ScriptAI</span>
          </div>
        </div>
        <nav className="app-nav">
          <button
            className={`app-nav-btn ${view === 'upload' ? 'active' : ''}`}
            onClick={openNewUpload}
          >
            + New
          </button>
          <button
            className={`app-nav-btn ${view === 'history' ? 'active' : ''}`}
            onClick={openHistory}
          >
            History
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="view-container" key={view + (jobId ?? '')}>
          {view === 'upload' && (
            <UploadView onUploadComplete={handleUploadComplete} />
          )}
          {view === 'processing' && jobId && (
            <ProcessingView
              jobId={jobId}
              onComplete={handleProcessingComplete}
            />
          )}
          {view === 'results' && result && (
            <ResultsView
              result={result}
              onResultUpdate={setResult}
              onExport={() => setShowExport(true)}
            />
          )}
          {view === 'history' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: 24, fontSize: '1.5rem', fontWeight: 700 }}>
                Processing History
              </h2>
              {history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <p>No processing history yet.</p>
                  <button className="btn btn-primary" onClick={openNewUpload}>
                    Upload your first video
                  </button>
                </div>
              ) : (
                <div className="history-list">
                  {history.map((job) => (
                    <div
                      key={job.job_id}
                      className="history-item glass-card"
                      onClick={() => job.status === 'complete' && handleLoadJob(job.job_id)}
                    >
                      <div className="history-item-icon">
                        {job.status === 'complete' ? '✅' : job.status === 'error' ? '❌' : '⏳'}
                      </div>
                      <div className="history-item-info">
                        <div className="history-item-name">{job.filename}</div>
                        <div className="history-item-meta">
                          <span>{job.speaker_count} speakers</span>
                          <span>{job.segment_count} segments</span>
                          {job.duration > 0 && (
                            <span>{Math.round(job.duration)}s duration</span>
                          )}
                        </div>
                      </div>
                      <div className={`history-item-status ${job.status}`}>
                        {job.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Export Modal */}
      {showExport && result && (
        <ExportModal
          jobId={result.job_id}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}
