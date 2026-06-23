// GitHub REST API helpers for adding a project from a repo URL.
// Anonymous requests are rate-limited to 60/hour per IP. For production,
// proxy these calls through a backend with a token (5,000/hour + private repos).

const STATUS_LABEL = { green: "Healthy", yellow: "Watch", blue: "Growing" };

export function fmt(n) {
  return typeof n === "number" && !isNaN(n) ? n.toLocaleString("en-US") : "—";
}

export function parseRepo(url) {
  const s = url.trim().replace(/^git\+/, "").replace(/\.git$/, "");
  const m = s.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

// Count items via the Link header's last-page number (per_page=1); fall back to body length.
async function ghCount(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return null;
    const link = res.headers.get("Link");
    if (link) {
      const m = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
      if (m) return parseInt(m[1], 10);
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data.length : null;
  } catch {
    return null;
  }
}

function chunkSum(weeks, parts) {
  if (!weeks.length) return new Array(parts).fill(0);
  const out = [];
  const size = weeks.length / parts;
  for (let i = 0; i < parts; i++) {
    const a = Math.floor(i * size);
    const b = Math.floor((i + 1) * size);
    out.push(weeks.slice(a, b).reduce((s, w) => s + (w.total || 0), 0));
  }
  return out;
}

// GitHub computes commit stats lazily and may return 202 first; retry once.
async function fetchCommitActivity(base) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(base + "/stats/commit_activity", {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (res.status === 200) {
        const weeks = await res.json().catch(() => null);
        if (Array.isArray(weeks) && weeks.length) {
          return {
            activity: chunkSum(weeks.slice(-52), 12),
            quarters: chunkSum(weeks.slice(-52), 4),
          };
        }
        return null;
      }
      if (res.status !== 202) return null;
    } catch {
      return null;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

function statusFromStars(stars) {
  if (stars >= 1000) return "green"; // Healthy
  if (stars >= 200) return "blue"; // Growing
  return "yellow"; // Watch
}

// Fetches a repo and returns a project object shaped like the seed data.
// Throws a string message on failure (404 / 403 / network).
export async function fetchProject(url) {
  const parsed = parseRepo(url);
  if (!parsed) throw "Enter a valid GitHub repository URL.";

  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  let repo;
  try {
    const res = await fetch(base, { headers: { Accept: "application/vnd.github+json" } });
    if (res.status === 404) throw "Repository not found. Check the URL and that the repo is public.";
    if (res.status === 403) throw "GitHub rate limit reached (60 requests/hour for anonymous use). Try again later.";
    if (!res.ok) throw "Couldn't reach GitHub (HTTP " + res.status + ").";
    repo = await res.json();
  } catch (err) {
    throw typeof err === "string" ? err : "Network error reaching GitHub. Check your connection.";
  }

  const yearStart = new Date().getFullYear() + "-01-01T00:00:00Z";
  const [contribCount, commitYTD, releaseCount, activity] = await Promise.all([
    ghCount(base + "/contributors?per_page=1&anon=true"),
    ghCount(base + "/commits?per_page=1&since=" + yearStart),
    ghCount(base + "/releases?per_page=1"),
    fetchCommitActivity(base),
  ]);

  const stars = repo.stargazers_count || 0;
  const cls = statusFromStars(stars);
  const owner = repo.owner ? repo.owner.login : parsed.owner;
  const foundedYear = repo.created_at ? new Date(repo.created_at).getFullYear() : null;
  const lic =
    repo.license && repo.license.spdx_id && repo.license.spdx_id !== "NOASSERTION"
      ? repo.license.spdx_id
      : "—";

  const key = "p" + Date.now();
  const project = {
    name: repo.name || parsed.repo,
    sub: owner,
    foundation: owner,
    founded: foundedYear ? "Founded " + foundedYear : "Recently added",
    status: { label: STATUS_LABEL[cls], cls },
    ov: {
      foundation: owner,
      contributors: contribCount != null ? fmt(contribCount) : "—",
      companies: "—",
      commits: commitYTD != null ? fmt(commitYTD) : "—",
      stars: fmt(stars),
      quarters: activity ? activity.quarters : [0, 0, 0, 0],
    },
    kpis: [
      { l: "Contributors", v: contribCount != null ? fmt(contribCount) : "—", h: "All-time, incl. anonymous" },
      { l: "Companies", v: "—", h: "Not exposed via API" },
      { l: "Commits YTD", v: commitYTD != null ? fmt(commitYTD) : "—", h: "Default branch, since Jan 1" },
      { l: "GitHub stars", v: fmt(stars), h: fmt(repo.forks_count || 0) + " forks" },
      { l: "Open issues", v: fmt(repo.open_issues_count || 0), h: "Open issues + PRs" },
      { l: "Watchers", v: fmt(repo.subscribers_count || repo.watchers_count || 0), h: "Subscribed" },
      { l: "Releases", v: releaseCount != null ? fmt(releaseCount) : "—", h: "Published" },
      { l: "License", v: lic, h: "SPDX identifier" },
    ],
    commits: [
      { y: "2022", v: 0 },
      { y: "2023", v: 0 },
      { y: "2024", v: 0 },
      { y: "2025", v: 0, c: true },
    ],
    retention: { returning: 0, neu: 0, cap: "Retention isn't available from the public API" },
    companies: [{ n: "—", c: "—", p: "—", muted: true }],
    meta: [
      { f: "Description", v: repo.description || "—" },
      { f: "Primary language", v: repo.language || "—" },
      { f: "Default branch", v: repo.default_branch || "—" },
      {
        f: "Last push",
        v: repo.pushed_at
          ? new Date(repo.pushed_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : "—",
      },
    ],
    activity: activity ? activity.activity : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  return { key, project };
}
