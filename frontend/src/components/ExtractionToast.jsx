import { useEffect, useRef, useState } from 'react';

const TOKEN_STORAGE_KEY    = 'oss_dashboard_github_token';
const EXTRACTION_STORAGE_KEY = 'oss_dashboard_extracting';
const ADD_QUEUE_STORAGE_KEY  = 'oss_dashboard_add_queue';
const QUEUE_STORAGE_KEY      = 'oss_dashboard_refresh_queue';

// Maps a raw log line from extract_single_project.py to a display label.
// Returns null for lines that shouldn't update the visible step.
function parseLine(line) {
  const l = line.toLowerCase();
  const t = line.trim();

  // ── Terminal sentinels ────────────────────────────────────────────────────
  if (line === '__DONE__')          return { step: 'Extraction complete',        done: true };
  if (line === '__TOKEN_EXPIRED__') return { step: 'Token expired or invalid',  done: false, failed: true, tokenExpired: true };
  if (line === '__FAILED__')        return { step: 'Extraction failed',          done: false, failed: true };

  // ── Org-extraction progress markers ──────────────────────────────────────
  const foundMatch = line.match(/^ORG_REPOS_FOUND (\d+)$/);
  if (foundMatch) return { orgTotal: parseInt(foundMatch[1], 10) };

  const startMatch = line.match(/^ORG_REPO_START (\d+) (\d+) (.+)$/);
  if (startMatch) return {
    orgIdx: parseInt(startMatch[1], 10), orgTotal: parseInt(startMatch[2], 10),
    orgRepo: startMatch[3], step: `Repo ${startMatch[1]}/${startMatch[2]}: ${startMatch[3]}`, done: false,
  };

  const doneRepoMatch = line.match(/^ORG_REPO_DONE (\d+) (\d+) (.+)$/);
  if (doneRepoMatch) return {
    orgIdx: parseInt(doneRepoMatch[1], 10), orgTotal: parseInt(doneRepoMatch[2], 10),
    orgRepo: doneRepoMatch[3], orgRepoDone: true,
    step: `Repo ${doneRepoMatch[1]}/${doneRepoMatch[2]}: ${doneRepoMatch[3]}`, done: false,
  };

  if (line === 'ORG_MERGING') return { step: 'Grouping repositories…', done: false };

  // ── Granular progress lines — shown verbatim as the step label ────────────
  // Jira issue fetch:  "  ✓ Retrieved 5000/24187 issues"
  const jiraProgress = t.match(/retrieved\s+(\d+)(?:\/(\d+))?\s+issues/i);
  if (jiraProgress) {
    const cur = jiraProgress[1], tot = jiraProgress[2];
    return { step: tot ? `Jira issues: ${cur} / ${tot}` : `Jira issues: ${cur} fetched…`, done: false };
  }

  // PR year counts:  "    📅 PR year counts: 2024 (16/18)..."
  const prYear = t.match(/pr year counts?:\s*(\d{4})\s*\((\d+)\/(\d+)\)/i);
  if (prYear) return { step: `PRs — counting ${prYear[1]} (${prYear[2]}/${prYear[3]})`, done: false };

  // PR year result:  "    ✓ 2024: 4047 PRs (3765 merged)"
  const prYearResult = t.match(/✓\s*(\d{4}):\s*(\d+)\s*prs?\s*\((\d+)\s*merged\)/i);
  if (prYearResult) return { step: `PRs ${prYearResult[1]}: ${prYearResult[2]} total, ${prYearResult[3]} merged`, done: false };

  // Commit quarter counts:  "  📅 Commit counts: Q3-2025 (7/12)…"
  const commitQ = t.match(/commit counts?:\s*(Q\d-\d{4})\s*\((\d+)\/(\d+)\)/i);
  if (commitQ) return { step: `Commits — ${commitQ[1]} (${commitQ[2]}/${commitQ[3]})`, done: false };

  // Git clone/fetch:  "  ⬇️  Cloning apache/camel …"  or  "  ⬇️  Updating local git cache …"
  if (l.includes('cloning') && l.includes('local cache'))  return { step: `Cloning git repo (may take a few minutes)…`, done: false };
  if (l.includes('updating local git cache'))              return { step: `Updating git cache…`, done: false };
  if (l.includes('git clone complete'))                    return { step: `Git clone complete`, done: false };
  if (l.includes('git cache updated'))                     return { step: `Git cache updated`, done: false };

  // Issue year counts (GitHub):  "    📊 Counting issues per year..."
  if (l.includes('counting issues per year'))  return { step: 'Issues — counting per year…', done: false };
  if (l.includes('counting open issues'))      return { step: 'Issues — counting open…', done: false };

  // ── Top-level step announcements (broad fallbacks, checked last) ──────────
  // Matches both bare lines ("Extracting releases...") from extract_single_project.py
  // and emoji-prefixed lines ("🚀 Extracting releases for ...") from extract_github_data.py.
  // Must come AFTER the granular patterns above so they don't shadow them.
  if (l.includes('extracting metadata'))      return { step: 'Extracting metadata…',      done: false };
  if (l.includes('extracting contributor'))   return { step: 'Extracting contributors…',  done: false };
  if (l.includes('extracting commit'))        return { step: 'Extracting commits…',       done: false };
  if (l.includes('extracting issues'))        return { step: 'Extracting issues…',        done: false };
  if (l.includes('extracting pull request'))  return { step: 'Extracting pull requests…', done: false };
  if (l.includes('extracting release'))       return { step: 'Extracting releases…',      done: false };
  if (l.includes('extracting adopter'))       return { step: 'Extracting adopters…',      done: false };

  return null;
}

