import { useState, useCallback, useEffect } from "react";
import { fetchProjects, fetchProjectMetrics, transformProjectData, fetchTokenStatus } from "./api.js";
import UIShellHeader from "./components/UIShellHeader.jsx";
import Overview from "./components/Overview.jsx";
import Detail from "./components/Detail.jsx";
import SideNav from "./components/SideNav.jsx";
import AddProjectModal from "./components/AddProjectModal.jsx";
import ExtractionToast from "./components/ExtractionToast.jsx";

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
  const [extracting, setExtracting] = useState(null); // { id, name }
  const [tokenConfigured, setTokenConfigured] = useState(false);

  // Load projects and check token status on mount
  useEffect(() => {
    loadProjects();
    fetchTokenStatus().then((s) => setTokenConfigured(s.configured));
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
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
      console.log('📦 Project data:', projectData);
      
      setData(projectData);
      setOrder(projectOrder);
      
      // Set first project as selected if none selected
      if (!selectedKey && projectOrder.length > 0) {
        setSelectedKey(projectOrder[0]);
      }
    } catch (err) {
      console.error('❌ Failed to load projects:', err);
      setError('Failed to load projects. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

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

  const addProject = useCallback((key, name) => {
    // loadProjects has already refreshed data/order by the time this fires;
    // we only need to trigger the flash animation on the new row.
    setFlashKey(key);
    setTimeout(() => setFlashKey(null), 1200);
    if (key) setExtracting({ id: key, name: name || key });
  }, []);

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
        onExtractionDone={() => setExtracting(null)}
        onTokenExpired={() => {
          setExtracting(null);
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
        />
        {view === "overview" ? (
          <Overview
            data={data}
            order={order}
            flashKey={flashKey}
            onSelect={showDetail}
            onAddClick={() => setModalOpen(true)}
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
