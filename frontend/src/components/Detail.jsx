import { useState } from "react";
import { MONTHS } from "../data.js";
import { Tag, Tile, BarChart, Meter, StackedBarChart } from "./ui.jsx";

export default function Detail({ d, onOverview }) {
  const [showCommitsQuarterly, setShowCommitsQuarterly] = useState(false);
  const [showPRMonthly, setShowPRMonthly] = useState(true);
  const [showIssueMonthly, setShowIssueMonthly] = useState(true);
  
  return (
    <main>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button onClick={onOverview}>Overview</button>
        <span className="sep">/</span>
        <span aria-current="page">{d.name}</span>
      </nav>

      <div className="title-row">
        <h1 className="page-title">{d.name}</h1>
        <Tag cls={d.status.cls} label={d.status.label} />
      </div>
      <p className="meta-line">
        <span>{d.foundation}</span>
        <span>{d.founded}</span>
      </p>

      <div className="tile-grid det-tiles">
        {d.kpis.map((k, i) => (
          <Tile key={i} label={k.l} value={k.v} help={k.h} />
        ))}
      </div>

      <div className="section two-col">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="section-h" style={{ margin: 0 }}>
              {showCommitsQuarterly ? 'Commits per quarter' : 'Commits per year'}
            </h2>
            <button
              className="btn-secondary"
              onClick={() => setShowCommitsQuarterly(!showCommitsQuarterly)}
              style={{
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
                fontFamily: 'inherit'
              }}
            >
              {showCommitsQuarterly ? 'Show yearly' : 'Show quarterly'}
            </button>
          </div>
          {showCommitsQuarterly && d.quarters && d.quarters.length > 0 ? (
            <BarChart
              values={d.quarters.map((x) => x.v)}
              labels={d.quarters.map((x) => x.q)}
              currentIndex={d.quarters.findIndex((x) => x.c)}
            />
          ) : (
            <BarChart
              values={d.commits.map((x) => x.v)}
              labels={d.commits.map((x) => x.y)}
              currentIndex={d.commits.findIndex((x) => x.c)}
            />
          )}
          <p className="chart-cap">
            Darker bar = current period · {showCommitsQuarterly ? `Last ${d.quarters?.length || 0} quarters` : 'Total commits per year'}
          </p>
        </div>
        <div>
          <h2 className="section-h">Contributor retention</h2>
          <Meter label="Returning" value={d.retention.returning} color="blue" />
          <Meter label="New contributors" value={d.retention.neu} color="teal" />
          <p className="chart-cap">{d.retention.cap}</p>
        </div>
      </div>

      <hr className="divider" />

      <div className="section">
        <h2 className="section-h">Top contributing companies & project metadata</h2>
        <div className="two-col">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="num">Commits</th>
                  <th className="num">%</th>
                </tr>
              </thead>
              <tbody>
                {d.companies.map((c, i) => (
                  <tr key={i}>
                    <td
                      className={c.strong ? "strong" : ""}
                      style={c.muted ? { color: "var(--text-helper)" } : undefined}
                    >
                      {c.n}
                    </td>
                    <td className="num">{c.c}</td>
                    <td className="num">{c.p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {d.meta.map((m, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--text-primary)" }}>{m.f}</td>
                    <td className={m.flag ? "flag" : ""}>{m.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-h" style={{ margin: 0 }}>
            {showPRMonthly ? 'New PRs per month' : 'New PRs per year'}
          </h2>
            <button
              className="btn-secondary"
              onClick={() => setShowPRMonthly(!showPRMonthly)}
              style={{
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
                fontFamily: 'inherit'
              }}
            >
              {showPRMonthly ? 'Show yearly' : 'Show monthly'}
            </button>
          </div>
          {showPRMonthly && d.prMonthly && d.prMonthly.length > 0 ? (
            <BarChart
              values={d.prMonthly.map((x) => x.v)}
              labels={d.prMonthly.map((x) => x.m)}
              currentIndex={d.prMonthly.findIndex((x) => x.c)}
              tooltipLabel="PRs"
            />
          ) : (
            <BarChart
              values={d.prYearly?.map((x) => x.v) || [0]}
              labels={d.prYearly?.map((x) => x.y) || ['2025']}
              currentIndex={d.prYearly?.findIndex((x) => x.c) || 0}
              tooltipLabel="PRs"
            />
          )}
        <p className="chart-cap">
          Darker bar = current period · {showPRMonthly ? `Last ${d.prMonthly?.length || 0} months` : 'Total PRs per year'}
        </p>
      </div>

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-h" style={{ margin: 0 }}>
            {showIssueMonthly ? 'Issue activity per month' : 'Issue activity per year'}
          </h2>
            <button
              className="btn-secondary"
              onClick={() => setShowIssueMonthly(!showIssueMonthly)}
              style={{
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
                fontFamily: 'inherit'
              }}
            >
              {showIssueMonthly ? 'Show yearly' : 'Show monthly'}
            </button>
          </div>
          {showIssueMonthly && d.issueMonthly && d.issueMonthly.length > 0 ? (
            <StackedBarChart
              values={d.issueMonthly.map((x) => ({ open: x.open || 0, closed: x.closed || 0 }))}
              labels={d.issueMonthly.map((x) => x.m)}
              currentIndex={d.issueMonthly.findIndex((x) => x.c)}
            />
          ) : (
            <StackedBarChart
              values={d.issueYearly?.map((x) => ({ open: x.open || 0, closed: x.closed || 0 })) || [{ open: 0, closed: 0 }]}
              labels={d.issueYearly?.map((x) => x.y) || ['2025']}
              currentIndex={d.issueYearly?.findIndex((x) => x.c) || 0}
            />
          )}
        <p className="chart-cap">
          Darker bar = current period · Green = closed issues, Blue = open issues · {showIssueMonthly ? `Last ${d.issueMonthly?.length || 0} months` : 'Total issues per year'}
        </p>
      </div>

      <p className="foot">
        Data via GitHub REST + GraphQL APIs
      </p>
    </main>
  );
}

// Made with Bob
