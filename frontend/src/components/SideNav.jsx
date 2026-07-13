import { useState } from "react";

export default function SideNav({ data, order, selectedKey, collapsed, onSelect, onOverview, onRemove }) {
  const [confirmKey, setConfirmKey] = useState(null);

  const sorted = [...order].sort((a, b) =>
    data[a].name.localeCompare(data[b].name, undefined, { numeric: true, sensitivity: "base" })
  );

  function handleRemoveClick(e, key) {
    e.stopPropagation();
    if (confirmKey === key) {
      setConfirmKey(null);
      onRemove?.(key);
    } else {
      setConfirmKey(key);
    }
  }

  function handleNavItemClick(key) {
    if (confirmKey) setConfirmKey(null);
    onSelect(key);
  }

  return (
    <nav className={"sidenav" + (collapsed ? " collapsed" : "")} aria-label="Communities">
      <div className="sidenav-inner">
        <button className="nav-item nav-overview" onClick={onOverview}>
          <span className="ni-name">Overview</span>
          <span className="ni-sub">Back to dashboard home</span>
        </button>
        <div className="sidenav-header">Communities</div>
        <div>
          {sorted.map((key) => {
            const d = data[key];
            const confirming = confirmKey === key;
            return (
              <div key={key} className={"nav-item-wrap" + (confirming ? " nav-item-wrap--confirming" : "")}>
                <button
                  className="nav-item"
                  aria-current={key === selectedKey ? "page" : undefined}
                  onClick={() => handleNavItemClick(key)}
                >
                  <span className="ni-name">{d.name}</span>
                  <span className="ni-sub">{d.sub}</span>
                </button>
                <button
                  className={"nav-remove" + (confirming ? " nav-remove--confirm" : "")}
                  aria-label={confirming ? `Confirm remove ${d.name}` : `Remove ${d.name}`}
                  title={confirming ? "Click again to confirm removal" : "Remove project"}
                  onClick={(e) => handleRemoveClick(e, key)}
                >
                  {confirming ? (
                    <span className="nav-remove-label">Remove?</span>
                  ) : (
                    <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14" aria-hidden="true">
                      <rect x="12" y="12" width="2" height="12"/>
                      <rect x="18" y="12" width="2" height="12"/>
                      <path d="M4,6V8H6V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V8h2V6ZM8,28V8H24V28Z"/>
                      <rect x="12" y="2" width="8" height="2"/>
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
