export default function UIShellHeader({ onToggleNav, navOpen }) {
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
        <button className="shell-action" aria-label="Notifications">
          <svg viewBox="0 0 32 32" fill="currentColor">
            <path d="M28.7 19.3 26 16.6V13a10 10 0 0 0-8-9.8V2h-4v1.2A10 10 0 0 0 6 13v3.6l-2.7 2.7a1 1 0 0 0-.3.7V22a1 1 0 0 0 1 1h7a5 5 0 0 0 10 0h7a1 1 0 0 0 1-1v-2a1 1 0 0 0-.3-.7M16 28a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3" />
          </svg>
        </button>
        <button className="shell-action" aria-label="Account">
          <svg viewBox="0 0 32 32" fill="currentColor">
            <path d="M16 4a5 5 0 1 1-5 5 5 5 0 0 1 5-5m0-2a7 7 0 1 0 7 7 7 7 0 0 0-7-7M26 30h-2v-5a5 5 0 0 0-5-5h-6a5 5 0 0 0-5 5v5H6v-5a7 7 0 0 1 7-7h6a7 7 0 0 1 7 7Z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
