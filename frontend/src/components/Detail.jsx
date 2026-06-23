import { MONTHS } from "../data.js";
import { Tag, Tile, BarChart, Meter } from "./ui.jsx";

export default function Detail({ d, onOverview }) {
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
          <h2 className="section-h">Commits per year</h2>
          <BarChart
            values={d.commits.map((x) => x.v)}
            labels={d.commits.map((x) => x.y)}
            currentIndex={d.commits.findIndex((x) => x.c)}
          />
          <p className="chart-cap">Darker bar = current period</p>
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
        <h2 className="section-h">Top contributing companies &amp; project metadata</h2>
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
        <h2 className="section-h">PR &amp; issue activity — past 12 months</h2>
        <BarChart values={d.activity} labels={MONTHS} variant="twelve" />
        <p className="chart-cap">
          Darker bar = current month (Jun 2026) · Hover for monthly breakdown in live version
        </p>
      </div>

      <p className="foot">
        Wireframe — illustrative data only · Data via GitHub REST + GraphQL APIs · Refreshes every 3 days
      </p>
    </main>
  );
}
