// API service to connect to the Spring Boot backend

const API_BASE = '/api';

/**
 * Fetch all projects from the backend
 */
export async function fetchProjects() {
  try {
    const response = await fetch(`${API_BASE}/projects`);
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
    const response = await fetch(`${API_BASE}/projects/${projectId}/metrics`);
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
  
  const { metadata, contributors, commits, issues, pull_requests, releases } = metrics;
  
  // Determine status based on metrics
  let status = { label: 'Watch', cls: 'yellow' };
  if (metadata.stars >= 1000 && contributors.total_contributors > 100) {
    status = { label: 'Healthy', cls: 'green' };
  } else if (metadata.stars >= 200) {
    status = { label: 'Growing', cls: 'blue' };
  }
  
  // Get quarterly commit data (last 4 quarters)
  const quarters = commits.quarters.slice(-4).map(q => q.commit_count);
  
  // Format overview data
  const ov = {
    foundation: project.foundation || 'Independent',
    contributors: formatNumber(contributors.total_contributors, true),
    companies: contributors.company_diversity ? formatNumber(contributors.company_diversity, true) : '—',
    commits: formatNumber(commits.total_commits),
    stars: formatNumber(metadata.stars, true),
    quarters: quarters.length === 4 ? quarters : [0, 0, 0, 0],
  };
  
  // Format KPIs
  const kpis = [
    { l: 'Contributors YTD', v: formatNumber(contributors.total_contributors), h: 'All-time contributors' },
    { l: 'Companies', v: contributors.company_diversity ? formatNumber(contributors.company_diversity, true) : '—', h: 'Via commit email domains' },
    { l: 'Commits YTD', v: formatNumber(commits.total_commits), h: 'Total commits' },
    { l: 'GitHub stars', v: formatNumber(metadata.stars, true), h: `${formatNumber(metadata.forks)} forks` },
    { l: 'Open issues', v: formatNumber(issues.open_issues), h: `Avg. resolution: ${Math.round(issues.avg_resolution_time_days || 0)} days` },
    { l: 'Pull Requests', v: formatNumber(pull_requests.total_pull_requests), h: `${formatNumber(pull_requests.merged_pull_requests)} merged` },
    { l: 'Releases', v: formatNumber(releases.total_releases), h: 'Total releases' },
    { l: 'Language', v: metadata.language || '—', h: metadata.license || 'No license' },
  ];
  
  // Format commit history (yearly)
  const commitYears = commits.quarters.reduce((acc, q) => {
    const year = q.quarter.split(' ')[1]; // Extract year from "Q1 '26"
    if (!acc[year]) acc[year] = 0;
    acc[year] += q.commit_count;
    return acc;
  }, {});
  
  const commitHistory = Object.entries(commitYears).map(([year, count], idx, arr) => ({
    y: `20${year}`,
    v: Math.round(count / 4), // Average per quarter
    c: idx === arr.length - 1, // Mark current year
  }));
  
  // Format retention data
  const latestRetention = contributors.retention_by_quarter?.[contributors.retention_by_quarter.length - 1];
  const retention = latestRetention ? {
    returning: Math.round((latestRetention.returning_contributors / latestRetention.total_contributors) * 100),
    neu: Math.round((latestRetention.new_contributors / latestRetention.total_contributors) * 100),
    cap: `${latestRetention.new_contributors} new · ${latestRetention.returning_contributors} returning`,
  } : { returning: 0, neu: 0, cap: 'No data available' };
  
  // Format top companies
  const companies = contributors.top_companies?.slice(0, 4).map((c, idx) => ({
    n: c.company || 'Unknown',
    c: formatNumber(c.commit_count),
    p: `${c.percentage}%`,
    strong: idx === 0,
  })) || [];
  
  // Format metadata
  const meta = [
    { f: 'Total releases', v: formatNumber(releases.total_releases) },
    { f: 'Created', v: new Date(metadata.created_at).getFullYear().toString() },
    { f: 'Language', v: metadata.language || '—' },
    { f: 'License', v: metadata.license || '—' },
  ];
  
  // Format activity (last 12 months of PR data)
  const activity = pull_requests.quarters?.slice(-12).map(q => q.pr_count) || Array(12).fill(0);
  
  return {
    name: project.name,
    sub: project.foundation || 'Independent',
    foundation: project.foundation || 'Independent',
    founded: `Founded ${new Date(metadata.created_at).getFullYear()}`,
    status,
    ov,
    kpis,
    commits: commitHistory.length > 0 ? commitHistory : [{ y: '2025', v: 0, c: true }],
    retention,
    companies,
    meta,
    activity: activity.length === 12 ? activity : Array(12).fill(0),
  };
}

function formatNumber(num, addPlus = false) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  const formatted = num.toLocaleString('en-US');
  return addPlus && num >= 100 ? `${formatted}+` : formatted;
}

// Made with Bob
