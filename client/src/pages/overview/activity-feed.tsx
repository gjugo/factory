import { CircleAlert, CircleCheck, Info, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { TickerItem } from '../../../../shared/types';
import { RelativeTime } from '@/components/shared/relative-time';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectName } from '@/hooks/use-project-rows';
import { useStore } from '@/store';
import { feedItems } from './overview';

// The projects' ticker lines ("Ken opened PR #212"), newest first, for every project or one.

const TONE: Record<TickerItem['tone'], { icon: LucideIcon; className: string; label: string }> = {
  good: { icon: CircleCheck, className: 'text-success', label: 'Good news' },
  bad: { icon: CircleAlert, className: 'text-destructive', label: 'Problem' },
  info: { icon: Info, className: 'text-info', label: 'Update' },
};

const SHOWN = 60;
const ALL = '*';

export function ActivityFeed() {
  const ticker = useStore((s) => s.ticker);
  const repos = useStore((s) => s.repos);
  const [project, setProject] = useState(ALL);
  const items = feedItems(ticker, project === ALL ? null : project, SHOWN);
  const nameOf = (id: string) => {
    const r = repos.find((x) => x.id === id);
    return r ? projectName(r) : id;
  };
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>What just happened, newest first</CardDescription>
        <CardAction>
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger size="sm" className="w-40" aria-label="Filter activity by project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All projects</SelectItem>
              {repos.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {projectName(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Openings, merges and QA results show up here as they happen.</p>
        ) : (
          <ol tabIndex={0} aria-label="Activity" className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-sm pr-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {items.map((t) => {
              const look = TONE[t.tone] ?? TONE.info;
              return (
                <li key={t.id} className="flex items-start gap-3 text-sm">
                  <look.icon className={`mt-0.5 size-4 shrink-0 ${look.className}`} aria-label={look.label} role="img" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{t.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {project === ALL && <>{nameOf(t.repoId)} · </>}
                      <RelativeTime at={t.at} />
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
