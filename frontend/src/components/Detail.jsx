import { useState } from "react";
import { MONTHS } from "../data.js";
import { Tag, Tile, BarChart, Meter } from "./ui.jsx";

export default function Detail({ d, onOverview }) {
  const [showCommitsQuarterly, setShowCommitsQuarterly] = useState(false);
  const [showPRQuarterly, setShowPRQuarterly] = useState(false);
  const [showIssueQuarterly, setShowIssueQuarterly] = useState(false);
  
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

      <div className="section two-col">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="section-h" style={{ margin: 0 }}>
              {showPRQuarterly ? 'PR activity per quarter' : 'PR activity per year'}
            </h2>
              <button
                className="btn-secondary"
                onClick={() => setShowPRQuarterly(!showPRQuarterly)}
                style={{
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  fontFamily: 'inherit'
                }}
              >
                {showPRQuarterly ? 'Show yearly' : 'Show quarterly'}
              </button>
            </div>
            {showPRQuarterly && d.prQuarterly && d.prQuarterly.length > 0 ? (
              <BarChart
                values={d.prQuarterly.map((x) => x.v)}
                labels={d.prQuarterly.map((x) => x.q)}
                currentIndex={d.prQuarterly.findIndex((x) => x.c)}
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
            Darker bar = current period · {showPRQuarterly ? `Last ${d.prQuarterly?.length || 0} quarters` : 'Total PRs per year'}
          </p>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="section-h" style={{ margin: 0 }}>
              {showIssueQuarterly ? 'Issue activity per quarter' : 'Issue activity per year'}
            </h2>
              <button
                className="btn-secondary"
                onClick={() => setShowIssueQuarterly(!showIssueQuarterly)}
                style={{
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  fontFamily: 'inherit'
                }}
              >
                {showIssueQuarterly ? 'Show yearly' : 'Show quarterly'}
              </button>
            </div>
            {showIssueQuarterly && d.issueQuarterly && d.issueQuarterly.length > 0 ? (
              <BarChart
                values={d.issueQuarterly.map((x) => x.v)}
                labels={d.issueQuarterly.map((x) => x.q)}
                currentIndex={d.issueQuarterly.findIndex((x) => x.c)}
                tooltipLabel="issues"
              />
            ) : (
              <BarChart
                values={d.issueYearly?.map((x) => x.v) || [0]}
                labels={d.issueYearly?.map((x) => x.y) || ['2025']}
                currentIndex={d.issueYearly?.findIndex((x) => x.c) || 0}
                tooltipLabel="issues"
              />
            )}
          <p className="chart-cap">
            Darker bar = current period · {showIssueQuarterly ? `Last ${d.issueQuarterly?.length || 0} quarters` : 'Total issues per year'}
          </p>
        </div>
      </div>

      <p className="foot">
        Data via GitHub REST + GraphQL APIs
      </p>
    </main>
  );
}

// Made with Bob
