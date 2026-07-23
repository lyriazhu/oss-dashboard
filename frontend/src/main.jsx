import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const EXTRACTION_STORAGE_KEY = 'oss_dashboard_extracting';
const QUEUE_STORAGE_KEY      = 'oss_dashboard_refresh_queue';
const ADD_QUEUE_STORAGE_KEY  = 'oss_dashboard_add_queue';
const SESSION_ID_KEY         = 'oss_dashboard_session_id';

/**
 * Wipe all extraction-related localStorage entries.
 * Called when the backend session ID doesn't match the stored one,
 * meaning the backend was restarted and any in-progress extraction is gone.
 */
function clearExtractionStorage() {
  localStorage.removeItem(EXTRACTION_STORAGE_KEY);
  localStorage.removeItem(QUEUE_STORAGE_KEY);
  localStorage.removeItem(ADD_QUEUE_STORAGE_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
}

/**
 * Fetch the backend session ID, compare to the stored one, and wipe extraction
 * state if they differ (backend was restarted).  Stores the new session ID so
 * a plain page reload (same backend session) passes the check next time.
 *
 * This runs before React renders so useState never reads stale extraction data.
 */
async function validateSessionAndRender() {
  try {
    const res = await fetch('/api/settings/session-id');
    if (res.ok) {
      const { sessionId } = await res.json();
      const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
      if (storedSessionId !== sessionId) {
        // Backend restarted (or first ever load) — discard any stale extraction state.
        clearExtractionStorage();
        localStorage.setItem(SESSION_ID_KEY, sessionId);
      }
    } else {
      // Backend returned an error — treat as restarted, clear to be safe.
      clearExtractionStorage();
    }
  } catch {
    // Backend unreachable — clear to be safe.
    clearExtractionStorage();
  }

  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

validateSessionAndRender();
