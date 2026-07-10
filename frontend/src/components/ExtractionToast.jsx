import { useEffect, useRef, useState } from 'react';

const TOKEN_STORAGE_KEY = 'oss_dashboard_github_token';

// Maps a raw log line from extract_single_project.py to a display label.
// Returns null for lines that shouldn't update the visible step.
function parseLine(line) {
  const l = line.toLowerCase();
  if (l.includes('metadata'))       return { step: 'Extracting metadata…',      done: false };
  if (l.includes('contributor'))    return { step: 'Extracting contributors…',  done: false };
  if (l.includes('commit'))         return { step: 'Extracting commits…',       done: false };
  if (l.includes('issue'))          return { step: 'Extracting issues…',        done: false };
  if (l.includes('pull request'))   return { step: 'Extracting pull requests…', done: false };
  if (l.includes('release'))        return { step: 'Extracting releases…',      done: false };
  if (l.includes('adopter'))        return { step: 'Extracting adopters…',      done: false };
  if (line === '__DONE__')          return { step: 'Extraction complete',        done: true };
  if (line === '__TOKEN_EXPIRED__') return { step: 'Token expired or invalid',  done: false, failed: true, tokenExpired: true };
  if (line === '__FAILED__')        return { step: 'Extraction failed',          done: false, failed: true };
  return null;
}

export default function ExtractionToast({ projectId, projectName, onDone, onTokenExpired }) {
  const [step, setStep]           = useState('Starting extraction…');
  const [failed, setFailed]       = useState(false);
  const [done, setDone]           = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;

    // Small delay so the backend has time to start the process
    const timer = setTimeout(() => {
      const es = new EventSource(`/api/projects/${projectId}/extraction-progress`);
      esRef.current = es;

      es.onmessage = (e) => {
        const parsed = parseLine(e.data);
        if (!parsed) return;
        setStep(parsed.step);
        if (parsed.done) { setDone(true); es.close(); }
        if (parsed.failed) {
          setFailed(true);
          es.close();
          if (parsed.tokenExpired) {
            // Clear the stale token from localStorage so it doesn't auto-restore
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setTokenExpired(true);
          }
        }
      };

      es.onerror = () => {
        setStep('Connection lost');
        setFailed(true);
        es.close();
      };
    }, 800);

    return () => {
      clearTimeout(timer);
      esRef.current?.close();
    };
  }, [projectId]);

  // Auto-dismiss 3 s after normal completion or generic failure.
  // For token expiry we don't auto-dismiss — the user needs to act.
  useEffect(() => {
    if (!done && !(failed && !tokenExpired)) return;
    const t = setTimeout(() => onDone?.(), 3000);
    return () => clearTimeout(t);
  }, [done, failed, tokenExpired, onDone]);

  const stepColor = failed ? 'var(--red-40)' : done ? 'var(--green-40)' : 'var(--header-text-dim)';

  return (
    <div className="extraction-toast">
      <div className="extraction-toast-inner">
        <div className="extraction-toast-header">
          <span className="extraction-toast-title">
            {projectName ? `Adding ${projectName}` : 'Data extraction'}
          </span>
          <button
            className="extraction-toast-close"
            aria-label="Dismiss"
            onClick={() => { esRef.current?.close(); onDone?.(); }}
          >
            <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14">
              <path d="M24 9.4 22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6z"/>
            </svg>
          </button>
        </div>
        <div className="extraction-toast-step" style={{ color: stepColor }}>{step}</div>
        {!done && !failed && (
          <div className="extraction-toast-notice">Do not refresh — extraction is in progress.</div>
        )}
        {tokenExpired ? (
          <button
            className="extraction-toast-token-btn"
            onClick={() => { esRef.current?.close(); onDone?.(); onTokenExpired?.(); }}
          >
            Update token
          </button>
        ) : null}
      </div>
    </div>
  );
}
