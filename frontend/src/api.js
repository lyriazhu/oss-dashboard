// API service to connect to the Spring Boot backend

const API_BASE = '/api';

// Fetch options with cache-busting to ensure fresh data
const fetchOptions = {
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

/**
 * Fetch all projects from the backend
 */
export async function fetchProjects() {
  try {
    const response = await fetch(`${API_BASE}/projects`, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

/**
 * Fetch metrics for a specific project
 */
export async function fetchProjectMetrics(projectId) {
  try {
    const response = await fetch(`${API_BASE}/projects/${projectId}/metrics`, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching metrics for ${projectId}:`, error);
    throw error;
  }
}

/**
 * Add a new project
 */
export async function addProject(githubUrl, foundation, website) {
  try {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        github_url: githubUrl,
        foundation: foundation || undefined,
        website: website || undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding project:', error);
    throw error;
  }
}

/**
 * Transform backend data to match the frontend format
 */
// Patterns that indicate a non-company entry (independent, unknown, bots, etc.)
const EXCLUDED_COMPANY_PATTERNS = [
  /^unknown$/i,
  /^independent/i,
  /^freelance/i,
  /^\s*$/,
  /\[bot\]/i,
  /^home$/i,
  /^decentralized$/i,
  /contractor/i,
];

function countDistinctCompanies(contributorsList) {
  if (!contributorsList?.length) return null;
  const companies = new Set();
  for (const c of contributorsList) {
    const co = (c.company || '').trim();
    if (!co) continue;
    if (EXCLUDED_COMPANY_PATTERNS.some(p => p.test(co))) continue;
    companies.add(co.toLowerCase());
  }
  return companies.size || null;
}

export function transformProjectData(project, metrics) {
  if (!metrics) return null;
  
  // Backend uses camelCase, so map to snake_case for consistency
  const { metadata, contributors, commits, issues, pullRequests, releases } = metrics;
  const pull_requests = pullRequests; // Alias for compatibility
  
  // Calculate YTD data from current year
  const currentYear = new Date().getFullYear();
  
  // Get YTD commits from years array
  const currentYearCommitData = commits?.years?.find(y => y.year === currentYear);
  const commitsYtd = currentYearCommitData?.commitCount || currentYearCommitData?.commit_count || 0;
  
  // Get YTD PRs and merged PRs from current year data
  const currentYearPrData = pull_requests?.years?.find(y => y.year === currentYear);
  const prYtd = currentYearPrData?.prCount || currentYearPrData?.pr_count || 0;
  const mergedPrYtd = currentYearPrData?.mergedPrCount || currentYearPrData?.merged_pr_count || 0;
  
  // Determine status based on metrics with safety checks
  let status = { label: 'Watch', cls: 'yellow' };
  const totalContribs = contributors?.totalContributors || contributors?.total_contributors || 0;
  if (metadata?.stars >= 1000 && totalContribs > 100) {
    status = { label: 'Healthy', cls: 'green' };
  } else if (metadata?.stars >= 200) {
    status = { label: 'Growing', cls: 'blue' };
  }
  
  // Get quarterly commit data (last 16 quarters)
  const quarters = commits?.quarters?.slice(-16).map(q => q.commit_count) || Array(16).fill(0);
  
  // Format overview data
  const contributorsYtd = contributors?.yearlyContributors?.find(y => y.year === currentYear)?.contributorCount
    || contributors?.yearly_contributors?.find(y => y.year === currentYear)?.contributor_count
    || 0;
  const commitsAllTime = commits?.committers?.reduce((sum, committer) => sum + (committer.commitCount || committer.commit_count || 0), 0) || 0;

  const ov = {
    foundation: project.foundation || 'Independent',
    contributorsYtd: formatNumber(contributorsYtd),
    contributorsAllTime: formatNumber(contributors?.totalContributors || contributors?.total_contributors),
    companies: formatNumber(countDistinctCompanies(contributors?.contributors)),
    commits: formatNumber(commitsYtd),
    commitsAllTime: formatNumber(commitsAllTime),
    pullRequests: formatNumber(pull_requests?.total_prs || pull_requests?.totalPrs),
    stars: formatNumber(metadata?.stars),
    quarters: quarters.length > 0 ? quarters : Array(16).fill(0),
  };
  
  // Format KPIs with safety checks
  const kpis = [
    { l: 'Companies', v: formatNumber(countDistinctCompanies(contributors?.contributors)), h: 'Distinct companies (excl. independents)' },
    { l: 'Contributors (YTD)', v: formatNumber(contributorsYtd), h: 'Unique contributors this year' },
    { l: 'Commits (YTD)', v: formatNumber(commitsYtd), h: 'Total commits this year' },
    { l: 'GitHub stars', v: formatNumber(metadata?.stars), h: `${formatNumber(metadata?.forks)} forks` },
    { l: 'Open issues', v: formatNumber(issues?.total_open), h: `Median resolution: ${issues?.median_resolution_time_days != null ? issues.median_resolution_time_days.toFixed(1) : '—'} days` },
    { l: 'Pull Requests (YTD)', v: formatNumber(prYtd), h: `${formatNumber(mergedPrYtd)} merged` },
    { l: 'Releases', v: formatNumber(releases?.total_releases), h: 'Total releases' },
    { l: 'Language', v: metadata?.language || '—', h: metadata?.license || 'No license' },
  ];
  
  // Format commit history (yearly) - use the years array from backend
  let commitHistory = commits?.years?.map((yearData) => ({
    y: yearData.year.toString(), // Convert year number to string
    v: yearData.commit_count, // Total count for the year
    c: false, // Will be set later based on current year
  })) || [];
  
  // Fill in missing years up to current year
  if (commitHistory.length > 0) {
    const currentYear = new Date().getFullYear();
    const lastYearInData = parseInt(commitHistory[commitHistory.length - 1].y);
    
    // Add missing years with 0 commits
    for (let year = lastYearInData + 1; year <= currentYear; year++) {
      commitHistory.push({
        y: year.toString(),
        v: 0,
        c: false, // Will be set later
      });
    }
  }
  
  // Mark the current year (or use backend's is_current flag if available)
  if (commitHistory.length > 0) {
    const currentYear = new Date().getFullYear();
    const backendMarkedCurrent = commits?.years?.some(y => y.is_current);
    
    if (backendMarkedCurrent) {
      // Use backend's marking
      commitHistory = commitHistory.map((item, idx) => ({
        ...item,
        c: commits.years[idx]?.is_current || false
      }));
    } else {
      // Mark the current year based on actual current year
      commitHistory = commitHistory.map(item => ({
        ...item,
        c: parseInt(item.y) === currentYear
      }));
    }
  }
  
  // Format quarterly commit data - reverse to show chronologically (oldest to newest)
  const rawQuarters = commits?.quarters || [];
  const quarterlyCommits = rawQuarters.length > 0
    ? [...rawQuarters].reverse().map((q, idx, arr) => ({
        q: q.quarter,
        v: q.commit_count,
        c: idx === arr.length - 1, // Mark current quarter (rightmost after reverse)
      }))
    : [];
  
  // Format retention data for yearly and quarterly chart views
  const retentionQuarters = contributors?.retention_by_quarter || [];
  const retentionYearsMap = new Map();

  const formatQuarter = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNum = parseInt(month, 10);
    const quarter = Math.ceil(monthNum / 3);
    return `Q${quarter} ${year}`;
  };

  const getRetentionPercent = (entry) => {
    const active = entry?.active_contributors || 0;
    if (!active) return 0;
    return Math.round(((entry.returning_contributors || 0) / active) * 100);
  };

  const retentionQuarterly = retentionQuarters.map((entry, idx, arr) => ({
    q: formatQuarter(entry.quarter),
    v: getRetentionPercent(entry),
    returning: entry.returning_contributors || 0,
    newContributors: entry.new_contributors || 0,
    active: entry.active_contributors || 0,
    c: idx === arr.length - 1,
  }));

  retentionQuarters.forEach((entry) => {
    if (!entry?.quarter) return;
    const [year] = entry.quarter.split('-');
    if (!year) return;

    const existing = retentionYearsMap.get(year) || {
      year,
      returning: 0,
      newContributors: 0,
      active: 0,
    };

    existing.returning += entry.returning_contributors || 0;
    existing.newContributors += entry.new_contributors || 0;
    existing.active += entry.active_contributors || 0;
    retentionYearsMap.set(year, existing);
  });

  const projectStartYear = metadata?.created_at
    ? new Date(metadata.created_at).getFullYear()
    : (retentionYearsMap.size > 0 ? Math.min(...Array.from(retentionYearsMap.keys()).map(Number)) : currentYear);

  const retentionYearEntries = [];
  for (let year = projectStartYear; year <= currentYear; year++) {
    const existing = retentionYearsMap.get(String(year)) || {
      year: String(year),
      returning: 0,
      newContributors: 0,
      active: 0,
    };
    retentionYearEntries.push(existing);
  }

  const retentionYearly = retentionYearEntries.map((entry, idx, arr) => ({
    y: String(entry.year),
    v: entry.active > 0 ? Math.round((entry.returning / entry.active) * 100) : 0,
    returning: entry.returning,
    newContributors: entry.newContributors,
    active: entry.active,
    c: Number(entry.year) === currentYear || idx === arr.length - 1,
  }));

  const latestRetention = retentionQuarters[retentionQuarters.length - 1];

  const retention = latestRetention ? {
    returning: getRetentionPercent(latestRetention),
    neu: Math.round((((latestRetention.new_contributors || 0) / (latestRetention.active_contributors || 1)) * 100)) || 0,
    cap: `${latestRetention.new_contributors || 0} new · ${latestRetention.returning_contributors || 0} returning (${formatQuarter(latestRetention.quarter)})`,
  } : { returning: 0, neu: 0, cap: 'No data available' };
  
  // Format top companies from metadata
  const companies = metadata?.top_contributing_companies?.length
    ? metadata.top_contributing_companies.slice(0, 4).map((c, idx) => ({
        n: c.company || 'Unknown',
        c: formatNumber(c.commits),
        p: `${c.percentage}%`,
        strong: idx === 0,
      }))
    : [{ n: 'No company data available', c: '—', p: '—', muted: true }];
  
  // Format metadata
  const meta = [
    { f: 'Total releases', v: formatNumber(releases?.total_releases) },
    { f: 'Created', v: metadata?.created_at ? new Date(metadata.created_at).getFullYear().toString() : '—' },
    { f: 'Language', v: metadata?.language || '—' },
    { f: 'License', v: metadata?.license || '—' },
  ];
  
  // Format PR activity data (monthly and yearly)
  const prMonths = pull_requests?.months || [];
  const prYears = pull_requests?.years || [];
  
  // Format yearly PR data from backend (all years since project creation)
  const prYearlyData = prYears.length > 0
    ? prYears.map((y, idx, arr) => ({
        y: y.year.toString(),
        v: y.pr_count || 0,
        c: idx === arr.length - 1, // Mark current year (last in array)
      }))
    : [];
  
  // Format monthly PR data - backend already provides last 12 months
  // Sort by date and display in chronological order (oldest to newest, left to right)
  const sortedPrMonths = [...prMonths].sort((a, b) => {
    // Compare month strings like "2026-05"
    return a.month.localeCompare(b.month);
  });
  
  const prMonthlyData = sortedPrMonths.length > 0
    ? sortedPrMonths.map((m, idx, arr) => ({
        m: m.month, // Keep full format "2026-05" for now
        v: m.pr_count || 0,
        c: idx === arr.length - 1, // Mark current month (rightmost)
      }))
    : [];
  
  // Format Issue activity data (monthly and yearly) with open/closed breakdown
  const issueMonths = issues?.months || [];
  const issueYears = issues?.years || [];
  
  // Format yearly Issue data from backend (all years since project creation)
  const issueYearlyData = issueYears.length > 0
    ? issueYears.map((y, idx, arr) => ({
        y: y.year.toString(),
        v: y.issue_count || 0,
        open: (y.issue_count || 0) - (y.closed_issue_count || 0), // Calculate open issues
        closed: y.closed_issue_count || 0,
        c: idx === arr.length - 1, // Mark current year (last in array)
      }))
    : [];
  
  // Format monthly Issue data - backend already provides last 12 months
  // Sort by date and display in chronological order
  const sortedIssueMonths = [...issueMonths].sort((a, b) => {
    return a.month.localeCompare(b.month);
  });
  
  const issueMonthlyData = sortedIssueMonths.length > 0
    ? sortedIssueMonths.map((m, idx, arr) => ({
        m: m.month, // Keep full format "2026-05"
        v: m.issue_count || 0,
        open: (m.issue_count || 0) - (m.closed_issue_count || 0), // Calculate open issues
        closed: m.closed_issue_count || 0,
        c: idx === arr.length - 1, // Mark current month (rightmost)
      }))
    : [];
  
  return {
    name: project.name,
    sub: project.foundation || 'Independent',
    foundation: project.foundation || 'Independent',
    founded: metadata?.created_at ? `Founded ${new Date(metadata.created_at).getFullYear()}` : 'Founded —',
    status,
    ov,
    kpis,
    commits: commitHistory.length > 0 ? commitHistory : [{ y: '2025', v: 0, c: true }],
    quarters: quarterlyCommits.length > 0 ? quarterlyCommits : [], // Add quarterly commit data
    retention,
    retentionYearly: retentionYearly.length > 0 ? retentionYearly : [{ y: String(currentYear), v: 0, c: true }],
    retentionQuarterly: retentionQuarterly.length > 0 ? retentionQuarterly : [],
    companies,
    meta,
    prYearly: prYearlyData.length > 0 ? prYearlyData : [{ y: '2025', v: 0, c: true }],
    prMonthly: prMonthlyData.length > 0 ? prMonthlyData : [],
    issueYearly: issueYearlyData.length > 0 ? issueYearlyData : [{ y: '2025', v: 0, c: true }],
    issueMonthly: issueMonthlyData.length > 0 ? issueMonthlyData : [],
    extractedAt: metadata?.extracted_at || null, // Store the extraction timestamp
  };
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return num.toLocaleString('en-US');
}

// Made with Bob
