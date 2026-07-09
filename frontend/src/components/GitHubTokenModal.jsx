import { useEffect, useRef, useState } from "react";
import { saveGithubToken } from "../api.js";

export default function GitHubTokenModal({ open, onClose, onSaved }) {
  const [token, setToken]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setToken("");
      setError(null);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    if (!token.trim()) { setError("Please enter a token."); return; }
    setError(null);
    setLoading(true);
    try {
      await saveGithubToken(token.trim());
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save token.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tokenModalTitle"
      onClick={(e) => { if (e.target.classList.contains("modal-overlay")) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" id="tokenModalTitle">GitHub token</h2>
          <p className="modal-sub">
            A personal access token is required to fetch data from GitHub.
            It is stored only in the backend's memory and never written to disk.
          </p>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M24 9.4 22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6z" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className={"field" + (error ? " show-err" : "")}>
            <label htmlFor="i-token">Personal access token</label>
            <input
              id="i-token"
              ref={inputRef}
              type="password"
              placeholder="ghp_..."
              autoComplete="off"
              spellCheck="false"
              className={error ? "invalid" : ""}
              value={token}
              disabled={loading}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
            />
            {error && <div className="err">{error}</div>}
          </div>
          <p className="field-help">
            Needs at least <code>public_repo</code> read access.{" "}
            <a
              href="https://github.com/settings/tokens/new?description=oss-dashboard&scopes=public_repo"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--link)" }}
            >
              Create one on GitHub ↗
            </a>
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-add"    onClick={submit}  disabled={loading}>
            {loading ? "Saving…" : "Save token"}
          </button>
        </div>
      </div>
    </div>
  );
}
