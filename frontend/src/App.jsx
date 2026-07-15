import { useState, useCallback, useEffect } from "react";
import { fetchProjects, fetchProjectMetrics, transformProjectData, fetchTokenStatus, removeProject, updateProject } from "./api.js";
import UIShellHeader from "./components/UIShellHeader.jsx";
import Overview from "./components/Overview.jsx";
import Detail from "./components/Detail.jsx";
import SideNav from "./components/SideNav.jsx";
import AddProjectModal from "./components/AddProjectModal.jsx";
import ExtractionToast from "./components/ExtractionToast.jsx";

const EXTRACTION_STORAGE_KEY = 'oss_dashboard_extracting';
const MERGES_STORAGE_KEY = 'oss_dashboard_merges';

export default function App() {
  const [data, setData] = useState({});
  const [order, setOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("overview"); // 'overview' | 'detail'
  const [selectedKey, setSelectedKey] = useState(null);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [flashKey, setFlashKey] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  // refreshQueue: ordered list of {id, name} objects waiting to be extracted
  const [refreshQueue, setRefreshQueue] = useState([]);
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

  // Persist extracting state to localStorage whenever it changes
  useEffect(() => {
    if (extracting) {
      localStorage.setItem(EXTRACTION_STORAGE_KEY, JSON.stringify(extracting));
    } else {
      localStorage.removeItem(EXTRACTION_STORAGE_KEY);
    }
  }, [extracting]);

  // Restore merged state after projects are loaded from backend
  const applyPersistedMerges = useCallback((projectData, projectOrder) => {
    try {
      const saved = localStorage.getItem(MERGES_STORAGE_KEY);
      if (!saved) return { projectData, projectOrder };
      const merges = JSON.parse(saved);
      let newData = { ...projectData };
      let newOrder = [...projectOrder];

      for (const [mergedKey, memberKeys] of Object.entries(merges)) {
        if (!memberKeys.every((k) => newData[k])) continue;
        const keys = memberKeys;
        const communities = keys.map((k) => newData[k]);

        const parseNum = (v) => {
          if (v == null) return 0;
          return parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
        };
        const fmt = (n) => n.toLocaleString('en-US');
        const combinedName = communities.map((c) => c.name).join(' + ');
        const base = communities[0];
        const sumOv = (field) => fmt(communities.reduce((acc, c) => acc + parseNum(c.ov?.[field]), 0));

        const mergeYearly = (arrays, yKey = 'y', vKey = 'v') => {
          const map = new Map();
          arrays.flat().forEach((entry) => {
            const label = entry[yKey];
            const existing = map.get(label) || { ...entry, [vKey]: 0 };
            map.set(label, { ...existing, [vKey]: (existing[vKey] || 0) + (entry[vKey] || 0) });
          });
          return [...map.values()].sort((a, b) => String(a[yKey]).localeCompare(String(b[yKey])));
        };
        const mergeYearlyRetention = (arrays) => {
          const map = new Map();
          arrays.flat().forEach((entry) => {
            const label = entry.y;
            const ex = map.get(label) || { y: label, returning: 0, newContributors: 0, active: 0, v: 0, c: entry.c };
            map.set(label, { ...ex, returning: ex.returning + (entry.returning || 0), newContributors: ex.newContributors + (entry.newContributors || 0), active: ex.active + (entry.active || 0), c: ex.c || entry.c });
          });
          const merged = [...map.values()].sort((a, b) => String(a.y).localeCompare(String(b.y)));
          return merged.map((e) => ({ ...e, v: e.active ? Math.round((e.returning / e.active) * 100) : 0 }));
        };

        const mergedKpis = (base.kpis || []).map((kpi) => {
          const total = communities.reduce((acc, c) => {
            const match = (c.kpis || []).find((k) => k.l === kpi.l);
            return acc + parseNum(match?.v);
          }, 0);
          const isNumeric = !isNaN(parseNum(kpi.v)) && kpi.l !== 'Language';
          return { ...kpi, v: isNumeric ? fmt(total) : kpi.v };
        });

        const statusPriority = { Healthy: 3, Growing: 2, Watch: 1, 'N/A': 0 };
        const bestStatus = communities.reduce((best, c) => {
          return (statusPriority[c.status?.label] ?? -1) > (statusPriority[best?.label] ?? -1) ? c.status : best;
        }, base.status);

        const merged = {
          ...base,
          name: combinedName,
          _mergedFrom: communities.map((c, i) => ({ key: keys[i], data: c })),
          sub: base.sub,
          ov: { ...base.ov, contributorsYtd: sumOv('contributorsYtd'), contributorsAllTime: sumOv('contributorsAllTime'), companies: sumOv('companies'), commits: sumOv('commits'), commitsAllTime: sumOv('commitsAllTime'), pullRequests: sumOv('pullRequests'), stars: sumOv('stars'), quarters: base.ov?.quarters || [] },
          kpis: mergedKpis,
          status: bestStatus,
          commits: mergeYearly(communities.map((c) => c.commits || []), 'y', 'v'),
          retentionYearly: mergeYearlyRetention(communities.map((c) => c.retentionYearly || [])),
          prYearly: mergeYearly(communities.map((c) => c.prYearly || []), 'y', 'v'),
          issueYearly: mergeYearly(communities.map((c) => c.issueYearly || []), 'y', 'v'),
          cveYearly: mergeYearly(communities.map((c) => c.cveYearly || []), 'y', 'v'),
        };

        keys.forEach((k) => delete newData[k]);
        newData[mergedKey] = merged;
        const positions = keys.map((k) => newOrder.indexOf(k)).filter((i) => i >= 0);
        const insertIdx = positions.length > 0 ? Math.min(...positions) : newOrder.length;
        newOrder = newOrder.filter((k) => !keys.includes(k));
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
      
      // Fetch all projects
      const projects = await fetchProjects();
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
      
      const { projectData: mergedData, projectOrder: mergedOrder } = applyPersistedMerges(projectData, projectOrder);
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
    window.scrollTo(0, 0);
  }, []);

  const showDetail = useCallback((key) => {
    setSelectedKey(key);
    setNavCollapsed(true);
    setView("detail");
    window.scrollTo(0, 0);
  }, []);

  const selectCommunity = useCallback((key) => {
    setSelectedKey(key);
  }, []);

  const handleUpdateProject = useCallback(async (projectId, fields) => {
    // 1. Optimistically patch the in-memory data so the UI updates instantly.
    setData((prev) => {
      if (!prev[projectId]) return prev;
      const updated = { ...prev[projectId] };
      if (fields.name)       updated.name = fields.name;
      if (fields.foundation) {
        updated.foundation = fields.foundation;
        updated.sub        = fields.foundation;
        updated.ov         = { ...updated.ov, foundation: fields.foundation };
      }
      return { ...prev, [projectId]: updated };
    });
    // 2. Persist to backend. The PATCH response returns the updated Project object;
    //    use it to confirm the state rather than re-fetching all projects (which
    //    would be slow and could race with the optimistic update).
    try {
      const saved = await updateProject(projectId, fields);
      // Confirm the write by applying whatever the backend actually persisted.
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
      // On failure, reload to restore the true persisted state.
      await loadProjects({ silent: true });
    }
  }, [loadProjects]); // eslint-disable-line react-hooks/exhaustive-deps

  const addProject = useCallback((key, name) => {
    // loadProjects has already refreshed data/order by the time this fires;
    // we only need to trigger the flash animation on the new row.
    setFlashKey(key);
    setTimeout(() => setFlashKey(null), 1200);
    if (key) setExtracting({ id: key, name: name || key, mode: 'add' });
  }, []);

  // Called when the Refresh All button completes the token modal.
  // `ids` is the ordered list of project IDs returned by the backend.
  const handleRefreshAll = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    // Build queue entries using display names from current data
    const queue = ids.map((id) => ({ id, name: data[id]?.name || id }));
    setRefreshQueue(queue.slice(1));          // tail — will advance after each toast
    setExtracting({ id: queue[0].id, name: queue[0].name, mode: 'refresh' }); // head starts immediately
  }, [data]);

  // Advance to the next project in the refresh queue once a toast reports done.
  const handleExtractionDone = useCallback(() => {
    if (refreshQueue.length > 0) {
      const [next, ...rest] = refreshQueue;
      setRefreshQueue(rest);
      // Start the next project immediately — no gap between toasts
      setExtracting({ id: next.id, name: next.name, mode: 'refresh' });
    } else {
      setExtracting(null);
      // All done — reload project data to pick up updated timestamps
      loadProjects({ silent: true });
    }
  }, [refreshQueue, loadProjects]);

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

  // Persist merges to localStorage whenever data changes
  useEffect(() => {
    // Collect all merged entries from current data
    const merges = {};
    Object.entries(data).forEach(([key, d]) => {
      if (d._mergedFrom) {
        merges[key] = d._mergedFrom.map((e) => e.key);
      }
    });
    if (Object.keys(merges).length > 0) {
      localStorage.setItem(MERGES_STORAGE_KEY, JSON.stringify(merges));
    } else {
      localStorage.removeItem(MERGES_STORAGE_KEY);
    }
  }, [data]);

  const handleUnmerge = useCallback((mergedKey) => {
    setData((prev) => {
      const merged = prev[mergedKey];
      if (!merged?._mergedFrom) return prev;
      const next = { ...prev };
      delete next[mergedKey];
      merged._mergedFrom.forEach(({ key, data: original }) => {
        next[key] = original;
      });
      return next;
    });
    setOrder((prev) => {
      const merged = data[mergedKey];
      if (!merged?._mergedFrom) return prev;
      const idx = prev.indexOf(mergedKey);
      const next = prev.filter((k) => k !== mergedKey);
      const originals = merged._mergedFrom.map((e) => e.key);
      next.splice(idx, 0, ...originals);
      return next;
    });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove a single repo from a merged entry
  const handleRemoveFromMerge = useCallback((mergedKey, repoKey) => {
    setData((prev) => {
      const merged = prev[mergedKey];
      if (!merged?._mergedFrom) return prev;
      const remaining = merged._mergedFrom.filter((e) => e.key !== repoKey);
      const removed = merged._mergedFrom.find((e) => e.key === repoKey);
      if (!removed) return prev;
      const next = { ...prev };
      // Restore the removed repo as its own entry
      next[repoKey] = removed.data;
      if (remaining.length < 2) {
        // Only one left — unmerge entirely
        delete next[mergedKey];
        if (remaining.length === 1) {
          next[remaining[0].key] = remaining[0].data;
        }
      } else {
        next[mergedKey] = { ...merged, _mergedFrom: remaining };
      }
      return next;
    });
    setOrder((prev) => {
      const merged = data[mergedKey];
      if (!merged?._mergedFrom) return prev;
      const remaining = merged._mergedFrom.filter((e) => e.key !== repoKey);
      const idx = prev.indexOf(mergedKey);
      const next = prev.filter((k) => k !== mergedKey);
      if (remaining.length < 2) {
        // Unmerge all remaining too
        const all = merged._mergedFrom.map((e) => e.key);
        next.splice(idx, 0, ...all);
      } else {
        next.splice(idx, 0, mergedKey, repoKey);
      }
      return next;
    });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoinSelected = useCallback(() => {
    if (selectedKeys.size < 2) return;
    const keys = [...selectedKeys];
    const communities = keys.map((k) => data[k]);

    // Helper: parse a formatted number string like "1,234" or "1,234+" back to int
    const parseNum = (v) => {
      if (v == null) return 0;
      return parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
    };
    const fmt = (n) => n.toLocaleString('en-US');

    // Combine names with " + "
    const combinedName = communities.map((c) => c.name).join(' + ');

    // The first community is used as the base; the rest are merged into it.
    const base = communities[0];

    // Sum numeric ov fields
    const sumOv = (field) => fmt(communities.reduce((acc, c) => acc + parseNum(c.ov?.[field]), 0));

    // Merge yearly time-series arrays by matching on year label
    function mergeYearly(arrays, yKey = 'y', vKey = 'v') {
      const map = new Map();
      arrays.flat().forEach((entry) => {
        const label = entry[yKey];
        const existing = map.get(label) || { ...entry, [vKey]: 0 };
        map.set(label, { ...existing, [vKey]: (existing[vKey] || 0) + (entry[vKey] || 0) });
      });
      return [...map.values()].sort((a, b) => String(a[yKey]).localeCompare(String(b[yKey])));
    }

    function mergeYearlyRetention(arrays) {
      const map = new Map();
      arrays.flat().forEach((entry) => {
        const label = entry.y;
        const ex = map.get(label) || { y: label, returning: 0, newContributors: 0, active: 0, v: 0, c: entry.c };
        map.set(label, {
          ...ex,
          returning: ex.returning + (entry.returning || 0),
          newContributors: ex.newContributors + (entry.newContributors || 0),
          active: ex.active + (entry.active || 0),
          c: ex.c || entry.c,
        });
      });
      const merged = [...map.values()].sort((a, b) => String(a.y).localeCompare(String(b.y)));
      // Recalculate retention % from merged active/returning totals
      return merged.map((e) => ({
        ...e,
        v: e.active ? Math.round((e.returning / e.active) * 100) : 0,
      }));
    }

    // Merge kpis by summing numeric values, keeping label/help from base
    const mergedKpis = (base.kpis || []).map((kpi) => {
      const total = communities.reduce((acc, c) => {
        const match = (c.kpis || []).find((k) => k.l === kpi.l);
        return acc + parseNum(match?.v);
      }, 0);
      // Non-numeric KPIs like Language keep the base value
      const isNumeric = !isNaN(parseNum(kpi.v)) && kpi.l !== 'Language';
      return { ...kpi, v: isNumeric ? fmt(total) : kpi.v };
    });

    // Status: pick the most prominent (Healthy > Growing > Watch > N/A)
    const statusPriority = { Healthy: 3, Growing: 2, Watch: 1, 'N/A': 0 };
    const bestStatus = communities.reduce((best, c) => {
      return (statusPriority[c.status?.label] ?? -1) > (statusPriority[best?.label] ?? -1)
        ? c.status
        : best;
    }, base.status);

    const merged = {
      ...base,
      name: combinedName,
      _mergedFrom: communities.map((c, i) => ({ key: keys[i], data: c })),
      sub: base.sub, // keep foundation from the primary
      ov: {
        ...base.ov,
        contributorsYtd: sumOv('contributorsYtd'),
        contributorsAllTime: sumOv('contributorsAllTime'),
        companies: sumOv('companies'),
        commits: sumOv('commits'),
        commitsAllTime: sumOv('commitsAllTime'),
        pullRequests: sumOv('pullRequests'),
        stars: sumOv('stars'),
        quarters: base.ov?.quarters || [],
      },
      kpis: mergedKpis,
      status: bestStatus,
      commits: mergeYearly(communities.map((c) => c.commits || []), 'y', 'v'),
      retentionYearly: mergeYearlyRetention(communities.map((c) => c.retentionYearly || [])),
      prYearly: mergeYearly(communities.map((c) => c.prYearly || []), 'y', 'v'),
      issueYearly: mergeYearly(communities.map((c) => c.issueYearly || []), 'y', 'v'),
      cveYearly: mergeYearly(communities.map((c) => c.cveYearly || []), 'y', 'v'),
    };

    const mergedKey = keys[0];

    // Remove all selected keys except the base (which we replace with the merged entry)
    setData((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      next[mergedKey] = merged;
      return next;
    });
    setOrder((prev) => {
      const next = prev.filter((k) => !keys.includes(k));
      // Insert the merged entry where the base was (before the filtered position)
      const insertIdx = Math.min(...keys.map((k) => prev.indexOf(k)));
      next.splice(insertIdx, 0, mergedKey);
      return next;
    });

    // Exit select mode and clear selection
    setSelectedKeys(new Set());
    setSelectMode(false);
    // Flash the merged row
    setFlashKey(mergedKey);
    setTimeout(() => setFlashKey(null), 1200);
  }, [selectedKeys, data]); // eslint-disable-line react-hooks/exhaustive-deps

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
        onTokenExpired={() => {
          setExtracting(null);
          setRefreshQueue([]);
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
            d={data[selectedKey]}
            onOverview={showOverview}
            onRefreshProject={(id, name) => setExtracting({ id, name, mode: 'refresh' })}
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
