export default function SideNav({ data, order, selectedKey, collapsed, onSelect, onOverview }) {
  return (
    <nav className={"sidenav" + (collapsed ? " collapsed" : "")} aria-label="Communities">
      <div className="sidenav-inner">
        <button className="nav-item nav-overview" onClick={onOverview}>
          <span className="ni-name">Overview</span>
          <span className="ni-sub">Back to dashboard home</span>
        </button>
        <div className="sidenav-header">Communities</div>
        <div>
          {order.map((key) => {
            const d = data[key];
            return (
              <button
                key={key}
                className="nav-item"
                aria-current={key === selectedKey ? "page" : undefined}
                onClick={() => onSelect(key)}
              >
                <span className="ni-name">{d.name}</span>
                <span className="ni-sub">{d.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
