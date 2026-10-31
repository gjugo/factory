import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { api } from '@/api';
import { useRouteRepo } from '@/hooks/use-route-repo';
import { useRouteWatch } from '@/hooks/use-watch';
import { useApplyTheme } from '@/lib/theme';
import { useStore } from '@/store';
import { AppSidebar } from './app-sidebar';
import { Banners } from './banners';
import { ReplayBar } from './replay-bar';
import { TopBar } from './top-bar';

// Every page sits in this frame: the sidebar, the top bar, the banners, the time-lapse's bar while it plays, and what's
// shared (⌘K, the CEO sheet, toasts, confirmations). It also points the tab's watch at the route's project.

export function AppShell() {
  useApplyTheme();
  const { repoId } = useRouteRepo();
  useRouteWatch(repoId);
  const navigate = useNavigate();
  const ui = useStore((s) => s.settings.ui);

  // A desktop notification's click (notifications.ts) opens the page it's about.
  useEffect(() => {
    const open = (e: Event) => {
      const url = (e as CustomEvent<string>).detail;
      if (typeof url === 'string' && url.startsWith('/')) navigate(url);
    };
    window.addEventListener('cubefarm:open', open);
    return () => window.removeEventListener('cubefarm:open', open);
  }, [navigate]);

  // The desktop sidebar's state is an office setting too.
  const setOpen = (open: boolean) => {
    const before = useStore.getState().settings;
    useStore.setState({ settings: { ...before, ui: { ...before.ui, sidebarCollapsed: !open } } });
    void api.updateSettings({ ui: { ...before.ui, sidebarCollapsed: !open } }).catch(() => undefined);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider open={!ui?.sidebarCollapsed} onOpenChange={setOpen}>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <TopBar />
          <Banners />
          <main className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
            <Outlet />
          </main>
          <ReplayBar />
        </SidebarInset>
        <ConfirmDialog />
        <Toaster position="bottom-right" closeButton />
      </SidebarProvider>
    </TooltipProvider>
  );
}
