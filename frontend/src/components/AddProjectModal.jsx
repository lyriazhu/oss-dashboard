import { useEffect, useRef, useState } from "react";
import { addProject } from "../api.js";

export default function AddProjectModal({ open, onClose, onAdd, onSuccess }) {
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // {msg, type}
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setInvalid(false);
      setLoading(false);
      setStatus(null);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    setInvalid(false);
    setLoading(true);
    setStatus({ msg: "Adding project to backend...", type: "info" });
    
    try {
      const response = await addProject(url);
      
      if (response.success) {
        setStatus({ 
          msg: `${response.message}. ${response.extractionStatus}`, 
          type: "info" 
        });
        
        // Wait a moment to show success message, then close and refresh
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess(); // Reload projects from backend
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
      if (msg.includes("Invalid GitHub URL")) {
        setInvalid(true);
      }
      setStatus({ msg, type: "err" });
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addModalTitle"
      onClick={(e) => {
        if (e.target.classList.contains("modal-overlay")) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" id="addModalTitle">
            Add project
          </h2>
          <p className="modal-sub">Paste a GitHub repository URL — we'll pull the metrics automatically.</p>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M24 9.4 22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6z" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className={"field" + (invalid ? " show-err" : "")}>
            <label htmlFor="i-url">GitHub repository URL</label>
            <input
              id="i-url"
              ref={inputRef}
              type="text"
              placeholder="https://github.com/owner/repo"
              autoComplete="off"
              spellCheck="false"
              className={invalid ? "invalid" : ""}
              value={url}
              disabled={loading}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="err">Enter a valid GitHub repository URL.</div>
          </div>
          <p className="field-help">
            The project will be added to the backend and data extraction will start automatically.
            This may take several minutes depending on the project size.
          </p>
          {status && <div className={"add-status " + status.type}>{status.msg}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-add" onClick={submit} disabled={loading}>
            {loading ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
