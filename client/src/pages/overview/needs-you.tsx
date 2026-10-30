import { Bot, CircleCheck, GitPullRequest } from 'lucide-react';
import { Link } from 'react-router';
import type { OpsAlarm } from '../../../../shared/types';
import { RelativeTime } from '@/components/shared/relative-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/api';
import { projectName } from '@/hooks/use-project-rows';
import { useStore } from '@/store';
import { alarmLink, attempt } from './overview';

// ops.alarms, oldest first: PRs the office can't move without the manager, and agents stuck on an error. Each opens
// its board card or agent page, with the quick fixes cubefarm's console offers.

function Alarm({ alarm: a }: { alarm: OpsAlarm }) {
  const repo = useStore((s) => s.repos.find((r) => r.id === a.repoId));
  const pr = a.prNumber !== null ? repo?.pulls.find((p) => p.number === a.prNumber) : undefined;
  const Icon = a.kind === 'pr' ? GitPullRequest : Bot;
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <Link to={alarmLink(a)} className="rounded-sm text-sm font-medium break-words hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {a.text}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {repo ? projectName(repo) : a.repoId}
            {pr ? ` · ${pr.title}` : ''} · since <RelativeTime at={a.since} />
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-10">
        {a.kind === 'pr' && a.prNumber !== null ? (
          <>
            <Button size="sm" variant="outline" onClick={() => void attempt(() => api.sendToQa(a.repoId, a.prNumber!))}>
              Retry QA
            </Button>
            <Button size="sm" variant="outline" title="Hand it to its author, or any free agent, with QA's findings" onClick={() => void attempt(() => api.sendBack(a.repoId, a.prNumber!))}>
              Send back for a fix
            </Button>
          </>
        ) : (
          a.agentId && (
            <Button size="sm" variant="outline" title="Clear their desk so they take new work" onClick={() => void attempt(() => api.reset(a.agentId!))}>
              Clear desk
            </Button>
          )
        )}
      </div>
    </li>
  );
}

export function NeedsYouCard() {
  const alarms = useStore((s) => s.ops.alarms);
  const sorted = [...alarms].sort((x, y) => x.since - y.since);
  return (
    <Card id="needs-you" className="scroll-mt-20 gap-4">
      <CardHeader>
        <CardTitle>Needs you</CardTitle>
        <CardDescription>PRs the office can't move, agents stuck on an error for 10 minutes</CardDescription>
        {alarms.length > 0 && (
          <CardAction>
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive tabular-nums">
              {alarms.length}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-success" aria-hidden /> All clear.
          </p>
        ) : (
          <ul className="divide-y">
            {sorted.map((a) => (
              <Alarm key={a.id} alarm={a} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
