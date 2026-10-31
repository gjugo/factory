import { BellDot } from 'lucide-react';
import { Fragment } from 'react';
import { Link, useLocation } from 'react-router';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { projectName } from '@/hooks/use-project-rows';
import { crumbsFor } from '@/lib/crumbs';
import { links } from '@/lib/links';
import { cn } from '@/lib/utils';
import { totalNeedsYou, useStore } from '@/store';
import { SpeakingIndicator } from '@/components/voice/speaking-indicator';
import { CeoSheet } from './ceo-sheet';
import { CommandMenu } from './command-menu';
import { ConnectionStatus } from './connection-status';
import { ProjectSwitcher } from './project-switcher';
import { ReplayBadge } from './replay-bar';
import { ThemeToggle } from './theme-toggle';

/**
 * The bar over every page: where you are, the project switcher, the office's state, a message being read aloud, what
 * needs you, the CEO and the theme.
 */
export function TopBar() {
  const { pathname } = useLocation();
  const repos = useStore((s) => s.repos);
  const agents = useStore((s) => s.agents);
  const needsYou = useStore((s) => totalNeedsYou(s.repos, s.qa, s.ops, s.requests));
  const crumbs = crumbsFor(pathname, {
    project: (id) => {
      const r = repos.find((x) => x.id === id);
      return r ? projectName(r) : undefined;
    },
    agent: (id) => agents[id]?.name,
  });

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((c, i) => (
            <Fragment key={`${i}-${c.label}`}>
              {i > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
              <BreadcrumbItem className={cn('min-w-0', i < crumbs.length - 1 && 'hidden sm:inline-flex')}>
                {c.to ? (
                  <BreadcrumbLink asChild>
                    <Link to={c.to}>{c.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ReplayBadge />
        <div className="hidden md:block">
          <ProjectSwitcher />
        </div>
        <div className="hidden sm:block">
          <ConnectionStatus />
        </div>
        <SpeakingIndicator />
        <CommandMenu />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild className={cn('relative', needsYou > 0 && 'text-destructive')}>
              <Link to={links.overview()} aria-label={needsYou ? `${needsYou} things need you` : 'Nothing needs you'}>
                <BellDot className="size-4" aria-hidden />
                {needsYou > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white tabular-nums" aria-hidden>
                    {needsYou > 99 ? '99+' : needsYou}
                  </span>
                )}
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{needsYou ? `${needsYou} need${needsYou === 1 ? 's' : ''} you` : 'Nothing needs you'}</TooltipContent>
        </Tooltip>
        <CeoSheet />
        <ThemeToggle />
      </div>
    </header>
  );
}
