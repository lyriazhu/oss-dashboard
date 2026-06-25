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
export function transformProjectData(project, metrics) {
  if (!metrics) return null;
  
  // Backend uses camelCase, so map to snake_case for consistency
  const { metadata, contributors, commits, issues, pullRequests, releases } = metrics;
  const pull_requests = pullRequests; // Alias for compatibility
  
  // Determine status based on metrics with safety checks
  let status = { label: 'Watch', cls: 'yellow' };
  const totalContribs = contributors?.totalContributors || contributors?.total_contributors || 0;
  if (metadata?.stars >= 1000 && totalContribs > 100) {
    status = { label: 'Healthy', cls: 'green' };
  } else if (metadata?.stars >= 200) {
    status = { label: 'Growing', cls: 'blue' };
  }
  
  // Get quarterly commit data (last 4 quarters)
  const quarters = commits?.quarters?.slice(-4).map(q => q.commit_count) || [0, 0, 0, 0];
  
  // Format overview data
  const currentYear = new Date().getFullYear();
  const contributorsYtd = contributors?.yearlyContributors?.find(y => y.year === currentYear)?.contributorCount
    || contributors?.yearly_contributors?.find(y => y.year === currentYear)?.contributor_count
    || 0;
  const commitsAllTime = commits?.committers?.reduce((sum, committer) => sum + (committer.commitCount || committer.commit_count || 0), 0) || 0;

  const ov = {
    foundation: project.foundation || 'Independent',
    contributorsYtd: formatNumber(contributorsYtd),
    contributorsAllTime: formatNumber(contributors?.totalContributors || contributors?.total_contributors),
    companies: contributors?.company_diversity ? formatNumber(contributors.company_diversity) : '—',
    commits: formatNumber(commits?.total_commits),
    commitsAllTime: formatNumber(commitsAllTime),
    stars: formatNumber(metadata?.stars),
    quarters: quarters.length === 4 ? quarters : [0, 0, 0, 0],
  };
  
  // Format KPIs with safety checks
  const kpis = [
    { l: 'Contributors (All-Time)', v: formatNumber(contributors?.totalContributors || contributors?.total_contributors), h: 'Total unique contributors' },
    { l: 'Companies', v: contributors?.company_diversity ? formatNumber(contributors.company_diversity) : '—', h: 'Via commit email domains' },
    { l: 'Commits YTD', v: formatNumber(commits?.total_commits), h: 'Total commits' },
    { l: 'GitHub stars', v: formatNumber(metadata?.stars), h: `${formatNumber(metadata?.forks)} forks` },
    { l: 'Open issues', v: formatNumber(issues?.open_issues), h: `Avg. resolution: ${Math.round(issues?.avg_resolution_time_days || 0)} days` },
    { l: 'Pull Requests', v: formatNumber(pull_requests?.total_pull_requests), h: `${formatNumber(pull_requests?.merged_pull_requests)} merged` },
    { l: 'Releases', v: formatNumber(releases?.total_releases), h: 'Total releases' },
    { l: 'Language', v: metadata?.language || '—', h: metadata?.license || 'No license' },
  ];
  
  // Format commit history (yearly) with safety checks
  const commitYears = commits?.quarters?.reduce((acc, q) => {
    // Extract year from "Q2 2026" format
    const year = q.quarter.split(' ')[1];
    if (!acc[year]) acc[year] = 0;
    acc[year] += q.commit_count;
    return acc;
  }, {}) || {};
  
  const commitHistory = Object.entries(commitYears).map(([year, count], idx, arr) => ({
    y: year, // Use year as-is (already in format "2026")
    v: count, // Total count for the year
    c: idx === arr.length - 1, // Mark current year
  }));
  
  // Format quarterly commit data - reverse to show chronologically (oldest to newest)
  const rawQuarters = commits?.quarters || [];
  const quarterlyCommits = rawQuarters.length > 0
    ? [...rawQuarters].reverse().map((q, idx, arr) => ({
        q: q.quarter,
        v: q.commit_count,
        c: idx === arr.length - 1, // Mark current quarter (rightmost after reverse)
      }))
    : [];
  
  // Format retention data - use second-to-last quarter to avoid incomplete current month data
  const retentionQuarters = contributors?.retention_by_quarter || [];
  const latestRetention = retentionQuarters.length >= 2
    ? retentionQuarters[retentionQuarters.length - 2]  // Use previous complete quarter
    : retentionQuarters[retentionQuarters.length - 1]; // Fallback to latest if only one
  
  // Convert month format (2026-05) to quarter format (2026 Q2)
  const formatQuarter = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNum = parseInt(month);
    const quarter = Math.ceil(monthNum / 3);
    return `${year} Q${quarter}`;
  };
  
  const retention = latestRetention ? {
    returning: Math.round((latestRetention.returning_contributors / latestRetention.active_contributors) * 100) || 0,
    neu: Math.round((latestRetention.new_contributors / latestRetention.active_contributors) * 100) || 0,
    cap: `${latestRetention.new_contributors} new · ${latestRetention.returning_contributors} returning (${formatQuarter(latestRetention.quarter)})`,
  } : { returning: 0, neu: 0, cap: 'No data available' };
  
  // Format top companies
  const companies = contributors?.top_companies?.slice(0, 4).map((c, idx) => ({
    n: c.company || 'Unknown',
    c: formatNumber(c.commit_count),
    p: `${c.percentage}%`,
    strong: idx === 0,
  })) || [];
  
  // Format metadata
  const meta = [
    { f: 'Total releases', v: formatNumber(releases?.total_releases) },
    { f: 'Created', v: metadata?.created_at ? new Date(metadata.created_at).getFullYear().toString() : '—' },
    { f: 'Language', v: metadata?.language || '—' },
    { f: 'License', v: metadata?.license || '—' },
  ];
  
  // Format activity (last 12 months of PR data)
  const activity = pull_requests?.quarters?.slice(-12).map(q => q.pr_count) || Array(12).fill(0);
  
  return {
    name: project.name,
    sub: project.foundation || 'Independent',
    foundation: project.foundation || 'Independent',
    founded: metadata?.created_at ? `Founded ${new Date(metadata.created_at).getFullYear()}` : 'Founded —',
    status,
    ov,
    kpis,
    commits: commitHistory.length > 0 ? commitHistory : [{ y: '2025', v: 0, c: true }],
    quarters: quarterlyCommits.length > 0 ? quarterlyCommits : [], // Add quarterly data
    retention,
    companies,
    meta,
    activity: activity.length === 12 ? activity : Array(12).fill(0),
    extractedAt: metadata?.extracted_at || null, // Store the extraction timestamp
  };
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return num.toLocaleString('en-US');
}

// Made with Bob
