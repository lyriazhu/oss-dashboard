import { useEffect, useRef, useState } from "react";
import { addProject, saveGithubToken, getSavedToken } from "../api.js";

export default function AddProjectModal({ open, onClose, onAdd, onSuccess, tokenConfigured, onTokenSaved }) {
  const [addMode, setAddMode]             = useState("repo");   // "repo" | "project"
  const [url, setUrl]                     = useState("");
  const [orgUrl, setOrgUrl]               = useState("");
  const [issueGithubUrl, setIssueGithubUrl] = useState("");
  const [issueSource, setIssueSource]     = useState("github"); // "github" | "jira"
  const [orgIssueScope, setOrgIssueScope] = useState("one");    // "one" | "all"  (entire-project only)
  const [jiraKey, setJiraKey]             = useState("");
  const [jiraBaseUrl, setJiraBaseUrl]     = useState("");
  const [token, setToken]                 = useState("");
  const [invalid, setInvalid]             = useState(false);
  const [loading, setLoading]             = useState(false);
  const [status, setStatus]               = useState(null); // {msg, type}
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setAddMode("repo");
      setUrl("");
      setOrgUrl("");
      setIssueGithubUrl("");
      setIssueSource("github");
      setOrgIssueScope("one");
      setJiraKey("");
      setJiraBaseUrl("");
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

  // The "primary" URL being used, depending on mode
  const primaryUrl = addMode === "repo" ? url : orgUrl;

  // Client-side URL format validation
  function isValidRepoUrl(u) {
    return /^https?:\/\/(?:www\.)?github\.com\/[^/]+\/[^/]/.test(u.trim());
  }
  function isValidOrgUrl(u) {
    return /^https?:\/\/(?:www\.)?github\.com\/[^/]+\/?$/.test(u.trim());
  }

  async function submit() {
    setInvalid(false);

    if (!token.trim()) {
      setInvalid(true);
      setStatus({ msg: "GitHub token is required to extract data.", type: "err" });
      return;
    }
    if (!primaryUrl.trim()) {
      setInvalid(true);
      setStatus({
        msg: addMode === "repo"
          ? "Enter a valid GitHub repository URL."
          : "Enter a valid GitHub project (org/user) URL.",
        type: "err",
      });
      return;
    }
    if (addMode === "repo" && !isValidRepoUrl(primaryUrl)) {
      setInvalid(true);
      setStatus({ msg: "Enter a valid GitHub repository URL (https://github.com/owner/repo).", type: "err" });
      return;
    }
    if (addMode === "project" && !isValidOrgUrl(primaryUrl)) {
      setInvalid(true);
      setStatus({ msg: "Enter a valid GitHub org or user URL (https://github.com/owner).", type: "err" });
      return;
    }
    if (issueSource === "jira" && !jiraKey.trim()) {
      setInvalid(true);
      setStatus({ msg: "Jira project key is required.", type: "err" });
      return;
    }
    if (issueSource === "jira" && !jiraBaseUrl.trim()) {
      setInvalid(true);
      setStatus({ msg: "Jira base URL is required.", type: "err" });
      return;
    }

    setLoading(true);
    setStatus({ msg: "Adding project to backend...", type: "info" });

    try {
      await saveGithubToken(token.trim());
      onTokenSaved?.();

      // For "entire project" + GitHub Issues + "all repos", pass a sentinel so the
      // backend (or future scripts) knows to pull issues from every org repo.
      const resolvedIssueGithubUrl =
        issueSource === "github"
          ? addMode === "project" && orgIssueScope === "all"
            ? "__all__"
            : (issueGithubUrl.trim() || undefined)
          : undefined;

      const response = await addProject(
        addMode === "repo" ? url : orgUrl,
        undefined,
        undefined,
        issueSource === "jira" ? "jira" : undefined,
        issueSource === "jira" ? jiraKey.trim() : undefined,
        issueSource === "jira" ? jiraBaseUrl.trim() : undefined,
        resolvedIssueGithubUrl,
        addMode === "project" ? true : undefined,   // is_org flag
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
      const isDuplicate = msg.includes("already been added");
      if (msg.includes("Invalid GitHub URL")) setInvalid(true);
      setStatus({
        msg: isDuplicate
          ? "This project has already been added. Remove it first if you want to re-extract data."
          : msg,
        type: "err",
        duplicate: isDuplicate,
      });
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
          <p className="modal-sub">Choose whether to add a single repository or an entire GitHub project (org&nbsp;/&nbsp;user).</p>
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
              <p className="field-help" style={{ marginTop: ".25rem" }}>
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
          </div>

          {/* Add-mode toggle — Carbon Content Switcher pattern */}
          <div className="field" style={{ marginTop: "1.75rem" }}>
            <label id="add-mode-label">Add type</label>
            <div className="add-mode-toggle" role="group" aria-labelledby="add-mode-label">
              <button
                type="button"
                className={"add-mode-btn" + (addMode === "repo" ? " active" : "")}
                aria-pressed={addMode === "repo"}
                disabled={loading}
                onClick={() => setAddMode("repo")}
              >
                Single repository
              </button>
              <button
                type="button"
                className={"add-mode-btn" + (addMode === "project" ? " active" : "")}
                aria-pressed={addMode === "project"}
                disabled={loading}
                onClick={() => setAddMode("project")}
              >
                Entire project
              </button>
            </div>
          </div>

          {/* Primary URL — label/placeholder change based on mode */}
          <div className="jira-fields" style={{ marginTop: "1.25rem" }}>
            {addMode === "repo" ? (
              <div className={"field" + (invalid && !url.trim() ? " show-err" : "")}>
                <label htmlFor="i-url">
                  Primary GitHub repository URL <span style={{ color: "var(--red-50)" }}>*</span>
                </label>
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
            ) : (
              <div className={"field" + (invalid && !orgUrl.trim() ? " show-err" : "")}>
                <label htmlFor="i-org-url">
                  GitHub project URL <span style={{ color: "var(--red-50)" }}>*</span>
                </label>
                <input
                  id="i-org-url"
                  ref={inputRef}
                  type="text"
                  placeholder="https://github.com/owner"
                  autoComplete="off"
                  spellCheck="false"
                  className={invalid && !orgUrl.trim() ? "invalid" : ""}
                  value={orgUrl}
                  disabled={loading}
                  onChange={(e) => setOrgUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                />
                <div className="err">Enter a valid GitHub org or user URL.</div>
                <p className="field-help" style={{ marginTop: ".25rem" }}>
                  Provide the top-level URL of your GitHub organisation or user — all repositories under it will be tracked.
                </p>
              </div>
            )}
          </div>

          {/* Issue source toggle */}
          <div className="field" style={{ marginTop: "1.5rem" }}>
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

          {/* GitHub Issues fields */}
          {issueSource === "github" && (
            <div className="jira-fields">
              {/* Entire-project mode: offer "one repo" vs "all repos" sub-choice */}
              {addMode === "project" && (
                <div className="scope-subgroup">
                  <div className="field">
                    <label>Issues scope</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="orgIssueScope"
                          value="one"
                          checked={orgIssueScope === "one"}
                          disabled={loading}
                          onChange={() => setOrgIssueScope("one")}
                        />
                        One repository
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="orgIssueScope"
                          value="all"
                          checked={orgIssueScope === "all"}
                          disabled={loading}
                          onChange={() => setOrgIssueScope("all")}
                        />
                        All repositories
                      </label>
                    </div>
                  </div>

                  {/* "one repo" sub-option: issue URL input */}
                  {orgIssueScope === "one" && (
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
                        Specify a single repository within the project whose issues will be tracked.
                      </p>
                    </div>
                  )}

                  {/* "all repos" sub-option: informational note */}
                  {orgIssueScope === "all" && (
                    <p className="field-help" style={{ margin: 0 }}>
                      Issues will be collected from every repository within the project.
                    </p>
                  )}
                </div>
              )}

              {/* Single-repo mode: optional override issue repo */}
              {addMode === "repo" && (
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
              )}
            </div>
          )}

          {/* Jira fields */}
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
              <div className={"field" + (invalid && !jiraBaseUrl.trim() ? " show-err" : "")} style={{ marginTop: ".75rem" }}>
                <label htmlFor="i-jira-url">
                  Jira base URL <span style={{ color: "var(--red-50)" }}>*</span>
                </label>
                <input
                  id="i-jira-url"
                  type="text"
                  placeholder="https://issues.apache.org/jira"
                  autoComplete="off"
                  spellCheck="false"
                  className={invalid && !jiraBaseUrl.trim() ? "invalid" : ""}
                  value={jiraBaseUrl}
                  disabled={loading}
                  onChange={(e) => setJiraBaseUrl(e.target.value)}
                />
                <div className="err">Jira base URL is required.</div>
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
