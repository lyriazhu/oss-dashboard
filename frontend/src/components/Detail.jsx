import { useState } from "react";
import { MONTHS } from "../data.js";
import { Tag, Tile, BarChart, StackedBarChart } from "./ui.jsx";

const SEV_ORDER = { critical: 0, high: 1, medium: 2, moderate: 2, low: 3, unknown: 4 };
const SEV_COLOR = {
  critical: { bg: '#fff1f1', text: '#da1e28', border: '#ffd7d9' },
  high:     { bg: '#fff3cd', text: '#b76900', border: '#ffe08a' },
  medium:   { bg: '#edf5ff', text: '#0043ce', border: '#d0e2ff' },
  moderate: { bg: '#edf5ff', text: '#0043ce', border: '#d0e2ff' },
  low:      { bg: '#defbe6', text: '#198038', border: '#a7f0ba' },
  unknown:  { bg: 'var(--gray-10)', text: 'var(--text-helper)', border: 'var(--border-subtle)' },
};

function SortArrow({ dir }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: '0.3rem', gap: '1px', verticalAlign: 'middle', opacity: dir ? 1 : 0.35 }}>
      <svg width="7" height="5" viewBox="0 0 7 5" style={{ display: 'block', color: dir === 'asc' ? 'currentColor' : 'var(--text-helper)' }}>
        <path d="M3.5 0L7 5H0z" fill="currentColor" />
      </svg>
      <svg width="7" height="5" viewBox="0 0 7 5" style={{ display: 'block', color: dir === 'desc' ? 'currentColor' : 'var(--text-helper)' }}>
        <path d="M3.5 5L0 0h7z" fill="currentColor" />
      </svg>
    </span>
  );
}

