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
                      <path d="M12 12h2v11h-2zm6 0h2v11h-2z"/>
                      <path d="M4 6v2h2l2 20h16l2-20h2V6zm4.64 20L8.98 8h14.04l-.66 18z"/>
                      <path d="M11 2h10v2H11z"/>
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
