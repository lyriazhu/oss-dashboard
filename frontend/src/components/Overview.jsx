import { useEffect, useMemo } from "react";
import { QUARTERS } from "../data.js";
import { Tag, BarChart } from "./ui.jsx";

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 4l4 4-4 4-.7-.7L8.6 8 5.3 4.7z" />
    </svg>
  );
}

export default function Overview({ data, order, flashKey, onSelect, onAddClick }) {
  // Calculate summary statistics and last updated date from actual data
  const { summary, lastUpdated } = useMemo(() => {
    const totalCommunities = order.length;
    
    // Aggregate statistics across all projects
    let totalContributors = 0;
    let totalCommits = 0;
    let totalIssues = 0;
    let mostRecentExtraction = null;
    
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
          const issuesKpi = project.kpis.find(k => k.l === 'Open issues');
          if (issuesKpi) {
            const num = parseInt(issuesKpi.v.replace(/[,+]/g, ''));
            if (!isNaN(num)) totalIssues += num;
          }
        }
        
        // Track most recent extraction time
        if (project.extractedAt) {
          const extractionDate = new Date(project.extractedAt);
          if (!mostRecentExtraction || extractionDate > mostRecentExtraction) {
            mostRecentExtraction = extractionDate;
          }
        }
      }
    });
    
    // Format numbers with commas only
    const formatNum = (num) => num.toLocaleString('en-US');
    
    // Format last updated date and time
    const formattedDate = mostRecentExtraction
      ? mostRecentExtraction.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) + ' at ' + mostRecentExtraction.toLocaleTimeString('en-US', {
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
        { l: "Open issues", v: formatNum(totalIssues), h: "Across all communities" },
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
          <span>Data from GitHub API</span>
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
          <button className="btn-primary" onClick={onAddClick}>
            Add project
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M17 15V8h-2v7H8v2h7v7h2v-7h7v-2z" />
            </svg>
          </button>
        </div>
        <div className="table-wrap">
          <table id="commTable">
            <thead>
              <tr>
                <th>Community</th>
                <th>Foundation</th>
                <th className="num">Companies</th>
                <th className="num">Contributors (YTD)</th>
                <th className="num">Contributors (All-Time)</th>
                <th className="num">Commits (YTD)</th>
                <th className="num">Commits (All-Time)</th>
                <th className="num">Stars</th>
                <th>Status</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {[...order].sort((a, b) => data[a].name.localeCompare(data[b].name)).map((key) => {
                const d = data[key];
                const o = d.ov;
                return (
                  <tr
                    key={key}
                    data-key={key}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${d.name} metrics`}
                    className={key === flashKey ? "row-flash" : undefined}
                    onClick={() => onSelect(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(key);
                      }
                    }}
                  >
                    <td className="strong">{d.name}</td>
                    <td>{o.foundation}</td>
                    <td className="num">{o.companies}</td>
                    <td className="num">{o.contributorsYtd}</td>
                    <td className="num">{o.contributorsAllTime}</td>
                    <td className="num">{o.commits}</td>
                    <td className="num">{o.commitsAllTime}</td>
                    <td className="num">{o.stars}</td>
                    <td>
                      <Tag cls={d.status.cls} label={d.status.label} />
                    </td>
                    <td className="chev-cell">
                      <Chevron />
                    </td>
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
        <h2 className="section-h">Commit activity per quarter across all communities</h2>
        <div className="mini-grid">
          {order.map((key) => {
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
                <BarChart values={d.ov.quarters} labels={QUARTERS} variant="mini" />
              </div>
            );
          })}
        </div>
      </div>

      <p className="foot">
        Wireframe — illustrative data only · Click any community row to view project-specific metrics · Data
        via GitHub REST + GraphQL APIs
      </p>
    </main>
  );
}