function CveTable({ entries, showAll }) {
  const PAGE_SIZE = 5;
  const [sortCol, setSortCol] = useState('severity');
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'published' ? 'desc' : 'asc');
    }
  }

  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'severity') {
      cmp = (SEV_ORDER[a.severity?.toLowerCase()] ?? 4) - (SEV_ORDER[b.severity?.toLowerCase()] ?? 4);
    } else if (sortCol === 'published') {
      cmp = a.published.localeCompare(b.published);
    } else if (sortCol === 'id') {
      cmp = a.id.localeCompare(b.id);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const visible = showAll ? sorted : sorted.slice(0, PAGE_SIZE);

  const thStyle = (col) => ({
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: sortCol === col ? 'var(--text-primary)' : undefined,
  });

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                { key: 'id',        label: 'CVE ID' },
                { key: 'severity',  label: 'Severity' },
                { key: 'published', label: 'Published' },
              ].map(({ key, label }) => (
                <th key={key} style={thStyle(key)} onClick={() => handleSort(key)}>
                  {label}
                  <SortArrow dir={sortCol === key ? sortDir : null} />
                </th>
              ))}
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((cve, i) => {
              const sev = cve.severity?.toLowerCase() || 'unknown';
              const sc = SEV_COLOR[sev] || SEV_COLOR.unknown;
              return (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                    {cve.id?.startsWith('CVE-') ? (
                      <a href={`https://www.cve.org/CVERecord?id=${cve.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--link)' }}>
                        {cve.id}
                      </a>
                    ) : (
                      <a href={`https://github.com/advisories/${cve.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--link)' }}>
                        {cve.id}
                      </a>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '0.25rem',
                      background: sc.bg,
                      color: sc.text,
                      border: `1px solid ${sc.border}`,
                      textTransform: 'capitalize',
                    }}>
                      {sev === 'moderate' ? 'medium' : sev}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {cve.published}
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    {cve.summary}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ControlRow({ control }) {
  const [open, setOpen] = useState(false);
  const passCount = control.details.filter(d => d.status === 'pass').length;
  const failCount = control.details.filter(d => d.status === 'fail').length;
  const totalCount = control.details.length;

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        {/* Chevron */}
        <svg
          width="12" height="12"
          viewBox="0 0 12 12"
          style={{ flex: '0 0 auto', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', color: 'var(--text-helper)' }}
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="4 2 8 6 4 10" />
        </svg>

        {/* Label */}
        <span style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '5rem' }}>
          {control.label}
        </span>

        {/* Progress bar */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ flex: 1, height: '.5rem', background: 'var(--gray-20)', maxWidth: '14rem' }}>
            <div style={{
              height: '100%',
              width: `${control.pct}%`,
              background: control.pct >= 80 ? 'var(--green-50)' : control.pct >= 60 ? 'var(--yellow-30)' : 'var(--red-50)',
              transition: 'width .35s ease',
            }} />
          </div>
          <span style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '2.5rem' }}>
            {control.pct}%
          </span>
        </div>

        {/* Status summary badge */}
        <span style={{ fontSize: '.75rem', color: failCount > 0 ? 'var(--red-60)' : 'var(--text-helper)', whiteSpace: 'nowrap', fontWeight: failCount > 0 ? 600 : 400 }}>
          {failCount > 0 ? `${failCount} failed` : `${passCount}/${totalCount} passed`}
        </span>
      </button>

      {/* Summary line always visible just below header when collapsed */}
      {!open && (
        <p style={{ margin: '0 1.25rem .75rem calc(1.25rem + 12px + 1rem + 5rem + 1rem)', fontSize: '.875rem', color: 'var(--text-helper)', lineHeight: 1.5 }}>
          {control.summary}
        </p>
      )}

      {/* Expanded content */}
      {open && (
        <div style={{ padding: '0 1.25rem 1rem calc(1.25rem + 12px + 1rem)' }}>
          <p style={{ margin: '0 0 .875rem', fontSize: '.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {control.summary}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '.5rem .75rem', background: 'var(--gray-10)', color: 'var(--text-primary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Check</th>
                <th style={{ textAlign: 'center', padding: '.5rem .75rem', background: 'var(--gray-10)', color: 'var(--text-primary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', width: '4.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '.5rem .75rem', background: 'var(--gray-10)', color: 'var(--text-primary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {control.details.map((item, i) => (
                <tr key={i} style={{ borderBottom: i < control.details.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '.5rem .75rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</td>
                  <td style={{ padding: '.5rem .75rem', textAlign: 'center' }}>
                    {item.status === 'pass' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: 'var(--green-20)', color: 'var(--green-70)', fontWeight: 700, fontSize: '.75rem' }}>✓</span>
                    )}
                    {item.status === 'fail' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: 'var(--red-30)', color: 'var(--red-60)', fontWeight: 700, fontSize: '.75rem' }}>✕</span>
                    )}
                    {item.status === 'review' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: '#fcf4d6', color: '#684e00', fontWeight: 700, fontSize: '.75rem' }}>!</span>
                    )}
                  </td>
                  <td style={{ padding: '.5rem .75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Detail({ d, onOverview }) {
  const [showCommitsQuarterly, setShowCommitsQuarterly] = useState(false);
  const [showPRMonthly, setShowPRMonthly] = useState(true);
  const [showIssueMonthly, setShowIssueMonthly] = useState(true);
  const [showRetentionQuarterly, setShowRetentionQuarterly] = useState(false);
  const [showAllAdopters, setShowAllAdopters] = useState(false);
  const [showCveMonthly, setShowCveMonthly] = useState(false);
  const [showAllCves, setShowAllCves] = useState(false);
  
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
        <span>|</span>
        <span>{d.founded}</span>
      </p>

      <div className="tile-grid det-tiles">
        {d.kpis.map((k, i) => (
          <Tile key={i} label={k.l} value={k.v} help={k.h} />
        ))}
      </div>

      <div className="section">
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
            values={d.quarters.slice(-16).map((x) => x.v)}
            labels={d.quarters.slice(-16).map((x) => x.q)}
            currentIndex={d.quarters.slice(-16).findIndex((x) => x.c)}
            fitWhenDense={true}
          />
        ) : (
          <BarChart
            values={d.commits.map((x) => x.v)}
            labels={d.commits.map((x) => x.y)}
            currentIndex={d.commits.findIndex((x) => x.c)}
            fitWhenDense={true}
          />
        )}
        <p className="chart-cap">
          Darker bar = current period · {showCommitsQuarterly ? `Last ${Math.min(d.quarters?.length || 0, 16)} quarters` : 'Total commits per year'}
        </p>
      </div>

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-h" style={{ margin: 0 }}>
            {showRetentionQuarterly ? 'Contributor retention per quarter' : 'Contributor retention per year'}
          </h2>
          <button
            className="btn-secondary"
            onClick={() => setShowRetentionQuarterly(!showRetentionQuarterly)}
            style={{
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              fontFamily: 'inherit'
            }}
          >
            {showRetentionQuarterly ? 'Show yearly' : 'Show quarterly'}
          </button>
        </div>
        {showRetentionQuarterly && d.retentionQuarterly && d.retentionQuarterly.length > 0 ? (
          <StackedBarChart
            values={d.retentionQuarterly.map((x) => ({
              returning: x.returning || 0,
              newContributors: x.newContributors || 0,
            }))}
            labels={d.retentionQuarterly.map((x) => x.q)}
            currentIndex={d.retentionQuarterly.findIndex((x) => x.c)}
            segmentOrder={["returning", "newContributors"]}
            fitWhenDense={true}
            tooltipFormatter={({ index, label }) => {
              const point = d.retentionQuarterly[index];
              const returning = point?.returning || 0;
              const newContributors = point?.newContributors || 0;
              const active = point?.active || 0;
              return `${label}: ${active} contributors (${newContributors} new, ${returning} returning)`;
            }}
          />
        ) : (
          <StackedBarChart
            values={d.retentionYearly?.map((x) => ({
              returning: x.returning || 0,
              newContributors: x.newContributors || 0,
            })) || [{ returning: 0, newContributors: 0 }]}
            labels={d.retentionYearly?.map((x) => x.y) || [String(new Date().getFullYear())]}
            currentIndex={d.retentionYearly?.findIndex((x) => x.c) || 0}
            segmentOrder={["returning", "newContributors"]}
            fitWhenDense={true}
            tooltipFormatter={({ index, label }) => {
              const point = d.retentionYearly?.[index];
              const returning = point?.returning || 0;
              const newContributors = point?.newContributors || 0;
              const active = point?.active || 0;
              return `${label}: ${active} contributors (${newContributors} new, ${returning} returning)`;
            }}
          />
        )}
        <p className="chart-cap">
          Darker bar = current period · Red = New Contributors · Blue = Returning Contributors · {showRetentionQuarterly ? `Last ${d.retentionQuarterly?.length || 0} quarters` : `Since ${d.founded.replace('Founded ', '')}`}
        </p>
        <p className="chart-cap">
          {showRetentionQuarterly
            ? d.retention.cap
            : (() => {
                const latestYear = d.retentionYearly?.find((x) => x.c) || d.retentionYearly?.[d.retentionYearly.length - 1];
                return latestYear
                  ? `${latestYear.returning || 0} customers were retained in ${latestYear.y} (${latestYear.v || 0}%).`
                  : 'No yearly retention data available.';
              })()}
        </p>
      </div>

      <hr className="divider" />

      <div className="section">
        <h2 className="section-h">Top contributing companies & project metadata</h2>
        <div className="two-col">
          <div className="table-wrap companies-table-wrap">
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
                      className=""
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
              fitWhenDense={true}
            />
          ) : (
            <BarChart
              values={d.prYearly?.map((x) => x.v) || [0]}
              labels={d.prYearly?.map((x) => x.y) || ['2025']}
              currentIndex={d.prYearly?.findIndex((x) => x.c) || 0}
              tooltipLabel="PRs"
              fitWhenDense={true}
            />
          )}
        <p className="chart-cap">
          Darker bar = current period · {showPRMonthly ? `Last ${d.prMonthly?.length || 0} months` : 'Total PRs per year'}
          {d.prMedianMergeDays != null && (
            <> · Median merge time: <strong>{d.prMedianMergeDays < 1
              ? `${Math.round(d.prMedianMergeDays * 24)} hrs`
              : `${d.prMedianMergeDays.toFixed(1)} days`}</strong></>
          )}
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
              fitWhenDense={true}
            />
          ) : (
            <StackedBarChart
              values={d.issueYearly?.map((x) => ({ open: x.open || 0, closed: x.closed || 0 })) || [{ open: 0, closed: 0 }]}
              labels={d.issueYearly?.map((x) => x.y) || ['2025']}
              currentIndex={d.issueYearly?.findIndex((x) => x.c) || 0}
              fitWhenDense={true}
            />
          )}
        <p className="chart-cap">
          Darker bar = current period · Red = open issues, Blue = closed issues · {showIssueMonthly ? `Last ${d.issueMonthly?.length || 0} months` : 'Total issues per year'}
          {d.issueMedianResolutionDays != null && (
            <> · Median resolution time: <strong>{d.issueMedianResolutionDays < 1
              ? `${Math.round(d.issueMedianResolutionDays * 24)} hrs`
              : `${d.issueMedianResolutionDays.toFixed(1)} days`}</strong></>
          )}
        </p>
      </div>

      {(() => {
        const allCves = d.cveEntries || [];
        const hasCves = d.cveYearly?.length > 0 || allCves.length > 0;
        const sourceLabel = d.cveSource === 'github_security_advisories'
          ? 'GitHub Security Advisories'
          : d.cveSource === 'github_advisory_database'
          ? 'GitHub Advisory Database'
          : null;
        return (
          <div className="section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="section-h" style={{ margin: 0 }}>
                Security vulnerabilities (CVEs)
                {d.cveTotalAllTime > 0 && (
                  <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                    ({d.cveTotalAllTime} total)
                  </span>
                )}
              </h2>
              {hasCves && d.cveMonthly?.length > 0 && (
                <button
                  className="btn-secondary"
                  onClick={() => setShowCveMonthly(!showCveMonthly)}
                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', fontFamily: 'inherit' }}
                >
                  {showCveMonthly ? 'Show yearly' : 'Show monthly'}
                </button>
              )}
            </div>

            {hasCves ? (
              <>
                {showCveMonthly && d.cveMonthly?.length > 0 ? (
                  <BarChart
                    values={d.cveMonthly.map((x) => x.v)}
                    labels={d.cveMonthly.map((x) => x.m)}
                    currentIndex={d.cveMonthly.findIndex((x) => x.c)}
                    tooltipLabel="CVEs"
                    fitWhenDense={true}
                  />
                ) : (
                  <BarChart
                    values={d.cveYearly.map((x) => x.v)}
                    labels={d.cveYearly.map((x) => x.y)}
                    currentIndex={d.cveYearly.findIndex((x) => x.c)}
                    tooltipLabel="CVEs"
                    fitWhenDense={true}
                  />
                )}
                <p className="chart-cap">
                  Darker bar = current period · {showCveMonthly ? `Last ${d.cveMonthly?.length || 0} months` : 'Total CVEs per year'}
                  {sourceLabel && <> · Source: <strong>{sourceLabel}</strong></>}
                </p>
                {allCves.length > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '1rem' }}>
                      <h2 className="section-h" style={{ margin: 0 }}>CVE List</h2>
                      {allCves.length > 5 && (
                        <button
                          className="btn-secondary"
                          onClick={() => setShowAllCves((s) => !s)}
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', fontFamily: 'inherit' }}
                        >
                          {showAllCves ? 'Show fewer' : 'Show all'}
                        </button>
                      )}
                    </div>
                    <CveTable entries={allCves} showAll={showAllCves} />
                  </>
                )}
              </>
            ) : (
              <div style={{ padding: '1.5rem', background: 'var(--layer-02)', border: '1px solid var(--border-subtle)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                No CVEs reported for this project.
                {sourceLabel && <span> Source checked: {sourceLabel}.</span>}
              </div>
            )}
          </div>
        );
      })()}

      {d.aiPolicySummary && d.aiPolicySummary.length > 0 && (
        <div className="section">
          <h2 className="section-h">Artificial Intelligence Policy</h2>
          <div className="table-wrap" style={{ padding: '1.25rem 1.5rem' }}>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '.875rem' }}>
              {d.aiPolicySummary.map((item, index) => (
                <li key={index} style={{ marginBottom: index === d.aiPolicySummary.length - 1 ? 0 : '0.75rem' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {d.adopters && d.adopters.length > 0 && (() => {
        const _noiseRe = /^(\.\.|and more|more |see |\*\*|note:|please )/i;
        const _articleHostRe = /https?:\/\/(medium\.com|itnext\.io|dev\.to|towardsdatascience\.com|blog\.|hackernoon\.com|dzone\.com|thenewstack\.io)/i;
        const _articleTitleRe = /\b(on kubernetes| at [a-z]| in kubernetes|with kafka| for apache [a-z]+ [a-z]|uses?|using|deploy|utilizes?|seamless|optimizing)\b/i;
        const cleanAdopters = d.adopters.filter(a =>
          a.name &&
          !_noiseRe.test(a.name.trim()) &&
          a.name.length <= 60 &&
          !_articleTitleRe.test(a.name) &&
          !(a.url && _articleHostRe.test(a.url))
        ).sort((a, b) => a.name.localeCompare(b.name));
        if (!cleanAdopters.length) return null;
        const visibleAdopters = showAllAdopters ? cleanAdopters : cleanAdopters.slice(0, 18);
        return (
        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h2 className="section-h" style={{ margin: 0 }}>
              Known project adopters <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>({cleanAdopters.length})</span>
            </h2>
            {cleanAdopters.length > 18 && (
              <button
                className="btn-secondary"
                onClick={() => setShowAllAdopters((show) => !show)}
                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', fontFamily: 'inherit' }}
              >
                {showAllAdopters ? 'Show fewer' : 'Show all'}
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1px', background: 'var(--border-subtle)', border: '1px solid var(--border-subtle)' }}>
            {visibleAdopters.map((a, i) => (
              <div key={i} style={{ background: 'var(--layer-02)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {a.url
                  ? <a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--link)', fontWeight: 600 }}>{a.name}</a>
                  : a.name}
              </div>
            ))}
          </div>
        </div>
        );
      })()}


      {d.controls && d.controls.length > 0 && (
        <div className="section">
          <h2 className="section-h">Controls Assessment</h2>
          <p style={{ margin: '0 0 1rem', fontSize: '.875rem', color: 'var(--text-secondary)' }}>
            Automated checks measuring how well the project meets key governance controls. Click a control to expand detailed findings.
          </p>
          <div className="table-wrap" style={{ padding: 0 }}>
            {d.controls.map((ctrl) => (
              <ControlRow key={ctrl.id} control={ctrl} />
            ))}
          </div>
        </div>
      )}

      <p className="foot">
        Data via GitHub REST + GraphQL APIs
      </p>
    </main>
  );
}

// Made with Bob
