import { useEffect, useMemo, useState } from "react";
import { QUARTERS } from "../data.js";
import { Tag, BarChart } from "./ui.jsx";

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 4l4 4-4 4-.7-.7L8.6 8 5.3 4.7z" />
    </svg>
  );
}

function DeleteConfirmModal({ count, names, onConfirm, onCancel }) {
  const title = count === 1 ? `Delete "${names[0]}"?` : `Delete ${count} projects?`;
  const body = count === 1
    ? `"${names[0]}" and all its extracted data will be permanently removed.`
    : `The following ${count} projects and all their extracted data will be permanently removed:\n${names.join(', ')}.`;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delConfirmTitle"
      onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onCancel(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" id="delConfirmTitle">{title}</h2>
          <p className="modal-sub">{body}</p>
          <button className="modal-close" aria-label="Cancel" onClick={onCancel}>
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M24 9.4 22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6z" />
            </svg>
          </button>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm-delete" onClick={onConfirm}>
            {count === 1 ? 'Delete project' : `Delete ${count} projects`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      className="ov-row-checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function Overview({
  data, order, flashKey, onSelect, onAddClick,
  selectMode, selectedKeys, onSelectToggle, onToggleSelectMode, onDeleteSelected, deleting,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Calculate summary statistics and last updated date from actual data
  const { summary, lastUpdated } = useMemo(() => {
    const totalCommunities = order.length;
    
    // Aggregate statistics across all projects
    let totalContributors = 0;
    let totalCommits = 0;
    let totalIssues = 0;
    let oldestExtraction = null;
    let allHaveExtraction = true;
    
    order.forEach(key => {
      const project = data[key];
      if (project) {
        // Get all-time contributors from overview data (ov.contributorsAllTime)
        if (project.ov && project.ov.contributorsAllTime) {
          const num = parseInt(project.ov.contributorsAllTime.replace(/[,+]/g, ''));
          if (!isNaN(num)) totalContributors += num;
        }
        
        // Get all-time commits from overview data (ov.commitsAllTime)
        if (project.ov && project.ov.commitsAllTime) {
          const num = parseInt(project.ov.commitsAllTime.replace(/[,+]/g, ''));
          if (!isNaN(num)) totalCommits += num;
        }

        // Get open issues from KPIs
        if (project.kpis) {
          const issuesKpi = project.kpis.find(k => k.l === 'Open Issues');
          if (issuesKpi) {
            const num = parseInt(issuesKpi.v.replace(/[,+]/g, ''));
            if (!isNaN(num)) totalIssues += num;
          }
        }
        
        // Track oldest extraction time — the dashboard is fully up to date only
        // once every project has been extracted, so we use the minimum.
        if (project.extractedAt) {
          const extractionDate = new Date(project.extractedAt);
          if (!oldestExtraction || extractionDate < oldestExtraction) {
            oldestExtraction = extractionDate;
          }
        } else {
          allHaveExtraction = false;
        }
      }
    });
    
    // Format numbers with commas only
    const formatNum = (num) => num.toLocaleString('en-US');
    
    // Only show timestamp when every project has been extracted
    const formattedDate = (allHaveExtraction && oldestExtraction)
      ? oldestExtraction.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) + ' at ' + oldestExtraction.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : 'Unknown';
    
    return {
      summary: [
        { l: "Total communities", v: totalCommunities.toString(), h: `${totalCommunities} active projects` },
        { l: "Total contributors (All-Time)", v: formatNum(totalContributors), h: "Across all active repos" },
        { l: "Commits (All-Time)", v: formatNum(totalCommits), h: "All communities combined" },
        { l: "Open Issues", v: formatNum(totalIssues), h: "Across all communities" },
      ],
      lastUpdated: formattedDate
    };
  }, [data, order]);

  // Scroll a newly added row into view when it flashes
  useEffect(() => {
    if (!flashKey) return;
    const row = document.querySelector(`#commTable tbody tr[data-key="${flashKey}"]`);
    if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [flashKey]);

  return (
    <main>
      <div className="ov-header">
        <h1 className="ov-title">Open Source Dashboard</h1>
        <div className="ov-meta">
          <span>
            Last updated: <b>{lastUpdated}</b>
          </span>
        </div>
      </div>
      <hr className="ov-rule" />

      <div className="tile-grid">
        {summary.map((t, i) => (
          <div className="tile" key={i}>
            <div className="k-label">{t.l}</div>
            <div className="k-value">{t.v}</div>
            <div className="k-help">{t.h}</div>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="sec-head-row">
          <h2 className="section-h" style={{ margin: 0 }}>
            Communities
          </h2>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            <button className="btn-ghost" onClick={onToggleSelectMode}>
              {selectMode ? "Unselect" : "Select"}
            </button>
            {selectMode ? (
              <button
                className={"btn-danger" + (selectedKeys.size === 0 ? " btn-danger--dim" : "")}
                onClick={() => setConfirmOpen(true)}
                disabled={deleting || selectedKeys.size === 0}
              >
                {deleting
                  ? "Deleting…"
                  : selectedKeys.size > 0
                    ? `Delete ${selectedKeys.size} project${selectedKeys.size > 1 ? "s" : ""}`
                    : "Delete project"}
                <svg viewBox="0 0 32 32" fill="currentColor">
                  <path d="M12 12h2v11h-2zm6 0h2v11h-2z"/>
                  <path d="M4 6v2h2l2 20h16l2-20h2V6zm4.64 20L8.98 8h14.04l-.66 18z"/>
                  <path d="M11 2h10v2H11z"/>
                </svg>
              </button>
            ) : (
              <button className="btn-primary" onClick={onAddClick}>
                Add project
                <svg viewBox="0 0 32 32" fill="currentColor">
                  <path d="M17 15V8h-2v7H8v2h7v7h2v-7h7v-2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="table-wrap">
          <table id="commTable">
            <thead>
              <tr>
                {selectMode && <th className="chk-cell" aria-label="Select" />}
                <th>Community</th>
                <th>Foundation</th>
                <th>Repository</th>
                <th className="num">Contributors (YTD)</th>
                <th className="num">Contributors (All-Time)</th>
                <th className="num">Commits (YTD)</th>
                <th className="num">Commits (All-Time)</th>
                <th className="num">Stars</th>
                <th>Status</th>
                {!selectMode && <th aria-label="Open" />}
              </tr>
            </thead>
            <tbody>
              {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
                const d = data[key];
                const o = d.ov;
                const isSelected = selectedKeys.has(key);
                const rowClasses = [
                  key === flashKey ? "row-flash" : "",
                  selectMode && isSelected ? "row-selected" : "",
                ].filter(Boolean).join(" ") || undefined;
                return (
                  <tr
                    key={key}
                    data-key={key}
                    tabIndex={0}
                    role={selectMode ? "checkbox" : "button"}
                    aria-checked={selectMode ? isSelected : undefined}
                    aria-label={selectMode ? `Select ${d.name}` : `View ${d.name} metrics`}
                    className={rowClasses}
                    onClick={() => selectMode ? onSelectToggle(key) : onSelect(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectMode ? onSelectToggle(key) : onSelect(key);
                      }
                    }}
                  >
                    {selectMode && (
                      <td className="chk-cell">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => onSelectToggle(key)}
                          label={`Select ${d.name}`}
                        />
                      </td>
                    )}
                    <td className="strong">{d.name}</td>
                    <td>{o.foundation}</td>
                    <td>
                      {d.repoUrl ? (
                        <a
                          href={d.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--link)", fontSize: ".8125rem" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {d.repoUrl.replace("https://github.com/", "")}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="num">{o.contributorsYtd}</td>
                    <td className="num">{o.contributorsAllTime}</td>
                    <td className="num">{o.commits}</td>
                    <td className="num">{o.commitsAllTime}</td>
                    <td className="num">{o.stars}</td>
                    <td>
                      <Tag cls={d.status.cls} label={d.status.label} />
                    </td>
                    {!selectMode && (
                      <td className="chev-cell">
                        <Chevron />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="legend">
          Status: Healthy = contributor growth positive QoQ · Watch = flat or declining new contributors ·
          Growing = new project, expanding
        </p>
      </div>

      <div className="section">
        <h2 className="section-h">Commits Per Quarter (Past 12 Quarters)</h2>
        <div className="mini-grid">
          {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
            const d = data[key];
            return (
              <div
                className="mini-card"
                key={key}
                tabIndex={0}
                role="button"
                aria-label={`View ${d.name} metrics`}
                onClick={() => onSelect(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(key);
                  }
                }}
              >
                <div className="mini-title">{d.name}</div>
                <BarChart
                  values={d.ov.quarters}
                  labels={d.quarters?.slice(-12).map((x) => x.q
                    ? x.q.replace(/^(Q\d)\s(\d{2})(\d{2})$/, "$1'$3")
                    : x.q) || QUARTERS}
                  currentIndex={d.quarters?.slice(-12).findLastIndex?.((x) => x.c) ?? -1}
                  variant="mini"
                  slanted={true}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h2 className="section-h">CVEs Per Month (Past 12 Months)</h2>
        <div className="mini-grid">
          {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
            const d = data[key];
            const hasCveData = d.cveTotalAllTime > 0;
            return (
              <div
                className="mini-card"
                key={key}
                tabIndex={0}
                role="button"
                aria-label={`View ${d.name} CVE metrics`}
                onClick={() => onSelect(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(key);
                  }
                }}
              >
                <div className="mini-title">{d.name}</div>
                {hasCveData ? (
                  <BarChart
                    values={d.cveMonthly.map((x) => x.v)}
                    labels={d.cveMonthly.map((x) => x.m)}
                    currentIndex={d.cveMonthly.findIndex((x) => x.c)}
                    tooltipLabel="CVEs"
                    variant="mini"
                    slanted={true}
                  />
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-helper)', padding: '0.5rem 0', textAlign: 'center' }}>
                    No CVEs reported
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="foot">
        Wireframe — illustrative data only · Click any community row to view project-specific metrics · Data
        via GitHub REST + GraphQL APIs
      </p>

      {confirmOpen && (
        <DeleteConfirmModal
          count={selectedKeys.size}
          names={[...selectedKeys].map((k) => data[k]?.name ?? k)}
          onConfirm={() => { setConfirmOpen(false); onDeleteSelected(); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </main>
  );
}
