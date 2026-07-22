import { useEffect, useRef, useState } from 'react';

const TOKEN_STORAGE_KEY = 'oss_dashboard_github_token';

// Maps a raw log line from extract_single_project.py to a display label.
// Returns null for lines that shouldn't update the visible step.
function parseLine(line) {
  const l = line.toLowerCase();

  // Org-extraction progress markers
  // ORG_REPOS_FOUND <n>
  const foundMatch = line.match(/^ORG_REPOS_FOUND (\d+)$/);
  if (foundMatch) return { orgTotal: parseInt(foundMatch[1], 10) };

  // ORG_REPO_START <i> <n> <repoName>
  const startMatch = line.match(/^ORG_REPO_START (\d+) (\d+) (.+)$/);
  if (startMatch) return {
    orgIdx:   parseInt(startMatch[1], 10),
    orgTotal: parseInt(startMatch[2], 10),
    orgRepo:  startMatch[3],
    step:     `Repo ${startMatch[1]}/${startMatch[2]}: ${startMatch[3]}`,
    done:     false,
  };

  // ORG_REPO_DONE <i> <n> <repoName>
  const doneRepoMatch = line.match(/^ORG_REPO_DONE (\d+) (\d+) (.+)$/);
  if (doneRepoMatch) return {
    orgIdx:   parseInt(doneRepoMatch[1], 10),
    orgTotal: parseInt(doneRepoMatch[2], 10),
    orgRepo:  doneRepoMatch[3],
    orgRepoDone: true,
    step:     `Repo ${doneRepoMatch[1]}/${doneRepoMatch[2]}: ${doneRepoMatch[3]}`,
    done:     false,
  };

  // ORG_MERGING
  if (line === 'ORG_MERGING') return { step: 'Grouping repositories…', done: false };

  // Standard single-repo extraction steps
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

export default function ExtractionToast({ projectId, projectName, mode, queueIdx, queueTotal, onDone, onTokenExpired }) {
  const [step, setStep]                   = useState('Starting extraction…');
  const [failed, setFailed]               = useState(false);
  const [done, setDone]                   = useState(false);
  const [tokenExpired, setTokenExpired]   = useState(false);
  const [dismissed, setDismissed]         = useState(false);
  // Org-extraction progress state
  const [orgTotal, setOrgTotal]           = useState(null);   // null = not an org extraction
  const [orgIdx, setOrgIdx]               = useState(0);
  const [orgRepo, setOrgRepo]             = useState(null);   // current repo name within the org
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

        // Org progress tracking
        if (parsed.orgTotal != null) setOrgTotal(parsed.orgTotal);
        if (parsed.orgIdx   != null) setOrgIdx(parsed.orgIdx);
        if (parsed.orgRepo  != null) setOrgRepo(parsed.orgRepo);

        if (parsed.step) setStep(parsed.step);

        if (parsed.done)  { setDone(true);  es.close(); }
        if (parsed.failed) {
          setFailed(true);
          es.close();
          if (parsed.tokenExpired) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setTokenExpired(true);
          }
        }
      };

      es.onerror = () => {
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

  // Auto-dismiss after generic failure (not token expiry)
  useEffect(() => {
    if (!(failed && !tokenExpired)) return;
    const t = setTimeout(() => onDone?.(), 3000);
    return () => clearTimeout(t);
  }, [failed, tokenExpired, onDone]);

  // Auto-dismiss on success when refreshing so the page reload fires automatically
  useEffect(() => {
    if (!(done && mode === 'refresh')) return;
    const t = setTimeout(() => {
      setDismissed(true);
      onDone?.();
    }, 1500);
    return () => clearTimeout(t);
  }, [done, mode, onDone]);

  const dismiss = () => {
    esRef.current?.close();
    setDismissed(true);
    // If extraction is still in progress, leave the persisted state in
    // localStorage so a page reload will restore the progress bar.
    // Only call onDone (which clears localStorage) when the job is finished.
    if (done || failed) {
      setTimeout(() => onDone?.(), 200);
    }
  };

  if (dismissed) return null;

  const isOrg        = orgTotal !== null;
  const pct          = isOrg && orgTotal > 0 ? Math.round((orgIdx / orgTotal) * 100) : 0;
  const stepColor    = failed ? 'var(--red-40)' : done ? 'var(--green-40)' : 'var(--header-text-dim)';
  const isQueuedRun  = queueTotal > 1;
  // When a specific repo is active within an org extraction, prefix the step with it
  const displayStep  = (isOrg && orgRepo && !done && !failed)
    ? `${orgRepo} → ${step}`
    : step;

  return (
    <div className="extraction-toast">
      <div className="extraction-toast-inner">
        <div className="extraction-toast-header">
          <span className="extraction-toast-title">
            {projectName
              ? (mode === 'refresh' ? `Refreshing ${projectName}` : `Adding ${projectName}`)
              : 'Data extraction'}
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

        {/* Overall queue position — only shown during refresh-all with >1 project */}
        {isQueuedRun && !done && !failed && (
          <div className="extraction-toast-queue">
            Project {queueIdx} of {queueTotal}
          </div>
        )}

        <div className="extraction-toast-step" style={{ color: stepColor }}>{displayStep}</div>

        {/* Progress bar — shown for org extractions while in flight */}
        {isOrg && !done && !failed && (
          <div className="extraction-progress-wrap" role="progressbar"
               aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
               aria-label={`Extracting repository ${orgIdx} of ${orgTotal}`}>
            <div className="extraction-progress-bar" style={{ width: `${pct}%` }} />
            <span className="extraction-progress-label">
              {orgIdx} / {orgTotal} repos
            </span>
          </div>
        )}

        {/* Carbon-style inline success notification */}
        {done && (
          <div className="extraction-inline-notification extraction-inline-notification--success" role="status">
            <div className="ein-icon">
              <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.78 5.387-4.5 4.5a.5.5 0 0 1-.707 0l-2-2a.5.5 0 1 1 .707-.707L7 9.826l4.146-4.146a.5.5 0 1 1 .707.707z"/>
              </svg>
            </div>
            <div className="ein-content">
              <p className="ein-title">Extraction complete</p>
              <p className="ein-subtitle">
                {isOrg
                  ? `${orgTotal} repos extracted and grouped under ${projectName}.`
                  : (projectName ? `${projectName} is ready to view.` : 'Project data is ready to view.')}
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
