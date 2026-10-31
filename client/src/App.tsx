import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AppShell } from '@/components/shell/app-shell';
import { links } from '@/lib/links';
import { useStore } from '@/store';
import AgentPage from '@/pages/agent';
import AgentsPage from '@/pages/agents';
import AppViewerPage from '@/pages/app-viewer';
import BoardPage from '@/pages/board';
import CeoPage from '@/pages/ceo';
import NotFoundPage from '@/pages/not-found';
import OverviewPage from '@/pages/overview';
import ProjectSettingsPage from '@/pages/project-settings';
import ProjectsPage from '@/pages/projects';
import SettingsPage from '@/pages/settings';
import SetupPage from '@/pages/setup';

// The routes. Until the office's first-run setup is done (settings.setupDone) every route shows the setup page.

function SetupGate({ children }: { children: React.ReactNode }) {
  const loaded = useStore((s) => s.loaded);
  const setupDone = useStore((s) => s.settings.setupDone);
  const { pathname } = useLocation();
  if (loaded && !setupDone && pathname !== links.setup()) return <Navigate to={links.setup()} replace />;
  if (loaded && setupDone && pathname === links.setup()) return <Navigate to={links.overview()} replace />;
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <SetupGate>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:owner/:name" element={<BoardPage />} />
            <Route path="projects/:owner/:name/app" element={<AppViewerPage />} />
            <Route path="projects/:owner/:name/settings" element={<ProjectSettingsPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="agents/:id" element={<AgentPage />} />
            <Route path="ceo" element={<CeoPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="setup" element={<SetupPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SetupGate>
    </BrowserRouter>
  );
}
