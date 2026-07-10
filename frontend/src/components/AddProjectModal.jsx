import { useEffect, useRef, useState } from "react";
import { addProject, saveGithubToken, getSavedToken } from "../api.js";

export default function AddProjectModal({ open, onClose, onAdd, onSuccess, tokenConfigured, onTokenSaved }) {
  const [url, setUrl]                 = useState("");
  const [issueGithubUrl, setIssueGithubUrl] = useState("");
  const [issueSource, setIssueSource] = useState("github"); // "github" | "jira"
  const [jiraKey, setJiraKey]         = useState("");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [token, setToken]             = useState("");
  const [invalid, setInvalid]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState(null); // {msg, type}
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setIssueGithubUrl("");
      setIssueSource("github");
      setJiraKey("");
      setJiraBaseUrl("");
      // Pre-fill token from localStorage if available
      setToken(getSavedToken() || "");
      setInvalid(false);
      setLoading(false);
      setStatus(null);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    setInvalid(false);

    // Validate token — always required
    if (!token.trim()) {
      setInvalid(true);
      setStatus({ msg: "GitHub token is required to extract data.", type: "err" });
      return;
    }
    // Validate Jira fields if selected
    if (issueSource === "jira" && !jiraKey.trim()) {
      setInvalid(true);
      setStatus({ msg: "Jira project key is required.", type: "err" });
      return;
    }

    setLoading(true);
    setStatus({ msg: "Adding project to backend...", type: "info" });

    try {
      // Always save the token
      await saveGithubToken(token.trim());
      onTokenSaved?.();

      const response = await addProject(
        url,
        undefined,
        undefined,
        issueSource === "jira" ? "jira" : undefined,
        issueSource === "jira" ? jiraKey.trim() : undefined,
        issueSource === "jira" ? (jiraBaseUrl.trim() || undefined) : undefined,
        issueSource === "github" ? (issueGithubUrl.trim() || undefined) : undefined,
      );

      if (response.success) {
        setStatus({
          msg: `${response.message}. ${response.extractionStatus}`,
          type: "info"
        });

        setTimeout(async () => {
          onClose();
          if (onSuccess) await onSuccess();
          if (onAdd && response.project) {
            onAdd(response.project.id, response.project.name || response.project.id);
          }
        }, 2000);
      } else {
        setLoading(false);
        setInvalid(true);
        setStatus({ msg: response.message, type: "err" });
      }
    } catch (err) {
      setLoading(false);
      const msg = err.message || "Network error. Please check if the backend is running.";
      if (msg.includes("Invalid GitHub URL")) setInvalid(true);
      setStatus({ msg, type: "err" });
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addModalTitle"
      onClick={(e) => { if (e.target.classList.contains("modal-overlay")) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" id="addModalTitle">Add project</h2>
          <p className="modal-sub">Paste a primary GitHub repository URL — we'll pull the metrics automatically.</p>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M24 9.4 22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6z" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* GitHub token — always required */}
          <div className="token-inline-section">
            <div className={"field" + (invalid && !token.trim() ? " show-err" : "")}>
              <label htmlFor="i-token-inline">
                GitHub personal access token <span style={{ color: "var(--red-50)" }}>*</span>
              </label>
              <input
                id="i-token-inline"
                type="password"
                placeholder="Paste token here — ghp_..."
                autoComplete="off"
                spellCheck="false"
                className={invalid && !token.trim() ? "invalid" : ""}
                value={token}
                disabled={loading}
                onChange={(e) => setToken(e.target.value)}
              />
              <div className="err">GitHub token is required.</div>
            </div>
            <p className="field-help">
              Required to fetch data from GitHub. Stored in your browser and restored automatically on future visits.
              Needs at least <code>public_repo</code> read access.<br />
              <a
                href="https://github.com/settings/tokens/new?description=oss-dashboard&scopes=public_repo"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--link)" }}
              >
                Create one ↗
              </a>
            </p>
          </div>

          {/* Primary GitHub URL */}
          <div className="jira-fields">
            <div className={"field" + (invalid && !url.trim() ? " show-err" : "")}>
              <label htmlFor="i-url">Primary GitHub repository URL <span style={{ color: "var(--red-50)" }}>*</span></label>
              <input
                id="i-url"
                ref={inputRef}
                type="text"
                placeholder="https://github.com/owner/repo"
                autoComplete="off"
                spellCheck="false"
                className={invalid && !url.trim() ? "invalid" : ""}
                value={url}
                disabled={loading}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
              />
              <div className="err">Enter a valid GitHub repository URL.</div>
            </div>
          </div>

          {/* Issue source toggle */}
          <div className="field" style={{ marginTop: "1rem" }}>
            <label>Issue tracker</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="issueSource"
                  value="github"
                  checked={issueSource === "github"}
                  disabled={loading}
                  onChange={() => setIssueSource("github")}
                />
                GitHub Issues
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="issueSource"
                  value="jira"
                  checked={issueSource === "jira"}
                  disabled={loading}
                  onChange={() => setIssueSource("jira")}
                />
                Jira
              </label>
            </div>
          </div>

          {/* GitHub Issues field — shown only when github is selected */}
          {issueSource === "github" && (
            <div className="jira-fields">
              <div className="field">
                <label htmlFor="i-issue-url">
                  Issue repository URL{" "}
                  <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="i-issue-url"
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  autoComplete="off"
                  spellCheck="false"
                  value={issueGithubUrl}
                  disabled={loading}
                  onChange={(e) => setIssueGithubUrl(e.target.value)}
                />
                <p className="field-help" style={{ marginTop: ".25rem" }}>
                  Use this only if issues are tracked in a different GitHub repository than the primary one.
                </p>
              </div>
            </div>
          )}

          {/* Jira fields — shown only when jira is selected */}
          {issueSource === "jira" && (
            <div className="jira-fields">
              <div className={"field" + (invalid && !jiraKey.trim() ? " show-err" : "")}>
                <label htmlFor="i-jira-key">Jira project key <span style={{ color: "var(--red-50)" }}>*</span></label>
                <input
                  id="i-jira-key"
                  type="text"
                  placeholder="e.g. CAMEL"
                  autoComplete="off"
                  spellCheck="false"
                  className={invalid && !jiraKey.trim() ? "invalid" : ""}
                  value={jiraKey}
                  disabled={loading}
                  onChange={(e) => setJiraKey(e.target.value.toUpperCase())}
                />
                <div className="err">Jira project key is required.</div>
              </div>
              <div className="field" style={{ marginTop: ".75rem" }}>
                <label htmlFor="i-jira-url">
                  Jira base URL{" "}
                  <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="i-jira-url"
                  type="text"
                  placeholder="https://issues.apache.org/jira"
                  autoComplete="off"
                  spellCheck="false"
                  value={jiraBaseUrl}
                  disabled={loading}
                  onChange={(e) => setJiraBaseUrl(e.target.value)}
                />
                <p className="field-help" style={{ marginTop: ".25rem" }}>
                  Leave blank to use the default Apache Jira instance.
                </p>
              </div>
            </div>
          )}

          <p className="field-help" style={{ marginTop: "1rem" }}>
            The project will be added and data extraction will start automatically.
            This may take several minutes depending on the project size.
          </p>

          {status && <div className={"add-status " + status.type}>{status.msg}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-add"    onClick={submit}  disabled={loading}>
            {loading ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
