import { useState, useCallback, useEffect, useRef } from "react";
import { fetchProjects, fetchProjectMetrics, transformProjectData, fetchTokenStatus, removeProject, updateProject, fetchMerges, saveMerges, triggerProjectExtraction, EXCLUDED_COMPANY_PATTERNS } from "./api.js";
import UIShellHeader from "./components/UIShellHeader.jsx";
import Overview from "./components/Overview.jsx";
import Detail from "./components/Detail.jsx";
import SideNav from "./components/SideNav.jsx";
import AddProjectModal from "./components/AddProjectModal.jsx";
import ExtractionToast from "./components/ExtractionToast.jsx";

const EXTRACTION_STORAGE_KEY = 'oss_dashboard_extracting';
const QUEUE_STORAGE_KEY      = 'oss_dashboard_refresh_queue';
const ADD_QUEUE_STORAGE_KEY  = 'oss_dashboard_add_queue';

// ---------------------------------------------------------------------------
// Shared merge helper — used by both handleJoinSelected and applyPersistedMerges
// ---------------------------------------------------------------------------

/**
 * Given a flat list of { key, data } atomic repo entries, build the merged
 * dashboard object that represents them as a single community row.
 *
 * @param {Array<{key: string, data: object}>} flatEntries  Atomic repos to merge
 * @param {object} opts
 *   opts.customName  {string|null}  Override the combined "A + B" auto-name
 *   opts.orgUrl      {string|null}  GitHub org URL to use as repoUrl (e.g. "https://github.com/streamshub")
 */
