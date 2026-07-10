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
  const [dismissed, setDismissed] = useState(false);
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
        // If the SSE connection errors immediately (e.g. backend restarted and
        // extraction logs were cleared), treat it as already complete rather
        // than a failure — the project data was already written to disk.
        if (!done && !failed) {
          setStep('Extraction complete');
          setDone(true);
        }
        es.close();
      };
    }, 800);

    return () => {
      clearTimeout(timer);
      esRef.current?.close();
    };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss after generic failure (not token expiry). Done state stays
  // visible until the user explicitly dismisses it.
  useEffect(() => {
    if (!(failed && !tokenExpired)) return;
    const t = setTimeout(() => onDone?.(), 3000);
    return () => clearTimeout(t);
  }, [failed, tokenExpired, onDone]);

  const dismiss = () => {
    esRef.current?.close();
    setDismissed(true);
    // Small delay so the fade feels natural before calling onDone
    setTimeout(() => onDone?.(), 200);
  };

  if (dismissed) return null;

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
            onClick={dismiss}
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

        {/* Carbon-style inline success notification */}
        {done && (
          <div className="extraction-inline-notification extraction-inline-notification--success" role="status">
            <div className="ein-icon">
              {/* Carbon CheckmarkFilled 16 */}
              <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.78 5.387-4.5 4.5a.5.5 0 0 1-.707 0l-2-2a.5.5 0 1 1 .707-.707L7 9.826l4.146-4.146a.5.5 0 1 1 .707.707z"/>
              </svg>
            </div>
            <div className="ein-content">
              <p className="ein-title">Extraction complete</p>
              <p className="ein-subtitle">
                {projectName ? `${projectName} is ready to view.` : 'Project data is ready to view.'}
              </p>
            </div>
            <button className="ein-close" aria-label="Dismiss notification" onClick={dismiss}>
              <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14" aria-hidden="true">
                <path d="M24 9.4 22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6z"/>
              </svg>
            </button>
          </div>
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
