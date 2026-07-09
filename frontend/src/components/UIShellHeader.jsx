import ExtractionToast from './ExtractionToast.jsx';

export default function UIShellHeader({ onToggleNav, navOpen, extracting, onExtractionDone, onTokenExpired, tokenConfigured, onTokenClick }) {
  return (
    <header className="ui-shell">
      <button
        className="menu-btn"
        aria-label="Toggle communities menu"
        aria-expanded={navOpen}
        onClick={onToggleNav}
      >
        <svg viewBox="0 0 32 32" fill="currentColor">
          <rect x="4" y="6" width="24" height="2" />
          <rect x="4" y="15" width="24" height="2" />
          <rect x="4" y="24" width="24" height="2" />
        </svg>
      </button>

      <div className="shell-right">
        <button
          className={"shell-action token-btn" + (tokenConfigured ? "" : " token-btn--unset")}
          aria-label={tokenConfigured ? "GitHub token configured" : "Set GitHub token"}
          title={tokenConfigured ? "GitHub token configured — click to update" : "GitHub token not set — click to configure"}
          onClick={onTokenClick}
        >
          {/* Key icon */}
          <svg viewBox="0 0 32 32" fill="currentColor">
            <path d="M11 4a9 9 0 1 0 6.93 14.75L28 28.58 29.41 27l-3-3L28 22.41 26.58 21l-1.59 1.59L23 20.58 21.58 19 20 20.58l-2.09-2.09A9 9 0 0 0 11 4zm0 2a7 7 0 1 1 0 14A7 7 0 0 1 11 6z"/>
          </svg>
          {!tokenConfigured && <span className="token-btn-dot" aria-hidden="true" />}
        </button>
      </div>

      {extracting && (
        <ExtractionToast
          projectId={extracting.id}
          projectName={extracting.name}
          onDone={onExtractionDone}
        />
      )}
    </header>
  );
}
