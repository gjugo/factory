import { Bot, Building2, Crown, Factory, FolderGit2, History, LayoutDashboard, Plus, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { StatusDot } from '@/components/shared/status-badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { HEALTH_LOOK, useProjectRows } from '@/hooks/use-project-rows';
import { useRouteRepo } from '@/hooks/use-route-repo';
import { links } from '@/lib/links';
import { useCeoBadge, useStore } from '@/store';

// The sidebar: the office's pages, then every project (a cubefarm floor) with its status and what waits on the manager.
// Below md it is a sheet (shadcn's Sidebar does that itself) that closes once something in it is picked.

const PAGES = [
  { title: 'Overview', to: links.overview(), icon: LayoutDashboard, exact: true },
  { title: 'Agents', to: links.agents(), icon: Bot },
  { title: 'CEO', to: links.ceo(), icon: Crown },
  { title: 'Projects', to: links.projects(), icon: FolderGit2, exact: true },
  { title: 'Time-lapse', to: links.timelapse(), icon: History },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const loaded = useStore((s) => s.loaded);
  const company = useStore((s) => s.settings.companyName);
  const rows = useProjectRows();
  const ceoBadge = useCeoBadge();
  const { repoId } = useRouteRepo();
  const close = () => setOpenMobile(false);
  const active = (to: string, exact?: boolean) => (exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="factory">
              <Link to={links.overview()} onClick={close}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Factory className="size-4" aria-hidden />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">factory</span>
                  <span className="truncate text-xs text-muted-foreground">{company || 'Agent office'}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Office</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PAGES.map((p) => (
                <SidebarMenuItem key={p.to}>
                  <SidebarMenuButton asChild isActive={active(p.to, p.exact)} tooltip={p.title}>
                    <Link to={p.to} onClick={close}>
                      <p.icon aria-hidden />
                      <span>{p.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {p.to === links.ceo() && ceoBadge > 0 && (
                    <SidebarMenuBadge className="bg-primary/10 text-primary" aria-label={`${ceoBadge} unread or waiting on you`}>
                      {ceoBadge > 99 ? '99+' : ceoBadge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupAction asChild title="Add a project">
            <Link to={links.addProject()} onClick={close} aria-label="Add a project">
              <Plus aria-hidden />
            </Link>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {!loaded && [0, 1].map((i) => <SidebarMenuItem key={i}><SidebarMenuSkeleton showIcon /></SidebarMenuItem>)}
              {loaded && rows.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Add a project">
                    <Link to={links.addProject()} onClick={close} className="text-muted-foreground">
                      <Building2 aria-hidden />
                      <span>No projects yet</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {rows.map((row) => (
                <SidebarMenuItem key={row.repo.id}>
                  <SidebarMenuButton asChild isActive={row.repo.id === repoId} tooltip={`${row.name} · ${HEALTH_LOOK[row.health].label}`}>
                    <Link to={links.board(row.repo.id)} onClick={close}>
                      <span className="flex size-4 items-center justify-center">
                        <StatusDot tone={HEALTH_LOOK[row.health].tone} label={HEALTH_LOOK[row.health].label} />
                      </span>
                      <span className="truncate">{row.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  {row.needsYou > 0 && (
                    <SidebarMenuBadge className="bg-destructive/10 text-destructive" aria-label={`${row.needsYou} need you`}>
                      {row.needsYou}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={active(links.settings())} tooltip="Settings">
              <Link to={links.settings()} onClick={close}>
                <Settings aria-hidden />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