function buildMergedEntry(flatEntries, { customName = null, orgUrl = null, foundation = null } = {}) {
  const keys        = flatEntries.map((e) => e.key);
  const communities = flatEntries.map((e) => e.data);
  const base        = communities[0];

  const parseNum = (v) => {
    if (v == null) return 0;
    return parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
  };
  const fmt = (n) => n.toLocaleString('en-US');

  // ── Contributors: union by login, keep the highest contributions count ──
  const contributorMap = new Map(); // login → contributor object
  for (const c of communities) {
    for (const contrib of (c._rawContributors || [])) {
      const login = contrib.login || contrib.email || '';
      if (!login) continue;
      const existing = contributorMap.get(login);
      if (!existing || (contrib.contributions || 0) > (existing.contributions || 0)) {
        contributorMap.set(login, contrib);
      }
    }
  }
  const mergedContributors = [...contributorMap.values()];

  // ── All-time contributor count ──
  // Use the git identity lists (_rawContributorsAllTimeLogins) when available —
  // these are the complete sets from git history and support accurate cross-repo
  // deduplication.  Falls back to summing per-repo totals when the identity lists
  // are absent (data extracted before this feature was added).
  // NOTE: a community entry may itself be a merged group whose _rawContributorsAllTimeLogins
  // is only the first member's list.  We treat a non-null list as a signal that identity
  // data is available but always union ALL entries' lists to get the correct full set.
  const allTimeSet = new Set();
  let hasAllTimeIdentitySets = false;
  for (const c of communities) {
    if (c._rawContributorsAllTimeLogins != null) {
      hasAllTimeIdentitySets = true;
      for (const identity of c._rawContributorsAllTimeLogins) {
        if (identity) allTimeSet.add(identity);
      }
    }
  }
  const allTimeContributorCount = hasAllTimeIdentitySets
    ? allTimeSet.size
    // No identity lists available: sum per-entry totals (may overcount cross-repo contributors)
    : communities.reduce((s, c) => s + parseNum(c.ov?.contributorsAllTime), 0);

  // ── YTD contributor count: union login sets from each repo's current year ──
  // Each repo now carries _rawContributorsYtdLogins (a list of git identities
  // active this year) which we union across repos to get a deduplicated count.
  // Falls back to summing ov.contributorsYtd when login lists are unavailable
  // (e.g. data extracted before this feature was added).
  const ytdSet = new Set();
  let hasYtdLoginSets = false;
  for (const c of communities) {
    if (c._rawContributorsYtdLogins != null) {
      hasYtdLoginSets = true;
      for (const login of c._rawContributorsYtdLogins) {
        if (login) ytdSet.add(login);
      }
    }
  }
  const mergedContributorsYtd = hasYtdLoginSets
    ? ytdSet.size
    : communities.reduce((s, c) => s + parseNum(c.ov?.contributorsYtd), 0);

  // ── Contributing Companies: count distinct companies from the unioned list ──
  const companySet = new Set();
  for (const contrib of mergedContributors) {
    const co = (contrib.company || '').trim();
    if (!co) continue;
    if (EXCLUDED_COMPANY_PATTERNS.some((p) => p.test(co))) continue;
    companySet.add(co.toLowerCase());
  }
  const mergedCompanyCount = companySet.size || null;

  // ── Top companies: sum commits per company across all repos ──
  const companyCommits = new Map(); // companyName (lowercase) → { display, commits }
  for (const c of communities) {
    for (const contrib of (c._rawContributors || [])) {
      const co = (contrib.company || '').trim();
      if (!co || EXCLUDED_COMPANY_PATTERNS.some((p) => p.test(co))) continue;
      const key = co.toLowerCase();
      const existing = companyCommits.get(key) || { display: co, commits: 0 };
      companyCommits.set(key, { display: existing.display, commits: existing.commits + (contrib.contributions || 0) });
    }
  }
  const totalCompanyCommits = [...companyCommits.values()].reduce((s, v) => s + v.commits, 0);
  const topCompanies = [...companyCommits.values()]
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 4)
    .map((v, idx) => ({
      n: v.display,
      c: fmt(v.commits),
      p: totalCompanyCommits > 0 ? `${Math.round((v.commits / totalCompanyCommits) * 100)}%` : '0%',
      strong: idx === 0,
    }));

  // ── Languages: collect primary language of each repo, deduplicate ──
  const langSet = new Set();
  for (const c of communities) {
    const lang = c._rawLanguage;
    if (lang && lang !== '—') langSet.add(lang);
  }
  const mergedLanguage = langSet.size > 0 ? [...langSet].join(', ') : '—';

  // ── Licenses: collect non-null licenses across repos, deduplicate ──
  const licenseSet = new Set();
  for (const c of communities) {
    const langKpi = (c.kpis || []).find((k) => k.l === 'Language');
    const lic = langKpi?.h;
    if (lic && lic !== 'No license') licenseSet.add(lic);
  }
  const mergedLicense = licenseSet.size > 0 ? [...licenseSet].join(', ') : 'No license';

  // ── Numeric ov fields: sum everything except contributors/companies (de-duped above) ──
  const sumOv = (field) => fmt(communities.reduce((acc, c) => acc + parseNum(c.ov?.[field]), 0));

  // Derive a default foundation: shared value if all members agree, otherwise first member's
  const allFoundations = [...new Set(communities.map((c) => c.ov?.foundation).filter(Boolean))];
  const defaultFoundation = allFoundations.length === 1 ? allFoundations[0] : (allFoundations[0] || 'Independent');

  const mergedOv = {
    ...base.ov,
    foundation:         foundation || defaultFoundation,
    contributorsYtd:    fmt(mergedContributorsYtd),
    contributorsAllTime: fmt(allTimeContributorCount),
    companies:          fmt(mergedCompanyCount ?? 0),
    commits:            sumOv('commits'),
    commitsAllTime:     sumOv('commitsAllTime'),
    pullRequests:       sumOv('pullRequests'),
    stars:              sumOv('stars'),
    quarters:           base.ov?.quarters || [],
  };

  // ── KPIs: sum numeric values; special-case Contributors, Companies, Language ──
  const mergedKpis = (base.kpis || []).map((kpi) => {
    if (kpi.l === 'Contributing Companies') {
      return { ...kpi, v: fmt(mergedCompanyCount ?? 0) };
    }
    if (kpi.l === 'Language') {
      return { ...kpi, v: mergedLanguage, h: mergedLicense };
    }
    // For contributor counts, use the deduplicated YTD total
    if (kpi.l === 'Contributors (YTD)') {
      return { ...kpi, v: fmt(mergedContributorsYtd) };
    }
    if (kpi.l === 'Open Issues') {
      const total = communities.reduce((acc, c) => {
        const match = (c.kpis || []).find((k) => k.l === 'Open Issues');
        return acc + parseNum(match?.v);
      }, 0);
      return { ...kpi, v: fmt(total), h: 'Currently open' };
    }
    const total = communities.reduce((acc, c) => {
      const match = (c.kpis || []).find((k) => k.l === kpi.l);
      return acc + parseNum(match?.v);
    }, 0);
    const isNumeric = !isNaN(parseNum(kpi.v));
    return { ...kpi, v: isNumeric ? fmt(total) : kpi.v };
  });

  // ── Status: pick most prominent ──
  const statusPriority = { Healthy: 3, Growing: 2, Watch: 1, 'N/A': 0 };
  const bestStatus = communities.reduce(
    (best, c) => (statusPriority[c.status?.label] ?? -1) > (statusPriority[best?.label] ?? -1) ? c.status : best,
    base.status,
  );

  // ── Time-series merges ──
  function mergeYearly(arrays, yKey = 'y', vKey = 'v') {
    const map = new Map();
    arrays.flat().forEach((entry) => {
      const label = entry[yKey];
      const existing = map.get(label) || { ...entry, [vKey]: 0 };
      map.set(label, { ...existing, [vKey]: (existing[vKey] || 0) + (entry[vKey] || 0) });
    });
    const sorted = [...map.values()].sort((a, b) => String(a[yKey]).localeCompare(String(b[yKey])));
    // Mark only the last (most recent) entry as current — never inherit from individual repos
    return sorted.map((e, idx) => ({ ...e, c: idx === sorted.length - 1 }));
  }
  function mergeYearlyRetention(arrays) {
    const map = new Map();
    arrays.flat().forEach((entry) => {
      const label = entry.y;
      const ex = map.get(label) || { y: label, returning: 0, newContributors: 0, active: 0, v: 0,
        activeLoginsSet: null, newLoginsSet: null, returningLoginsSet: null };
      // If login sets are available, union them for accurate deduplication; otherwise sum counts
      const activeLoginsSet  = (ex.activeLoginsSet  || entry.activeLogins)  ? new Set([...(ex.activeLoginsSet  || []), ...(entry.activeLogins  || [])]) : null;
      const newLoginsSet     = (ex.newLoginsSet      || entry.newLogins)     ? new Set([...(ex.newLoginsSet      || []), ...(entry.newLogins      || [])]) : null;
      const returningLoginsSet = (ex.returningLoginsSet || entry.returningLogins) ? new Set([...(ex.returningLoginsSet || []), ...(entry.returningLogins || [])]) : null;
      map.set(label, {
        ...ex,
        activeLoginsSet, newLoginsSet, returningLoginsSet,
        returning:        returningLoginsSet ? returningLoginsSet.size : ex.returning + (entry.returning || 0),
        newContributors:  newLoginsSet       ? newLoginsSet.size       : ex.newContributors + (entry.newContributors || 0),
        active:           activeLoginsSet    ? activeLoginsSet.size    : ex.active + (entry.active || 0),
      });
    });
    const sorted = [...map.values()].sort((a, b) => String(a.y).localeCompare(String(b.y)));
    // Mark only the last entry as current (recomputed after sort, not inherited from individual repos)
    return sorted.map((e, idx) => ({ ...e, c: idx === sorted.length - 1, v: e.active ? Math.round((e.returning / e.active) * 100) : 0 }));
  }

  // ── Quarterly time-series merge (by label string e.g. "Q3 2024") ──
  function mergeQuarterly(arrays, qKey = 'q', vKey = 'v') {
    const map = new Map();
    arrays.flat().forEach((entry) => {
      const label = entry[qKey];
      const existing = map.get(label) || { ...entry, [vKey]: 0 };
      map.set(label, { ...existing, [vKey]: (existing[vKey] || 0) + (entry[vKey] || 0) });
    });
    // Sort by label — "Q3 2024", "Q4 2024", "Q1 2025" … using a custom comparator
    const sorted = [...map.values()].sort((a, b) => {
      const parseQ = (s) => {
        const m = /Q(\d)\s+(\d{4})/.exec(s || '');
        if (!m) return 0;
        const [, q, y] = m;
        return parseInt(y) * 4 + parseInt(q);
      };
      return parseQ(a[qKey]) - parseQ(b[qKey]);
    });
    // Re-apply current-period flag to the last entry only
    return sorted.map((e, idx) => ({ ...e, c: idx === sorted.length - 1 }));
  }

  // ── Quarterly retention merge ──
  function mergeQuarterlyRetention(arrays) {
    const map = new Map();
    arrays.flat().forEach((entry) => {
      const label = entry.q;
      const ex = map.get(label) || { q: label, returning: 0, newContributors: 0, active: 0, v: 0, c: entry.c,
        activeLoginsSet: null, newLoginsSet: null, returningLoginsSet: null };
      // If login sets are available, union them for accurate deduplication; otherwise sum counts
      const activeLoginsSet    = (ex.activeLoginsSet    || entry.activeLogins)    ? new Set([...(ex.activeLoginsSet    || []), ...(entry.activeLogins    || [])]) : null;
      const newLoginsSet       = (ex.newLoginsSet       || entry.newLogins)       ? new Set([...(ex.newLoginsSet       || []), ...(entry.newLogins       || [])]) : null;
      const returningLoginsSet = (ex.returningLoginsSet || entry.returningLogins) ? new Set([...(ex.returningLoginsSet || []), ...(entry.returningLogins || [])]) : null;
      map.set(label, {
        ...ex,
        c: ex.c || entry.c,
        activeLoginsSet, newLoginsSet, returningLoginsSet,
        returning:       returningLoginsSet ? returningLoginsSet.size : ex.returning + (entry.returning || 0),
        newContributors: newLoginsSet       ? newLoginsSet.size       : ex.newContributors + (entry.newContributors || 0),
        active:          activeLoginsSet    ? activeLoginsSet.size    : ex.active + (entry.active || 0),
      });
    });
    const parseQ = (s) => {
      const m = /Q(\d)\s+(\d{4})/.exec(s || '');
      if (!m) return 0;
      const [, q, y] = m;
      return parseInt(y) * 4 + parseInt(q);
    };
    const sorted = [...map.values()].sort((a, b) => parseQ(a.q) - parseQ(b.q));
    return sorted
      .map((e, idx) => ({ ...e, c: idx === sorted.length - 1, v: e.active ? Math.round((e.returning / e.active) * 100) : 0 }));
  }

  // ── Monthly time-series merge (by YYYY-MM key) ──
  function mergeMonthly(arrays, mKey = 'm') {
    const map = new Map();
    arrays.flat().forEach((entry) => {
      const label = entry[mKey];
      const ex = map.get(label) || { ...entry, v: 0, open: 0, closed: 0 };
      map.set(label, {
        ...ex,
        v: (ex.v || 0) + (entry.v || 0),
        open: (ex.open || 0) + (entry.open || 0),
        closed: (ex.closed || 0) + (entry.closed || 0),
      });
    });
    const sorted = [...map.values()].sort((a, b) => String(a[mKey]).localeCompare(String(b[mKey])));
    return sorted.map((e, idx) => ({ ...e, c: idx === sorted.length - 1 }));
  }

  // ── Repo URL: org URL if provided, else shared owner prefix, else first ──
  let mergedRepoUrl = orgUrl || null;
  if (!mergedRepoUrl) {
    const urls = communities.map((c) => c.repoUrl).filter(Boolean);
    if (urls.length > 0) {
      const owners = urls.map((u) => u.replace('https://github.com/', '').split('/')[0]);
      if (owners.every((o) => o === owners[0])) {
        mergedRepoUrl = `https://github.com/${owners[0]}`;
      } else {
        mergedRepoUrl = urls[0];
      }
    }
  }

  const combinedName = communities.map((c) => c.name).sort((a, b) => a.localeCompare(b)).join(' + ');

  // ── CVE entries: concatenate and re-sort newest first ──
  const mergedCveEntries = communities
    .flatMap((c) => c.cveEntries || [])
    .sort((a, b) => (b.published || '').localeCompare(a.published || ''));

  // ── CVE total all-time: sum across all repos ──
  const mergedCveTotalAllTime = communities.reduce((s, c) => s + (c.cveTotalAllTime || 0), 0);

  // ── Median PR merge days: weighted mean by total PR count across repos ──
  const computeWeightedMedian = (communities, valueFn, weightFn) => {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const c of communities) {
      const val = valueFn(c);
      const wt  = weightFn(c);
      if (val != null && wt > 0) {
        weightedSum += val * wt;
        totalWeight += wt;
      }
    }
    if (totalWeight === 0) return null;
    return Math.round((weightedSum / totalWeight) * 10) / 10;
  };
  const mergedPrMedianMergeDays = computeWeightedMedian(
    communities,
    (c) => c.prMedianMergeDays,
    (c) => (c.prYearly || []).reduce((s, y) => s + (y.v || 0), 0),
  );
  // ── Median issue resolution days: median of per-repo medians (ignoring nulls) ──
  const mergedIssueMedianResolutionDays = (() => {
    const vals = communities.map((c) => c.issueMedianResolutionDays).filter((v) => v != null).sort((a, b) => a - b);
    if (vals.length === 0) return null;
    const mid = Math.floor(vals.length / 2);
    const raw = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
    return Math.round(raw * 10) / 10;
  })();

  // ── Meta table: sum releases; pick earliest founded year; join languages ──
  const totalReleasesNum = communities.reduce((s, c) => {
    const v = c.meta?.find((m) => m.f === 'Total releases')?.v;
    return s + (parseInt(String(v || '0').replace(/[^0-9]/g, ''), 10) || 0);
  }, 0);
  const earliestCreated = communities.reduce((best, c) => {
    const v = c.meta?.find((m) => m.f === 'Created')?.v;
    const n = parseInt(v, 10);
    if (!n) return best;
    return (best === null || n < best) ? n : best;
  }, null);
  const allLicenses = [...new Set(
    communities
      .map((c) => c.meta?.find((m) => m.f === 'License')?.v)
      .filter((v) => v && v !== '—'),
  )];
  const mergedMeta = [
    { f: 'Total releases', v: String(totalReleasesNum) },
    { f: 'Created', v: earliestCreated ? String(earliestCreated) : '—' },
    { f: 'Language', v: mergedLanguage },
    { f: 'License', v: allLicenses.length > 0 ? allLicenses.join(', ') : '—' },
  ];

  // ── Founded: derive from earliest created year ──
  const mergedFounded = earliestCreated ? `Founded ${earliestCreated}` : base.founded;

  // ── Retention summary (latest quarter across all repos combined) ──
  const allRetentionQuarterly = mergeQuarterlyRetention(communities.map((c) => c.retentionQuarterly || []));
  const latestMergedRetention = allRetentionQuarterly[allRetentionQuarterly.length - 1];
  const mergedRetention = latestMergedRetention
    ? {
        returning: latestMergedRetention.v,
        neu: latestMergedRetention.active
          ? Math.round((latestMergedRetention.newContributors / latestMergedRetention.active) * 100)
          : 0,
        cap: `${latestMergedRetention.newContributors} new · ${latestMergedRetention.returning} returning (${latestMergedRetention.q})`,
      }
    : base.retention;

  // ── Adopters: union by name, deduplicated ──
  const adoptersMap = new Map();
  for (const c of communities) {
    for (const a of (c.adopters || [])) {
      if (a.name && !adoptersMap.has(a.name.toLowerCase())) {
        adoptersMap.set(a.name.toLowerCase(), a);
      }
    }
  }
  const mergedAdopters = [...adoptersMap.values()];
  // Use adoptersSource from whichever repo has one
  const mergedAdoptersSource = communities.find((c) => c.adoptersSource)?.adoptersSource || null;

  // ── extractedAt: most recent across all repos ──
  const mergedExtractedAt = communities.reduce((latest, c) => {
    if (!c.extractedAt) return latest;
    return (!latest || c.extractedAt > latest) ? c.extractedAt : latest;
  }, null);

  // ── Description / website: inherit from the first member that has one ──
  const _descSource        = communities.find((c) => c.description);
  const mergedDescription  = _descSource?.description        || null;
  const mergedLinkText     = _descSource?.descriptionLinkText || null;
  const mergedWebsiteUrl   = communities.find((c) => c.websiteUrl)?.websiteUrl || null;

  return {
    ...base,
    name:                      customName || combinedName,
    _mergedFrom:               flatEntries.map((e) => ({ ...e, data: { ...e.data, _isMergedSubRepo: true } })),
    // Persist the unioned identity sets so that if this merged entry is later used
    // as a member of a higher-level merge, contributor deduplication remains correct.
    _rawContributorsAllTimeLogins: hasAllTimeIdentitySets ? [...allTimeSet] : null,
    _rawContributorsYtdLogins:     hasYtdLoginSets        ? [...ytdSet]     : null,
    _rawContributors:              mergedContributors,
    sub:                       mergedOv.foundation,
    foundation:                mergedOv.foundation,
    founded:                   mergedFounded,
    repoUrl:                   mergedRepoUrl,
    description:               mergedDescription,
    descriptionLinkText:       mergedLinkText,
    websiteUrl:                mergedWebsiteUrl,
    ov:                        mergedOv,
    kpis:                      mergedKpis,
    companies:                 topCompanies.length > 0 ? topCompanies : base.companies,
    status:                    bestStatus,
    meta:                      mergedMeta,
    retention:                 mergedRetention,
    extractedAt:               mergedExtractedAt,
    adopters:                  mergedAdopters,
    adoptersSource:            mergedAdoptersSource,
    // Yearly time-series (summed by year)
    commits:                   mergeYearly(communities.map((c) => c.commits || []), 'y', 'v'),
    retentionYearly:           mergeYearlyRetention(communities.map((c) => c.retentionYearly || [])),
    prYearly:                  mergeYearly(communities.map((c) => c.prYearly || []), 'y', 'v'),
    issueYearly:               (() => {
      // issueYearly entries carry `open` and `closed` separately — mergeYearly only sums `v`,
      // so we need a dedicated merge that accumulates all three fields.
      const map = new Map();
      communities.flatMap((c) => c.issueYearly || []).forEach((entry) => {
        const ex = map.get(entry.y) || { y: entry.y, v: 0, open: 0, closed: 0 };
        map.set(entry.y, {
          ...ex,
          v:      (ex.v      || 0) + (entry.v      || 0),
          open:   (ex.open   || 0) + (entry.open   || 0),
          closed: (ex.closed || 0) + (entry.closed || 0),
        });
      });
      const sorted = [...map.values()].sort((a, b) => String(a.y).localeCompare(String(b.y)));
      return sorted.map((e, idx) => ({ ...e, c: idx === sorted.length - 1 }));
    })(),
    cveYearly:                 mergeYearly(communities.map((c) => c.cveYearly || []), 'y', 'v'),
    // Quarterly time-series (summed by quarter label)
    quarters:                  mergeQuarterly(communities.map((c) => c.quarters || []), 'q', 'v'),
    retentionQuarterly:        allRetentionQuarterly,
    // Monthly time-series (summed by YYYY-MM)
    prMonthly:                 mergeMonthly(communities.map((c) => c.prMonthly || []), 'm'),
    issueMonthly:              mergeMonthly(communities.map((c) => c.issueMonthly || []), 'm'),
    cveMonthly:                mergeMonthly(communities.map((c) => c.cveMonthly || []), 'm'),
    // CVE detail
    cveEntries:                mergedCveEntries,
    cveTotalAllTime:           mergedCveTotalAllTime,
    // Median timing stats (weighted)
    prMedianMergeDays:         mergedPrMedianMergeDays,
    issueMedianResolutionDays: mergedIssueMedianResolutionDays,
  };
}

