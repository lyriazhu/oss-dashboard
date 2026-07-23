import ExtractionToast from './ExtractionToast.jsx';

export default function UIShellHeader({ onToggleNav, navOpen, extracting, onExtractionDone, queueIdx, queueTotal, onTokenExpired }) {
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

      {extracting && (
        <ExtractionToast
          key={extracting.id}
          projectId={extracting.id}
          projectName={extracting.mergedName || extracting.name}
          mode={extracting.mode}
          queueIdx={queueIdx}
          queueTotal={queueTotal}
          isSingleRepo={extracting.isSingleRepo || false}
          onDone={onExtractionDone}
          onTokenExpired={onTokenExpired}
        />
      )}
    </header>
  );
}
