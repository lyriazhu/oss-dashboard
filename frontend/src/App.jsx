import { useState, useCallback, useEffect } from "react";
import { fetchProjects, fetchProjectMetrics, transformProjectData, fetchTokenStatus, removeProject, updateProject } from "./api.js";
import UIShellHeader from "./components/UIShellHeader.jsx";
import Overview from "./components/Overview.jsx";
import Detail from "./components/Detail.jsx";
import SideNav from "./components/SideNav.jsx";
import AddProjectModal from "./components/AddProjectModal.jsx";
import ExtractionToast from "./components/ExtractionToast.jsx";

const EXTRACTION_STORAGE_KEY = 'oss_dashboard_extracting';

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
      
      setData(projectData);
      setOrder(projectOrder);
      
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
    if (key) setExtracting({ id: key, name: name || key });
  }, []);

  // Called when the Refresh All button completes the token modal.
  // `ids` is the ordered list of project IDs returned by the backend.
  const handleRefreshAll = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    // Build queue entries using display names from current data
    const queue = ids.map((id) => ({ id, name: data[id]?.name || id }));
    setRefreshQueue(queue.slice(1));          // tail — will advance after each toast
    setExtracting({ id: queue[0].id, name: queue[0].name }); // head starts immediately
  }, [data]);

  // Advance to the next project in the refresh queue once a toast reports done.
  const handleExtractionDone = useCallback(() => {
    setExtracting(null);
    if (refreshQueue.length > 0) {
      const [next, ...rest] = refreshQueue;
      setRefreshQueue(rest);
      // Small delay so the previous toast fully clears before the next one appears
      setTimeout(() => setExtracting({ id: next.id, name: next.name }), 300);
    } else {
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
          />
        ) : (
          <Detail d={data[selectedKey]} onOverview={showOverview} />
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