export default function App() {
  const [data, setData] = useState({});
  const [order, setOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("overview"); // 'overview' | 'detail'
  const [selectedKey, setSelectedKey] = useState(null);
  // detailData holds the exact data object to render in Detail — may differ
  // from data[selectedKey] when a merged sub-repo is opened directly.
  const [detailData, setDetailData] = useState(null);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [flashKey, setFlashKey] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  // refreshQueue: ordered list of {id, name} objects waiting to be extracted (Refresh All)
  const [refreshQueue, setRefreshQueue] = useState(() => {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      return saved ? JSON.parse(saved).queue || [] : [];
    } catch { return []; }
  });
  const [refreshQueueTotal, setRefreshQueueTotal] = useState(() => {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      return saved ? JSON.parse(saved).total || 0 : 0;
    } catch { return 0; }
  });
  // addQueue: ordered list of {id, name} objects queued by successive "Add project" submissions
  const [addQueue, setAddQueue] = useState(() => {
    try {
      const saved = localStorage.getItem(ADD_QUEUE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [addQueueTotal, setAddQueueTotal] = useState(() => {
    try {
      const savedQueue      = localStorage.getItem(ADD_QUEUE_STORAGE_KEY);
      const savedExtracting = localStorage.getItem(EXTRACTION_STORAGE_KEY);
      const queueLen  = savedQueue      ? JSON.parse(savedQueue).length              : 0;
      const hasActive = savedExtracting ? JSON.parse(savedExtracting)?.mode === 'add' : false;
      return queueLen + (hasActive ? 1 : 0);
    } catch { return 0; }
  });
  const [extracting, setExtracting] = useState(() => {
    // Restore extraction state that survived a page reload
    try {
      const saved = localStorage.getItem(EXTRACTION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [tokenConfigured, setTokenConfigured] = useState(false);

  // True after the first render — used to skip firing the trigger effect on the
  // initial mount when extracting is restored from localStorage.  We never want
  // a page reload to re-kick extraction; the backend is authoritative on whether
  // a process is actually running.
  const isMountedRef = useRef(false);

  // Persist extracting state to localStorage whenever it changes
  useEffect(() => {
    if (extracting) {
      localStorage.setItem(EXTRACTION_STORAGE_KEY, JSON.stringify(extracting));
    } else {
      localStorage.removeItem(EXTRACTION_STORAGE_KEY);
    }
  }, [extracting]);

  // For refresh-queue items (merged-entry refresh or refresh-all), trigger the backend
  // extraction whenever a new item becomes the active extracting entry.
  // Single-repo refreshes are excluded (isSingleRepo=true) because RefreshProjectModal
  // already called triggerProjectExtraction before setting extracting state.
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return; // skip initial mount — do not re-trigger persisted state
    }
    if (!extracting || extracting.mode !== 'refresh' || extracting.isSingleRepo) return;
    triggerProjectExtraction(extracting.id).catch((err) => {
      console.error('Failed to trigger extraction for', extracting.id, err);
    });
  }, [extracting?.id, extracting?.mode, extracting?.isSingleRepo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist add-queue state to localStorage whenever it changes
  useEffect(() => {
    if (addQueue.length > 0) {
      localStorage.setItem(ADD_QUEUE_STORAGE_KEY, JSON.stringify(addQueue));
    } else {
      localStorage.removeItem(ADD_QUEUE_STORAGE_KEY);
    }
  }, [addQueue]);

  // Persist refresh-queue state to localStorage whenever it changes
  useEffect(() => {
    if (refreshQueueTotal > 0) {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ queue: refreshQueue, total: refreshQueueTotal }));
    } else {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    }
  }, [refreshQueue, refreshQueueTotal]);

  // Restore merged state using merge records loaded from data/merges.json via the backend.
  const applyPersistedMerges = useCallback((projectData, projectOrder, mergesFromBackend) => {
    try {
      if (!mergesFromBackend || mergesFromBackend.length === 0) return { projectData, projectOrder };
      let newData = { ...projectData };
      let newOrder = [...projectOrder];

      for (const entry of mergesFromBackend) {
        const memberKeys = entry.memberKeys;
        const customName  = entry.name       || null;
        const orgUrl      = entry.orgUrl     || null;
        const foundation  = entry.foundation || null;

        // Only include members that have already finished loading (extraction may
        // still be running for newly-added repos).  As long as at least one member
        // is ready we can render a partial merge; the rest will be folded in on the
        // next loadProjects call once their extraction completes.
        const availableKeys = memberKeys.filter((k) => newData[k]);
        if (availableKeys.length === 0) continue;

        // Re-derive a synthetic key from the FULL member list so it never collides
        // with a real backend project ID and stays stable across partial/full loads.
        // Old records stored mergedKey = first member's project ID, which caused the
        // first member to be deleted from newData and never restored on unmerge.
        const mergedKey = '__merged__' + memberKeys.join('__');

        const flatEntries = availableKeys.map((k) => ({ key: k, data: newData[k] }));
        const merged = buildMergedEntry(flatEntries, { customName, orgUrl, foundation });
        // When only a subset of members is available (others still extracting), store
        // the full intended member key list so persistMerges can write the correct
        // record to merges.json even before all repos have finished loading.
        if (availableKeys.length < memberKeys.length) {
          merged._allMemberKeys = memberKeys;
        }

        availableKeys.forEach((k) => delete newData[k]);
        newData[mergedKey] = merged;
        const positions = availableKeys.map((k) => newOrder.indexOf(k)).filter((i) => i >= 0);
        const insertIdx = positions.length > 0 ? Math.min(...positions) : newOrder.length;
        newOrder = newOrder.filter((k) => !availableKeys.includes(k));
        newOrder.splice(insertIdx, 0, mergedKey);
      }
      return { projectData: newData, projectOrder: newOrder };
    } catch {
      return { projectData, projectOrder };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProjects = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      
      console.log('🔄 Loading projects from backend...');
      
      // Fetch all projects and saved merges in parallel
      const [projects, mergesFromBackend] = await Promise.all([
        fetchProjects(),
        fetchMerges(),
      ]);
      console.log('✅ Fetched projects:', projects.length, 'projects');
      
      // Fetch metrics for each project
      const projectData = {};
      const projectOrder = [];
      
      for (const project of projects) {
        try {
          console.log(`📊 Loading metrics for ${project.name}...`);
          const metrics = await fetchProjectMetrics(project.id);
          const transformed = transformProjectData(project, metrics);
          if (transformed) {
            projectData[project.id] = transformed;
            projectOrder.push(project.id);
            console.log(`✅ Loaded ${project.name}`);
          }
        } catch (err) {
          console.error(`❌ Failed to load metrics for ${project.id}:`, err);
        }
      }
      
      console.log('✅ All projects loaded:', projectOrder.length);
      
      const { projectData: mergedData, projectOrder: mergedOrder } = applyPersistedMerges(projectData, projectOrder, mergesFromBackend);
      setData(mergedData);
      setOrder(mergedOrder);
      
      // Set first project as selected if none selected
      if (!selectedKey && projectOrder.length > 0) {
        setSelectedKey(projectOrder[0]);
      }
    } catch (err) {
      console.error('❌ Failed to load projects:', err);
      if (!silent) setError('Failed to load projects. Please check if the backend is running.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load projects and check token status on mount
  useEffect(() => {
    loadProjects();
    fetchTokenStatus().then((s) => setTokenConfigured(s.configured));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showOverview = useCallback(() => {
    setView("overview");
    setDetailData(null);
    window.scrollTo(0, 0);
  }, []);

  const showDetail = useCallback((key, overrideData) => {
    setSelectedKey(key);
    setDetailData(overrideData || null);
    setNavCollapsed(true);
    setView("detail");
    window.scrollTo(0, 0);
  }, []);

  const selectCommunity = useCallback((key) => {
    setSelectedKey(key);
  }, []);

  // Write the current merge state to the backend. Call this explicitly whenever
  // merges change — do NOT derive from a useEffect on `data` to avoid races where
  // an earlier render's effect fires after a later one and overwrites the correct state.
  // Returns the promise from saveMerges so callers can await completion.
  const persistMerges = useCallback((newData) => {
    const mergeRecords = [];
    Object.entries(newData).forEach(([key, d]) => {
      if (d._mergedFrom) {
        // Use _allMemberKeys when present — this is set when some _mergedFrom members are
        // themselves merged groups.  memberKeys holds flat atomic IDs for applyPersistedMerges,
        // while _mergedFrom holds the peer-level entries whose names form the display name.
        const memberKeys = d._allMemberKeys || d._mergedFrom.map((e) => e.key);
        const defaultName = d._mergedFrom.map((e) => e.data.name).join(' + ');
        // Preserve orgUrl if it was stored on the merged entry (set by org extraction scripts)
        const orgUrl = d.repoUrl?.startsWith('https://github.com/') && !d.repoUrl.slice(19).includes('/')
          ? d.repoUrl : null;
        // When _allMemberKeys is set, reloading from atomic keys produces a different
        // auto-name (individual sub-repo names instead of group names), so always
        // save the display name explicitly so it survives reload and unmerge cycles.
        const nameToSave = d._allMemberKeys
          ? d.name
          : (d.name !== defaultName ? d.name : null);
        mergeRecords.push({
          mergedKey: key,
          memberKeys,
          name:       nameToSave,
          orgUrl,
          // Always persist foundation so it survives reload; null means "use computed default"
          foundation: d.foundation || null,
        });
      }
    });
    return saveMerges(mergeRecords);
  }, []);

  const handleUpdateProject = useCallback(async (projectId, fields) => {
    const isMergedEntry = Boolean(data[projectId]?._mergedFrom);

    // 1. Patch in-memory immediately.
    const updated = { ...data[projectId] };
    if (fields.name)       updated.name = fields.name;
    if (fields.foundation) {
      updated.foundation = fields.foundation;
      updated.sub        = fields.foundation;
      updated.ov         = { ...updated.ov, foundation: fields.foundation };
    }
    const next = { ...data, [projectId]: updated };
    setData(next);

    if (isMergedEntry) {
      // For merged entries persist the rename directly — no backend project record to update.
      persistMerges(next);
      return;
    }

    // 2. Persist to backend for non-merged projects.
    try {
      const saved = await updateProject(projectId, fields);
      setData((prev) => {
        if (!prev[projectId]) return prev;
        const updated = { ...prev[projectId] };
        if (saved.name)       updated.name       = saved.name;
        if (saved.foundation) {
          updated.foundation = saved.foundation;
          updated.sub        = saved.foundation;
          updated.ov         = { ...updated.ov, foundation: saved.foundation };
        }
        return { ...prev, [projectId]: updated };
      });
    } catch (err) {
      console.error('Failed to save project update:', err);
      await loadProjects({ silent: true });
    }
  }, [loadProjects, data, persistMerges]); // eslint-disable-line react-hooks/exhaustive-deps

  const addProject = useCallback((key, name) => {
    // loadProjects has already refreshed data/order by the time this fires;
    // we only need to trigger the flash animation on the new row.
    setFlashKey(key);
    setTimeout(() => setFlashKey(null), 1200);
    if (!key) return;
    setExtracting((current) => {
      if (!current) {
        // Nothing running — start immediately; total resets to 1 (will grow with each enqueue)
        setAddQueueTotal(1);
        return { id: key, name: name || key, mode: 'add' };
      }
      // Something is already running — enqueue and grow the total
      setAddQueue((q) => {
        const next = [...q, { id: key, name: name || key }];
        setAddQueueTotal((t) => t + 1);
        return next;
      });
      return current; // keep current extraction running
    });
  }, []);

  // Called when the Refresh All button completes the token modal.
  // `ids` is the ordered list of project IDs returned by the backend.
  const handleRefreshAll = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    // Build queue entries using display names from current data
    const queue = ids.map((id) => ({ id, name: data[id]?.name || id }));
    setRefreshQueueTotal(queue.length);
    setRefreshQueue(queue.slice(1));          // tail — will advance after each toast
    setExtracting({ id: queue[0].id, name: queue[0].name, mode: 'refresh' }); // head starts immediately
  }, [data]);

  // Advance to the next item in either queue once a toast reports done.
  // Pass { aborted: true } when the backend was killed mid-extraction — wipes the
  // entire queue immediately so no further extraction is attempted.
  const handleExtractionDone = useCallback(({ aborted = false } = {}) => {
    if (aborted) {
      // Backend terminated — clear everything and stop.
      setExtracting(null);
      setAddQueue([]);
      setAddQueueTotal(0);
      setRefreshQueue([]);
      setRefreshQueueTotal(0);
      return;
    }
    // Drain the add queue first (these were user-initiated adds), then refresh queue
    if (addQueue.length > 0) {
      const [next, ...rest] = addQueue;
      setAddQueue(rest);
      setExtracting({ id: next.id, name: next.name, mode: 'add' });
      // Reload so the newly-added project appears in the sidebar while the next one extracts
      loadProjects({ silent: true });
    } else if (refreshQueue.length > 0) {
      const [next, ...rest] = refreshQueue;
      setRefreshQueue(rest);
      // Preserve mergedName so the toast header stays consistent throughout the queue
      setExtracting({ id: next.id, name: next.name, mergedName: next.mergedName, mode: 'refresh' });
    } else {
      setExtracting(null);
      setAddQueueTotal(0);
      setRefreshQueueTotal(0);
      // All done — reload the page so updated data is fully reflected
      window.location.reload();
    }
  }, [addQueue, refreshQueue, loadProjects]);

  const handleRemove = useCallback(async (key) => {
    try {
      await removeProject(key);
      // If we were viewing the removed project, go back to overview
      if (selectedKey === key) {
        setView("overview");
        setSelectedKey(null);
      }
      await loadProjects();
    } catch (err) {
      console.error("Failed to remove project:", err);
    }
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelectMode = useCallback(() => {
    setSelectMode((m) => {
      if (m) setSelectedKeys(new Set()); // clear selections on exit
      return !m;
    });
  }, []);

  const toggleSelectKey = useCallback((key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    setDeleting(true);
    try {
      for (const key of selectedKeys) {
        await removeProject(key);
        if (selectedKey === key) {
          setView("overview");
          setSelectedKey(null);
        }
      }
      setSelectedKeys(new Set());
      setSelectMode(false);
      await loadProjects();
    } catch (err) {
      console.error("Failed to delete selected projects:", err);
    } finally {
      setDeleting(false);
    }
  }, [selectedKeys, selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnmerge = useCallback(async (mergedKey) => {
    const merged = data[mergedKey];
    if (!merged?._mergedFrom) return;

    const next = { ...data };
    delete next[mergedKey];
    merged._mergedFrom.forEach(({ key, data: original }) => {
      next[key] = original;
    });
    // Await the save so merges.json is cleared on disk before any concurrent
    // loadProjects call can read and re-apply the old merge record.
    await persistMerges(next);
    setData(next);

    setOrder((prev) => {
      const idx = prev.indexOf(mergedKey);
      const without = prev.filter((k) => k !== mergedKey);
      const originals = merged._mergedFrom.map((e) => e.key);
      without.splice(idx >= 0 ? idx : without.length, 0, ...originals);
      return without;
    });
  }, [data, persistMerges]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove a single repo from a merged entry
  const handleRemoveFromMerge = useCallback((mergedKey, repoKey) => {
    // Read the current merged entry once, synchronously, before any state updates.
    const merged = data[mergedKey];
    if (!merged?._mergedFrom) return;
    const remaining = merged._mergedFrom.filter((e) => e.key !== repoKey);
    const removed   = merged._mergedFrom.find((e) => e.key === repoKey);
    if (!removed) return;

    const next = { ...data };
    // Restore the removed repo as its own entry
    next[repoKey] = removed.data;
    if (remaining.length < 2) {
      // Only one left — dissolve the group entirely
      delete next[mergedKey];
      if (remaining.length === 1) {
        next[remaining[0].key] = remaining[0].data;
      }
    } else {
      // Rebuild merged entry without the removed repo.
      // A name is "custom" only if it differs from the auto-generated default of ALL
      // original members (not just the remaining ones). If the name was auto-generated
      // (e.g. "A + B + C"), removing a member should regenerate it from the remaining
      // members. Truly custom names (e.g. "StreamsHub") are always preserved.
      const oldDefaultName = merged._mergedFrom.map((e) => e.data.name).join(' + ');
      const customName = merged.name !== oldDefaultName ? merged.name : null;
      const orgUrl = merged.repoUrl?.startsWith('https://github.com/') && !merged.repoUrl?.slice(19).includes('/')
        ? merged.repoUrl : null;
      // Carry forward the current foundation — always preserve user edits
      next[mergedKey] = buildMergedEntry(remaining, { customName, orgUrl, foundation: merged.foundation || null });
    }
    setData(next);
    persistMerges(next);

    setOrder((prev) => {
      const idx = prev.indexOf(mergedKey);
      const without = prev.filter((k) => k !== mergedKey && k !== repoKey);
      if (remaining.length < 2) {
        // Dissolve group — put all original keys at the same position
        const all = merged._mergedFrom.map((e) => e.key);
        without.splice(idx >= 0 ? idx : without.length, 0, ...all);
      } else {
        // Keep the merged group at its original position; insert the removed repo right after
        without.splice(idx >= 0 ? idx : without.length, 0, mergedKey, repoKey);
      }
      return without;
    });
  }, [data, persistMerges]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoinSelected = useCallback(() => {
    if (selectedKeys.size < 2) return;
    const selectedKeysList = [...selectedKeys];

    // Each selected entry (whether plain or already-merged) becomes a peer member
    // of the new merged group at the same level.  We do NOT flatten merged groups
    // into their sub-repos — that would make a plain community appear as a child
    // of an existing merged group's internals rather than as an equal sibling.
    const flatEntries = selectedKeysList.map((k) => ({ key: k, data: data[k] }));

    // Collect the underlying atomic project keys from every selected entry so
    // that merges.json always stores real backend IDs (needed for applyPersistedMerges
    // to reconstruct the group after a page reload).
    // Use _allMemberKeys when present (it already holds the flat atomic list for
    // groups that were themselves created from merged entries).
    const atomicKeys = selectedKeysList.flatMap((k) => {
      const d = data[k];
      if (!d?._mergedFrom) return [k];
      return d._allMemberKeys || d._mergedFrom.map((m) => m.key);
    });

    const merged = buildMergedEntry(flatEntries);

    // Store all underlying atomic keys so persistMerges writes real backend IDs
    // to merges.json even when some members are themselves merged groups.
    if (atomicKeys.length !== flatEntries.length) {
      merged._allMemberKeys = atomicKeys;
    }

    // Use a synthetic key derived from the atomic member keys so it is stable
    // across reloads and cannot collide with any real backend project ID.
    const mergedKey = '__merged__' + atomicKeys.join('__');
    // Only the top-level selected keys need to be removed from data/order.
    const allKeysToRemove = new Set(selectedKeysList);

    const next = { ...data };
    allKeysToRemove.forEach((k) => delete next[k]);
    next[mergedKey] = merged;
    setData(next);
    persistMerges(next);

    setOrder((prev) => {
      const without = prev.filter((k) => !allKeysToRemove.has(k));
      const insertIdx = Math.min(...[...selectedKeysList].map((k) => prev.indexOf(k)).filter((i) => i >= 0));
      without.splice(insertIdx < 0 ? without.length : insertIdx, 0, mergedKey);
      return without;
    });

    // Exit select mode and clear selection
    setSelectedKeys(new Set());
    setSelectMode(false);
    // Flash the merged row
    setFlashKey(mergedKey);
    setTimeout(() => setFlashKey(null), 1200);
  }, [selectedKeys, data, persistMerges]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.25rem',
        color: 'var(--text-secondary)'
      }}>
        Loading projects...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ color: 'var(--red-60)', marginBottom: '1rem' }}>Error</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <button 
          className="btn-primary" 
          onClick={loadProjects}
          style={{ minWidth: 'auto', padding: '0 2rem' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <UIShellHeader
        onToggleNav={() => setNavCollapsed((c) => !c)}
        navOpen={!navCollapsed}
        extracting={extracting}
        onExtractionDone={handleExtractionDone}
        queueIdx={
          extracting?.mode === 'add'
            ? addQueueTotal - addQueue.length          // current position in add queue
            : refreshQueueTotal > 0
              ? refreshQueueTotal - refreshQueue.length // current position in refresh queue
              : 0
        }
        queueTotal={extracting?.mode === 'add' ? addQueueTotal : refreshQueueTotal}
        onTokenExpired={() => {
          setExtracting(null);
          setAddQueue([]);
          setAddQueueTotal(0);
          setRefreshQueue([]);
          setRefreshQueueTotal(0);
          setTokenConfigured(false); // force token field to show in modal
          setModalOpen(true);
        }}
      />

      <div className="layout">
        <SideNav
          data={data}
          order={order}
          selectedKey={view === "detail" ? selectedKey : null}
          collapsed={navCollapsed}
          onSelect={view === "overview" ? showDetail : selectCommunity}
          onOverview={showOverview}
          onRemove={handleRemove}
        />
        {view === "overview" ? (
          <Overview
            data={data}
            order={order}
            flashKey={flashKey}
            onSelect={showDetail}
            onAddClick={() => setModalOpen(true)}
            onUpdateProject={handleUpdateProject}
            selectMode={selectMode}
            selectedKeys={selectedKeys}
            onSelectToggle={toggleSelectKey}
            onToggleSelectMode={toggleSelectMode}
            onDeleteSelected={handleDeleteSelected}
            deleting={deleting}
            onRefreshAll={handleRefreshAll}
            onJoinSelected={handleJoinSelected}
            onUnmerge={handleUnmerge}
            onRemoveFromMerge={handleRemoveFromMerge}
          />
        ) : (
          <Detail
            d={detailData || data[selectedKey] || null}
            dataKey={selectedKey}
            onOverview={showOverview}
            onRefreshProject={(id, name) => {
              const entry = data[id];
              if (entry?._mergedFrom) {
                // Merged entry — use atomic backend IDs from _allMemberKeys when available,
                // otherwise fall back to the peer-level keys stored in _mergedFrom.
                const atomicIds = entry._allMemberKeys
                  || entry._mergedFrom.map((e) => e.key);
                // Build display names: use data[id].name for atomic IDs where possible,
                // otherwise fall back to the merged-entry display name.
                const members = atomicIds.map((aid) => ({
                  id: aid,
                  name: data[aid]?.name || entry.name,
                  // Tag each queued item with the parent merged name so the toast
                  // can show "Refreshing <mergedName>" as the header.
                  mergedName: entry.name,
                }));
                setRefreshQueueTotal(members.length);
                setRefreshQueue(members.slice(1));
                setExtracting({
                  id: members[0].id,
                  name: members[0].name,
                  mergedName: entry.name,
                  mode: 'refresh',
                });
              } else {
                setExtracting({ id, name, mode: 'refresh', isSingleRepo: true });
              }
            }}
          />
        )}
      </div>

      <AddProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addProject}
        onSuccess={loadProjects}
        tokenConfigured={tokenConfigured}
        onTokenSaved={() => setTokenConfigured(true)}
      />
    </>
  );
}

// Made with Bob
