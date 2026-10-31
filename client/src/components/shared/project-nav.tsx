import { AppWindow, KanbanSquare, Settings } from 'lucide-react';
import { NavLink } from 'react-router';
import { links } from '@/lib/links';
import { cn } from '@/lib/utils';

// A project's pages in its header: Board, App, Settings, the current one marked.

export function ProjectNav({ repoId, className }: { repoId: string; className?: string }) {
  const tabs = [
    { to: links.board(repoId), label: 'Board', icon: KanbanSquare },
    { to: links.app(repoId), label: 'App', icon: AppWindow },
    { to: links.projectSettings(repoId), label: 'Settings', icon: Settings },
  ];
  return (
    <nav aria-label="Project" className={cn('inline-flex h-9 w-fit items-center rounded-lg bg-muted p-[3px]', className)}>
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={label}
          to={to}
          end
          className={({ isActive }) =>
            cn(
              'inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4',
              isActive ? 'bg-background text-foreground shadow-sm dark:bg-input/30' : 'text-foreground/75 hover:text-foreground',
            )
          }
        >
          <Icon aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
