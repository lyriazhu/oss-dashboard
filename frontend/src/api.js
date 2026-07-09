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
  const { metadata, contributors, commits, issues, pullRequests, releases, adopters, cves } = metrics;
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
  
  // Determine status - hardcode N/A for 3scale, otherwise use metadata or calculate
  let status;
  if (project.id === '3scale-operator') {
    status = { label: 'N/A', cls: 'gray' };
  } else if (metadata?.status) {
    // Use status from metadata if provided
    if (metadata.status === 'N/A') {
      status = { label: 'N/A', cls: 'gray' };
    } else if (metadata.status.toLowerCase() === 'healthy') {
      status = { label: 'Healthy', cls: 'green' };
    } else if (metadata.status.toLowerCase() === 'growing') {
      status = { label: 'Growing', cls: 'blue' };
    } else if (metadata.status.toLowerCase() === 'watch') {
      status = { label: 'Watch', cls: 'yellow' };
    } else {
      status = { label: metadata.status, cls: 'gray' };
    }
  } else {
    // Calculate status based on metrics
    const totalContribs = contributors?.totalContributors || contributors?.total_contributors || 0;
    if (metadata?.stars >= 1000 && totalContribs > 100) {
      status = { label: 'Healthy', cls: 'green' };
    } else if (metadata?.stars >= 200) {
      status = { label: 'Growing', cls: 'blue' };
    } else {
      status = { label: 'Watch', cls: 'yellow' };
    }
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
    { l: 'Contributing Companies', v: formatNumber(countDistinctCompanies(contributors?.contributors)), h: 'Distinct companies (excl. independents)' },
    { l: 'Contributors (YTD)', v: formatNumber(contributorsYtd), h: 'Unique contributors this year' },
    { l: 'Commits (YTD)', v: formatNumber(commitsYtd), h: 'Total commits this year' },
    { l: 'GitHub Stars', v: formatNumber(metadata?.stars), h: `${formatNumber(metadata?.forks)} forks` },
    { l: 'Open Issues', v: formatNumber(issues?.total_open), h: `Median resolution: ${issues?.median_resolution_time_days != null ? (issues.median_resolution_time_days < 1 ? `${Math.round(issues.median_resolution_time_days * 24)} hrs` : `${issues.median_resolution_time_days.toFixed(1)} days`) : '—'}` },
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
  // retention_by_quarter entries use "period" field e.g. "Q3 2023" (already formatted)
  // retention_by_year entries use "period" field e.g. "2024"
  // Backend (Java) serializes as camelCase; JSON files use snake_case — handle both.
  const retentionQuarters = contributors?.retentionByQuarter || contributors?.retention_by_quarter || [];
  const retentionYears = contributors?.retentionByYear || contributors?.retention_by_year || [];

  const getRetentionPercent = (entry) => {
    const active = entry?.activeContributors || entry?.active_contributors || 0;
    if (!active) return 0;
    return Math.round(((entry.returningContributors || entry.returning_contributors || 0) / active) * 100);
  };

  // Quarterly: period is already a formatted label like "Q3 2023"
  const retentionQuarterly = retentionQuarters.map((entry, idx, arr) => ({
    q: entry.period || '',
    v: getRetentionPercent(entry),
    returning: entry.returningContributors || entry.returning_contributors || 0,
    newContributors: entry.newContributors || entry.new_contributors || 0,
    active: entry.activeContributors || entry.active_contributors || 0,
    c: idx === arr.length - 1,
  }));

  // Yearly: read directly from retention_by_year (all-time, proper new/returning counts)
  const retentionYearly = retentionYears.map((entry, idx, arr) => ({
    y: entry.period || '',
    v: getRetentionPercent(entry),
    returning: entry.returningContributors || entry.returning_contributors || 0,
    newContributors: entry.newContributors || entry.new_contributors || 0,
    active: entry.activeContributors || entry.active_contributors || 0,
    c: entry.isCurrent || entry.is_current || idx === arr.length - 1,
  }));

  const latestRetention = retentionQuarters[retentionQuarters.length - 1];

  const retention = latestRetention ? {
    returning: getRetentionPercent(latestRetention),
    neu: Math.round((((latestRetention.newContributors || latestRetention.new_contributors || 0) / (latestRetention.activeContributors || latestRetention.active_contributors || 1)) * 100)) || 0,
    cap: `${latestRetention.newContributors || latestRetention.new_contributors || 0} new · ${latestRetention.returningContributors || latestRetention.returning_contributors || 0} returning (${latestRetention.period || ''})`,
  } : { returning: 0, neu: 0, cap: 'No data available' };

  // Format top companies from metadata
  // Backend (Java) serializes as topContributingCompanies; JSON files use top_contributing_companies
  const topCompanies = metadata?.topContributingCompanies || metadata?.top_contributing_companies || [];
  const companies = topCompanies.length
    ? topCompanies.slice(0, 4).map((c, idx) => ({
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
  
  // Build adopters list from extracted data
  const adoptersList = adopters?.adopters || [];
  const adoptersSource = adopters?.source || null;

  const aiPolicySummaries = {
    'strimzi-kafka-operator': {
      points: [
        'Strimzi allows AI-assisted contributions, but contributors remain fully responsible for every submitted change and must understand, review, test, and defend their work without acting as a proxy for an AI tool.',
        'AI use must be disclosed in the PR description, but AI tools must not appear in commit trailers such as Signed-off-by or Co-authored-by.',
        'The policy also prohibits large or rapid-fire AI-generated PRs, bans AI use for good-start issues, requires Apache 2.0 license compatibility, and makes clear that human maintainers retain full review and merge authority.',
      ],
      source: 'https://github.com/strimzi/strimzi-kafka-operator/blob/main/CONTRIBUTING.md',
    },
    camel: {
      points: [
        'Apache Camel supports AI-assisted contributions and provides repository-specific guidance for AI tools through `.oss-ai-helper-rules/` and `CLAUDE.md` so generated work follows project build, style, branching, and contribution conventions.',
        'When a pull request includes AI-generated code, contributors must provide proper attribution, including clear PR-level disclosure of the AI tool used.',
        'Camel also expects AI coding agents to be configured to add commit co-authorship trailers for AI-generated code when applicable.',
      ],
      source: 'https://github.com/apache/camel/blob/main/CLAUDE.md',
    },
    artemis: {
      points: [
        'Apache Artemis defines detailed AI agent rules covering attribution, branch and fork usage, JIRA ownership, PR description upkeep, reviewer selection, merge requirements, code quality, and investigation steps before implementation.',
        'AI-generated content must identify itself and the human operator, agents should limit PR volume, work only on their own branches and forks, and avoid force-pushing shared branches or merging without human approval.',
        'The guidance also requires tests, documentation updates when needed, Apache license headers on new files, security-conscious coding, and disciplined issue investigation using git history, JIRA, and project documentation.',
      ],
      source: 'https://github.com/apache/activemq-artemis/blob/main/CONTRIBUTING.md',
    },
    keycloak: {
      points: [
        'Keycloak allows generative AI to help write code, tests, or documentation, but contributors must fully understand every submitted change and be able to explain and revise it themselves.',
        'Contributors are expected to engage directly with reviewer feedback, even if they use AI to help draft responses, and they must edit and verify those responses before posting them.',
        'If AI agents were used to generate complete solutions from a prompt, the PR description must disclose that usage, and contributors remain responsible for ensuring the generated code is compatible with Keycloak\'s Apache 2.0 licensing.',
      ],
      source: 'https://github.com/keycloak/keycloak/blob/main/CONTRIBUTING.md',
    },
  };

  const controlsAssessments = {
    'strimzi-kafka-operator': [
      {
        id: 'legal',
        label: 'Legal',
        pct: 100,
        summary: 'Ensures code is under a valid open source license, reducing IP risks and ensuring proper licensing and distribution.',
        details: [
          {
            label: 'OSPS-LE-02.01',
            status: 'review',
            note: 'While active, the license for the source code MUST meet the OSI Open Source Definition or the FSF Free Software Definition. All licenses found are OSI or FSF approved.',
          },
          {
            label: 'OSPS-LE-03.01',
            status: 'pass',
            note: 'While active, the license for the source code MUST be maintained in the corresponding repository\'s LICENSE file, COPYING file, or LICENSE/ directory.',
          },
          {
            label: 'OSPS-LE-03.02',
            status: 'pass',
            note: 'While active, the license for the released software assets MUST be included in the released source code, or in a LICENSE file, COPYING file, or LICENSE/ directory alongside the corresponding release assets.',
          },
        ],
      },
      {
        id: 'quality',
        label: 'Quality',
        pct: 60,
        summary: 'Ensures code is secure, reliable, and well-maintained through strong processes, reducing bugs and vulnerabilities.',
        details: [
          {
            label: 'OSPS-QA-01.01',
            status: 'pass',
            note: 'While active, the project\'s source code repository MUST be publicly readable at a static URL.',
          },
          {
            label: 'OSPS-QA-01.02',
            status: 'pass',
            note: 'The version control system MUST contain a publicly readable record of all changes made, who made the changes, and when the changes were made.',
          },
          {
            label: 'OSPS-QA-02.01',
            status: 'fail',
            note: 'When the package management system supports it, the source code repository MUST contain a dependency list that accounts for the direct language dependencies. No dependency manifests found in the repository by the GitHub API.',
          },
          {
            label: 'OSPS-QA-04.01',
            status: 'fail',
            note: 'While active, the project documentation MUST contain a list of any codebases that are considered subprojects or additional repositories. Insights does not contain a list of repositories.',
          },
          {
            label: 'OSPS-QA-05.01',
            status: 'pass',
            note: 'While active, the version control system MUST NOT contain generated executable artifacts.',
          },
        ],
      },
    ],
    keycloak: [
      {
        id: 'legal',
        label: 'Legal',
        pct: 78,
        summary: 'Ensures code is under a valid open source license, reducing IP risks and ensuring proper licensing and distribution.',
        details: [
          {
            label: 'OSPS-LE-02.01',
            status: 'review',
            note: 'While active, the license for the source code MUST meet the OSI Open Source Definition or the FSF Free Software Definition. All licenses found are OSI or FSF approved.',
          },
          {
            label: 'OSPS-LE-03.01',
            status: 'pass',
            note: 'While active, the license for the source code MUST be maintained in the corresponding repository\'s LICENSE file, COPYING file, or LICENSE/ directory.',
          },
          {
            label: 'OSPS-LE-03.02',
            status: 'pass',
            note: 'While active, the license for the released software assets MUST be included in the released source code, or in a LICENSE file, COPYING file, or LICENSE/ directory alongside the corresponding release assets.',
          },
          {
            label: 'OSPS-LE-04.01',
            status: 'fail',
            note: 'While active, the project MUST have a documented policy to address license compliance issues in dependencies. No automated dependency license compliance process is documented in the repository.',
          },
          {
            label: 'OSPS-LE-05.01',
            status: 'pass',
            note: 'While active, contributions MUST NOT knowingly incorporate code licensed under terms incompatible with the project\'s license. The project\'s Apache 2.0 license and DCO sign-off process enforce this.',
          },
          {
            label: 'OSPS-LE-05.02',
            status: 'pass',
            note: 'The project MUST document its contribution license requirements (e.g., CLA or DCO). The Developer Certificate of Origin (DCO) is required and enforced via automated checks.',
          },
          {
            label: 'OSPS-LE-06.01',
            status: 'pass',
            note: 'The project MUST have a mechanism to detect and respond to new license obligations introduced by dependency updates. Dependency updates are reviewed via automated tooling.',
          },
          {
            label: 'OSPS-LE-07.01',
            status: 'pass',
            note: 'While active, the project MUST publish machine-readable metadata (e.g., SPDX or CycloneDX) associating each release with its corresponding license. License metadata is published in release artifacts.',
          },
          {
            label: 'OSPS-LE-07.02',
            status: 'fail',
            note: 'While active, the project MUST generate and publish a Software Bill of Materials (SBOM) with each release. No SBOM artifacts are currently published alongside releases.',
          },
        ],
      },
      {
        id: 'quality',
        label: 'Quality',
        pct: 77,
        summary: 'Ensures code is secure, reliable, and well-maintained through strong processes, reducing bugs and vulnerabilities.',
        details: [
          {
            label: 'OSPS-QA-01.01',
            status: 'pass',
            note: 'While active, the project\'s source code repository MUST be publicly readable at a static URL.',
          },
          {
            label: 'OSPS-QA-01.02',
            status: 'pass',
            note: 'The version control system MUST contain a publicly readable record of all changes made, who made the changes, and when the changes were made.',
          },
          {
            label: 'OSPS-QA-02.01',
            status: 'pass',
            note: 'When the package management system supports it, the source code repository MUST contain a dependency list that accounts for the direct language dependencies. Maven pom.xml files provide full dependency manifests.',
          },
          {
            label: 'OSPS-QA-02.02',
            status: 'pass',
            note: 'While active, the build and release pipeline MUST NOT execute arbitrary code that is not a part of the build and deploy scripts. Build pipelines are defined and version-controlled in the repository.',
          },
          {
            label: 'OSPS-QA-03.01',
            status: 'pass',
            note: 'While active, all released software assets MUST be assigned a version identifier that is unique within the project. Semantic versioning is used and enforced across all releases.',
          },
          {
            label: 'OSPS-QA-03.02',
            status: 'pass',
            note: 'While active, the project MUST provide a mechanism for reporting defects. GitHub Issues are publicly open for defect reporting.',
          },
          {
            label: 'OSPS-QA-04.01',
            status: 'fail',
            note: 'While active, the project documentation MUST contain a list of any codebases that are considered subprojects or additional repositories. Insights does not contain a list of repositories.',
          },
          {
            label: 'OSPS-QA-05.01',
            status: 'pass',
            note: 'While active, the version control system MUST NOT contain generated executable artifacts.',
          },
          {
            label: 'OSPS-QA-05.02',
            status: 'pass',
            note: 'While active, the project MUST have at least one automated test suite. CI pipelines with automated test suites are present and required for all pull requests.',
          },
          {
            label: 'OSPS-QA-06.01',
            status: 'fail',
            note: 'While active, the project MUST enforce code review by a party other than the author before merging. Branch protection rules requiring review are not consistently enforced across all branches.',
          },
          {
            label: 'OSPS-QA-07.01',
            status: 'fail',
            note: 'While active, the project MUST have a documented build and release process. A formal documented build and release process in the primary repository is not present.',
          },
          {
            label: 'OSPS-QA-08.01',
            status: 'pass',
            note: 'While active, the project MUST apply fixes for publicly-known vulnerabilities within a reasonable time period. Keycloak maintains an active security advisory process and patches CVEs promptly.',
          },
          {
            label: 'OSPS-QA-08.02',
            status: 'pass',
            note: 'While active, the project MUST use at least one automated static code analysis tool. Static analysis tooling (e.g., Checkstyle, SpotBugs) is integrated into the Maven build.',
          },
        ],
      },
    ],
  };

  // ── CVE data ────────────────────────────────────────────────────────
  // cves.months: [{ month: "YYYY-MM", count, cves: [...] }]
  // cves.years:  [{ year: "YYYY", count, is_current }]

  // Determine the project's founding year/month from metadata
  const foundedDate = metadata?.created_at ? new Date(metadata.created_at) : null;
  const foundedYear = foundedDate ? foundedDate.getFullYear() : null;
  const foundedMonth = foundedDate
    ? `${foundedDate.getFullYear()}-${String(foundedDate.getMonth() + 1).padStart(2, '0')}`
    : null;

  // Build a lookup from existing CVE data
  const cveYearMap = Object.fromEntries((cves?.years || []).map((y) => [y.year, y]));
  const cveMonthMap = Object.fromEntries((cves?.months || []).map((m) => [m.month, m]));

  // Build full yearly series from founding year to current year (zeros for missing)
  const cveYears = (() => {
    const now = new Date();
    const endYear = now.getFullYear();
    const startYear = foundedYear || endYear;
    const result = [];
    for (let yr = startYear; yr <= endYear; yr++) {
      const key = String(yr);
      const existing = cveYearMap[key];
      result.push({
        y: key,
        v: existing?.count || 0,
        c: existing?.is_current || existing?.isCurrent || yr === endYear,
      });
    }
    return result;
  })();

  // Build monthly series for the last 12 months (zeros for months with no data)
  const cveMonths = (() => {
    const now = new Date();
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const key = `${yr}-${String(mo).padStart(2, '0')}`;
      const existing = cveMonthMap[key];
      result.push({
        m: key,
        v: existing?.count || 0,
        c: i === 0,
        cves: existing?.cves || [],
      });
    }
    return result;
  })();

  // Flat list of all CVE entries for the detail table (sorted newest first)
  const cveEntries = (cves?.months || [])
    .flatMap((m) => (m.cves || []).map((c) => ({ ...c, month: m.month })))
    .sort((a, b) => b.published.localeCompare(a.published));

  // For the overview mini-chart: last 6 years of CVE counts (or fill zeros)
  const cveYearValues = cveYears.map((y) => y.v);

  return {
    name: project.name,
    sub: project.foundation || 'Independent',
    foundation: project.foundation || 'Independent',
    founded: metadata?.created_at ? `Founded ${new Date(metadata.created_at).getFullYear()}` : 'Founded —',
    status,
    adopters: adoptersList,
    adoptersSource,
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
    prMedianMergeDays: pull_requests?.median_time_to_merge_days ?? pull_requests?.medianTimeToMergeDays ?? null,
    issueYearly: issueYearlyData.length > 0 ? issueYearlyData : [{ y: '2025', v: 0, c: true }],
    issueMonthly: issueMonthlyData.length > 0 ? issueMonthlyData : [],
    issueMedianResolutionDays: issues?.median_resolution_time_days ?? issues?.medianResolutionTimeDays ?? null,
    cveYearly: cveYears.length > 0 ? cveYears : [],
    cveMonthly: cveMonths.length > 0 ? cveMonths : [],
    cveEntries,
    cveSource: cves?.source || null,
    cveTotalAllTime: cves?.total_cves || cves?.totalCves || 0,
    cveYearValues,
    aiPolicySummary: aiPolicySummaries[project.id]?.points || [],
    aiPolicySource: aiPolicySummaries[project.id]?.source || null,
    controls: controlsAssessments[project.id] || [],
    extractedAt: metadata?.extracted_at || null, // Store the extraction timestamp
  };
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return num.toLocaleString('en-US');
}

// Made with Bob