// isSingleRepoRefresh: true when mode is 'refresh' and queueTotal <= 1 (not a multi-queue run)
export default function ExtractionToast({ projectId, projectName, mode, queueIdx, queueTotal, isSingleRepo, onDone, onTokenExpired }) {
  const [step, setStep]                   = useState('Starting extraction…');
  const [failed, setFailed]               = useState(false);
  const [done, setDone]                   = useState(false);
  const [tokenExpired, setTokenExpired]   = useState(false);
  const [dismissed, setDismissed]         = useState(false);
  // Org-extraction progress state
  const [orgTotal, setOrgTotal]           = useState(null);   // null = not an org extraction
  const [orgIdx, setOrgIdx]               = useState(0);
  const [orgRepo, setOrgRepo]             = useState(null);   // current repo name within the org
  const esRef         = useRef(null);
  // Refs that mirror done/failed so the onerror closure always reads the live value,
  // not the stale snapshot captured when the effect ran.
  const doneRef       = useRef(false);
  const failedRef     = useRef(false);
  // Track consecutive SSE errors to detect a terminated backend (Issue 3)
  const errorCountRef = useRef(0);
  const lastMsgRef    = useRef(Date.now());

  useEffect(() => {
    if (!projectId) return;

    // Small delay so the backend has time to start the process
    const timer = setTimeout(() => {
      const es = new EventSource(`/api/projects/${projectId}/extraction-progress`);
      esRef.current = es;

      es.onmessage = (e) => {
        lastMsgRef.current  = Date.now();
        errorCountRef.current = 0; // reset on any successful message
        const parsed = parseLine(e.data);
        if (!parsed) return;

        // Org progress tracking
        if (parsed.orgTotal != null) setOrgTotal(parsed.orgTotal);
        if (parsed.orgIdx   != null) setOrgIdx(parsed.orgIdx);
        if (parsed.orgRepo  != null) setOrgRepo(parsed.orgRepo);

        if (parsed.step) setStep(parsed.step);

        if (parsed.done)  {
          doneRef.current = true;
          setDone(true);
          es.close();
          // Extraction is finished — clear all persisted state immediately so a
          // page reload won't restore the toast as if it were still in progress.
          localStorage.removeItem(EXTRACTION_STORAGE_KEY);
          localStorage.removeItem(ADD_QUEUE_STORAGE_KEY);
          localStorage.removeItem(QUEUE_STORAGE_KEY);
        }
        if (parsed.failed) {
          failedRef.current = true;
          setFailed(true);
          es.close();
          if (parsed.tokenExpired) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setTokenExpired(true);
          }
        }
      };

      es.onerror = () => {
        // onerror fires on any connection drop — including transient network
        // blips and the browser closing/reopening the SSE on page reload while
        // extraction is still running.  Use refs (not state) so the closure
        // always reads the live value, not the stale snapshot from when the
        // effect first ran.
        if (doneRef.current || failedRef.current) {
          es.close();
          return;
        }
        // Count consecutive errors.  If we accumulate several without receiving
        // any new message the backend has likely been killed — clear the toast.
        errorCountRef.current += 1;
        const secsSinceMsg = (Date.now() - lastMsgRef.current) / 1000;
        if (errorCountRef.current >= 3 && secsSinceMsg > 5) {
          // Backend is gone — clear persisted state and dismiss
          es.close();
          localStorage.removeItem(EXTRACTION_STORAGE_KEY);
          localStorage.removeItem(ADD_QUEUE_STORAGE_KEY);
          localStorage.removeItem(QUEUE_STORAGE_KEY);
          failedRef.current = true;
          setFailed(true);
          setStep('Extraction stopped');
        }
        // Otherwise do nothing — EventSource reconnects automatically.
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

  // For a single-repo refresh, suppress the sub-repo progress bar and the org repo prefix.
  // The org-level markers still arrive from the Python script but we don't surface them.
  const suppressOrgUI = isSingleRepo && mode === 'refresh';
  const isOrg        = orgTotal !== null && !suppressOrgUI;
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

        {/* Queue position for merged-entry refresh: "X of Y repos" */}
        {isQueuedRun && !done && !failed && mode === 'refresh' && queueTotal > 1 && (
          <div className="extraction-toast-queue">
            {queueIdx} of {queueTotal} repos
          </div>
        )}
        {/* Queue position for add queue */}
        {isQueuedRun && !done && !failed && mode === 'add' && (
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
