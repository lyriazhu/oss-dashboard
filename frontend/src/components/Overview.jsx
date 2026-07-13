import { useEffect, useMemo, useRef, useState } from "react";
import { Tag, BarChart } from "./ui.jsx";
import { saveGithubToken, getSavedToken, refreshAllProjects } from "../api.js";

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 4l4 4-4 4-.7-.7L8.6 8 5.3 4.7z" />
    </svg>
  );
}

function RefreshModal({ open, onClose, onStarted }) {
  const [token, setToken]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setToken(getSavedToken() || "");
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
    if (!token.trim()) { setError("A GitHub token is required."); return; }
    setError(null);
    setLoading(true);
    try {
      await saveGithubToken(token.trim());          // persist to localStorage + backend memory
      const result = await refreshAllProjects(token.trim()); // also sent in body as safety net
      onClose();
      onStarted(result.started || []);
    } catch (err) {
      setError(err.message || "Failed to start refresh.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refreshModalTitle"
      onClick={(e) => { if (e.target.classList.contains("modal-overlay")) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" id="refreshModalTitle">Refresh all projects</h2>
          <p className="modal-sub">
            Re-extract data for every project on the dashboard. Enter your GitHub personal
            access token to authenticate with the GitHub API.
          </p>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M24 9.4 22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6z" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className={"field" + (error ? " show-err" : "")}>
            <label htmlFor="i-refresh-token">Personal access token</label>
            <input
              id="i-refresh-token"
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
          <button className="btn-add" onClick={submit} disabled={loading}>
            {loading ? "Starting…" : "Refresh all"}
          </button>
        </div>
      </div>
    </div>
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

// Inline editable cell. Activated externally via the `active` prop.
// onCancelNav: called on focus to cancel any pending row navigation timer.
function InlineEdit({ value, field, projectId, onSave, active, onDeactivate, onCancelNav }) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(false); // guard against double-fire from Enter then onBlur

  // When the cell is deactivated, reset draft to the latest value for the next open.
  // We deliberately do NOT reset draft while active — that would clobber what the
  // user is typing if a parent re-render happens mid-edit.
  useEffect(() => {
    if (!active) {
      committed.current = false;
      setDraft(value);
    }
  }, [active]); // intentionally omit `value` — only reset on deactivation, not on every prop change

  function commit() {
    if (committed.current) return; // already committed from Enter key; swallow the blur
    committed.current = true;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(projectId, { [field]: trimmed });
    onDeactivate();
  }

  function onKeyDown(e) {
    e.stopPropagation();
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') {
      committed.current = true; // suppress the onBlur that follows focus loss
      setDraft(value);
      onDeactivate();
    }
  }

  if (active) {
    return (
      <input
        className="inline-edit-input"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => onCancelNav?.()}
        onBlur={commit}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Edit ${field}`}
      />
    );
  }

  return (
    <span className="inline-edit-text inline-edit-text--editable">
      {value}
    </span>
  );
}

function CommunityRow({
  rowKey, d, o, isSelected, rowClass, selectMode,
  onSelect, onSelectToggle, onUpdateProject,
}) {
  const [activeEdit, setActiveEdit] = useState(null); // null | "name" | "foundation"
  const pendingNav = useRef(null);
  // Ref mirrors activeEdit so handleClick always sees the current value
  // without stale closure issues.
  const activeEditRef = useRef(null);

  function setEdit(field) {
    activeEditRef.current = field;
    setActiveEdit(field);
  }

  function cancelNav() { clearTimeout(pendingNav.current); }

  // Clear the pending navigation timer on unmount
  useEffect(() => () => cancelNav(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function getEditField(e) {
    const td = e.target.closest('td[data-field]');
    return td ? td.dataset.field : null;
  }

  function handleClick(e) {
    if (selectMode) { onSelectToggle(rowKey); return; }
    if (activeEditRef.current) return; // edit input is open — ignore click
    const field = getEditField(e);
    if (field) {
      // Click landed on an editable cell — delay navigation so a second click
      // (double-click) has time to cancel it and open the editor instead.
      clearTimeout(pendingNav.current);
      pendingNav.current = setTimeout(() => onSelect(rowKey), 300);
    } else {
      // Click on a non-editable cell — navigate immediately.
      cancelNav();
      onSelect(rowKey);
    }
  }

  function handleDoubleClick(e) {
    if (selectMode) return;
    cancelNav(); // stop navigation scheduled by the two preceding click events
    const field = getEditField(e);
    if (field) setEdit(field);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectMode ? onSelectToggle(rowKey) : onSelect(rowKey);
    }
  }

  return (
    <tr
      data-key={rowKey}
      tabIndex={0}
      role={selectMode ? "checkbox" : "button"}
      aria-checked={selectMode ? isSelected : undefined}
      aria-label={selectMode ? `Select ${d.name}` : `View ${d.name} metrics`}
      className={rowClass}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      {selectMode && (
        <td className="chk-cell">
          <Checkbox
            checked={isSelected}
            onChange={() => onSelectToggle(rowKey)}
            label={`Select ${d.name}`}
          />
        </td>
      )}
      <td className="strong" data-field="name">
        <InlineEdit
          value={d.name}
          field="name"
          projectId={rowKey}
          onSave={onUpdateProject}
          active={activeEdit === "name"}
          onDeactivate={() => { activeEditRef.current = null; setActiveEdit(null); }}
          onCancelNav={cancelNav}
        />
      </td>
      <td data-field="foundation">
        <InlineEdit
          value={o.foundation}
          field="foundation"
          projectId={rowKey}
          onSave={onUpdateProject}
          active={activeEdit === "foundation"}
          onDeactivate={() => { activeEditRef.current = null; setActiveEdit(null); }}
          onCancelNav={cancelNav}
        />
      </td>
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
}

export default function Overview({
  data, order, flashKey, onSelect, onAddClick, onUpdateProject,
  selectMode, selectedKeys, onSelectToggle, onToggleSelectMode, onDeleteSelected, deleting,
  onRefreshAll,
}) {
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);

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
      <RefreshModal
        open={refreshModalOpen}
        onClose={() => setRefreshModalOpen(false)}
        onStarted={(ids) => { onRefreshAll?.(ids); }}
      />
      <div className="ov-header">
        <h1 className="ov-title">Open Source Dashboard</h1>
        <div className="ov-meta">
          <button
            className="btn-refresh"
            aria-label="Refresh all projects"
            onClick={() => setRefreshModalOpen(true)}
          >
            Refresh all
            <svg viewBox="0 0 32 32" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path d="M12 10H6.78A11 11 0 0 1 27 16a1 1 0 0 0 2 0A13 13 0 0 0 6 7.68V4H4v8h8zm8 12h5.22A11 11 0 0 1 5 16a1 1 0 0 0-2 0 13 13 0 0 0 23 8.32V28h2v-8h-8z"/>
            </svg>
          </button>
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
                const rowClass = [
                  key === flashKey ? "row-flash" : "",
                  selectMode && isSelected ? "row-selected" : "",
                ].filter(Boolean).join(" ") || undefined;
                return (
                  <CommunityRow
                    key={key}
                    rowKey={key}
                    d={d}
                    o={o}
                    isSelected={isSelected}
                    rowClass={rowClass}
                    selectMode={selectMode}
                    onSelect={onSelect}
                    onSelectToggle={onSelectToggle}
                    onUpdateProject={onUpdateProject}
                  />
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
        <h2 className="section-h">Commits Per Year (Capped to 10 Years)</h2>
        <div className="mini-grid">
          {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
            const d = data[key];
            const yearlyCommits = (d.commits || []).slice(-10);
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
                  values={yearlyCommits.map((x) => x.v)}
                  labels={yearlyCommits.map((x) => x.y)}
                  currentIndex={yearlyCommits.findLastIndex?.((x) => x.c) ?? -1}
                  variant="mini"
                  slanted={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h2 className="section-h">Contributors Per Year (Capped to 10 Years)</h2>
        <div className="mini-grid">
          {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
            const d = data[key];
            const yearlyContributors = (d.retentionYearly || []).slice(-10);
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
                  values={yearlyContributors.map((x) => x.active || 0)}
                  labels={yearlyContributors.map((x) => x.y)}
                  currentIndex={yearlyContributors.findLastIndex?.((x) => x.c) ?? -1}
                  tooltipLabel="Contributors"
                  variant="mini"
                  slanted={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h2 className="section-h">New PRs Per Year (Capped to 10 Years)</h2>
        <div className="mini-grid">
          {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
            const d = data[key];
            const yearlyPrs = (d.prYearly || []).slice(-10);
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
                  values={yearlyPrs.map((x) => x.v)}
                  labels={yearlyPrs.map((x) => x.y)}
                  currentIndex={yearlyPrs.findLastIndex?.((x) => x.c) ?? -1}
                  tooltipLabel="PRs"
                  variant="mini"
                  slanted={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h2 className="section-h">Issues Per Year (Capped to 10 Years)</h2>
        <div className="mini-grid">
          {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
            const d = data[key];
            const yearlyIssues = (d.issueYearly || []).slice(-10);
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
                  values={yearlyIssues.map((x) => x.v)}
                  labels={yearlyIssues.map((x) => x.y)}
                  currentIndex={yearlyIssues.findLastIndex?.((x) => x.c) ?? -1}
                  tooltipLabel="Issues"
                  variant="mini"
                  slanted={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h2 className="section-h">CVEs Per Year (Capped to 10 Years)</h2>
        <div className="mini-grid">
          {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
            const d = data[key];
            const yearlyCves = (d.cveYearly || []).slice(-10);
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
                    values={yearlyCves.map((x) => x.v)}
                    labels={yearlyCves.map((x) => x.y)}
                    currentIndex={yearlyCves.findLastIndex?.((x) => x.c) ?? -1}
                    tooltipLabel="CVEs"
                    variant="mini"
                    slanted={false}
                  />
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-helper)', minHeight: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
