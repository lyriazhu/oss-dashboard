# Open Source Dashboard — React + Vite (IBM Carbon)

An open-source community health dashboard styled with the IBM Carbon Design System.
Ported from a single-file prototype into a component-based React + Vite app.

## Run it

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # preview the production build
```

Requires Node.js 18+.

## What's inside

```
src/
  main.jsx                  # entry point
  App.jsx                   # state + routing (overview <-> detail), project list
  data.js                   # the five seed communities + constants
  github.js                 # GitHub REST helpers used by "Add project"
  index.css                 # Carbon v11 tokens + all component styles
  components/
    UIShellHeader.jsx       # dark Gray 100 top bar (hamburger toggles the side nav)
    Overview.jsx            # landing view: summary tiles, communities table, mini charts
    Detail.jsx              # per-community view: KPIs, charts, tables
    SideNav.jsx             # Overview item + Communities list (animated collapse)
    AddProjectModal.jsx     # paste a GitHub URL -> live fetch
    ui.jsx                  # Tag, Tile, BarChart, Meter primitives
```

## Add project (GitHub API)

Pasting a repo URL calls the public GitHub REST API from the browser to pull stars,
forks, contributors, commits-YTD, releases, license and recent commit activity.

Anonymous requests are limited to **60/hour per IP**, and private/org repos aren't
visible. For production, proxy these calls through a backend with a GitHub token
(raises the limit to 5,000/hour and unlocks private + organization data).

## Notes

- All data here is illustrative. The seed numbers are reconciled across the overview
  and detail views so they don't conflict.
- Styling is a faithful hand-rolled implementation of Carbon tokens. To move toward
  production, swap these primitives for `@carbon/react` components (DataTable, Tile,
  Tag, Modal, UI Shell, SideNav) — the structure here maps onto them directly.
- Added projects live in memory only and reset on refresh (no backend/persistence).
```
