import { CircleCheck, Stethoscope } from 'lucide-react';
import { Link } from 'react-router';
import type { DoctorFinding, DoctorFix } from '../../../../shared/types';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { RelativeTime } from '@/components/shared/relative-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/api';
import { projectName } from '@/hooks/use-project-rows';
import { links } from '@/lib/links';
import { useStore } from '@/store';
import { attempt } from './overview';

// The office doctor (server/watchdog.ts): what's stuck that it can't safely fix by itself, each with its one-click
// fixes and Ignore. The demo adds its scenarios, to make something stuck on purpose.

const FIXES: Record<DoctorFix, [string, string]> = {
  clear: ['Clear desk', 'Clear their desk so they take new work'],
  stop: ['Stop', 'Stop their session'],
  requeue: ['Requeue', 'Stop them and put the work back in line, without a strike'],
  'retry-qa': ['Retry QA', 'Queue the PR for a fresh QA run'],
  'send-back': ['Send back for a fix', 'Hand the PR to its author, or any free agent'],
  'close-issue': ['Close issue', 'Close the issue on GitHub as completed'],
};

const DEMO: [Parameters<typeof api.demoDoctor>[0], string, string][] = [
  ['restart', 'Simulate a restart', 'Restart with desks gone and work finished on GitHub meanwhile'],
  ['stuck', 'Make a session stuck', "Someone's session goes quiet for 20 minutes"],
  ['later', '10 minutes later', 'Ten more minutes pass for the stuck sessions'],
  ['unclosed', 'Leave an issue open', 'A merged PR whose issue was never closed'],
];

async function applyFix(f: DoctorFinding, fix: DoctorFix) {
  if (fix === 'close-issue') {
    const ok = await confirmDialog({
      title: `Close issue #${f.issueNumber}?`,
      body: `It's closed on GitHub as completed, with a comment saying PR #${f.prNumber} resolved it.`,
      confirm: 'Close issue',
    });
    if (!ok) return;
  }
  await attempt(() => api.doctorFix(f.id, fix));
}

async function demoDoctor(action: Parameters<typeof api.demoDoctor>[0]) {
  const r = await attempt(() => api.demoDoctor(action));
  if (r) useStore.getState().pushToast('info', r.text);
}

function Finding({ finding: f }: { finding: DoctorFinding }) {
  const repo = useStore((s) => s.repos.find((r) => r.id === f.repoId));
  const agent = useStore((s) => (f.agentId ? s.agents[f.agentId] : undefined));
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium break-words">{f.text}</p>
        <p className="truncate text-xs text-muted-foreground">
          {repo ? projectName(repo) : f.repoId} · since <RelativeTime at={f.since} />
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {f.fixes.map((fix, i) => (
          <Button key={fix} size="sm" variant={i === 0 ? 'default' : 'outline'} title={FIXES[fix][1]} onClick={() => void applyFix(f, fix)}>
            {FIXES[fix][0]}
          </Button>
        ))}
        {f.agentId && (
          <Button size="sm" variant="outline" asChild>
            <Link to={links.agent(f.agentId)}>{agent ? `${agent.name}'s terminal` : 'Terminal'}</Link>
          </Button>
        )}
        <Button size="sm" variant="ghost" className="ml-auto" title="Hide it until it goes away" onClick={() => void attempt(() => api.doctorIgnore(f.id))}>
          Ignore
        </Button>
      </div>
    </li>
  );
}

export function DoctorCard() {
  const doctor = useStore((s) => s.doctor);
  const demo = useStore((s) => s.demo);
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="size-4 text-muted-foreground" aria-hidden /> Office doctor
        </CardTitle>
        <CardDescription>What's stuck that the watchdog can't safely fix by itself</CardDescription>
        {doctor.length > 0 && (
          <CardAction>
            <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning tabular-nums">
              {doctor.length}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {doctor.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            Nothing stuck. Every minute the watchdog nudges quiet sessions, frees stuck desks and puts orphaned work back in line.
          </p>
        ) : (
          <ul className="divide-y">
            {doctor.map((f) => (
              <Finding key={f.id} finding={f} />
            ))}
          </ul>
        )}
        {demo && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">Demo:</span>
            {DEMO.map(([action, label, hint]) => (
              <Button key={action} size="sm" variant="ghost" className="h-7 text-xs" title={hint} onClick={() => void demoDoctor(action)}>
                {label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
