import { Newspaper } from 'lucide-react';
import { useMemo } from 'react';
import { CEO_ID } from '../../../../shared/types';
import { StatusDot } from '@/components/shared/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { projectName } from '@/hooks/use-project-rows';
import { isBusyStatus } from '@/lib/agents';
import { agentsOnRepo, projectPrCounts, pendingRequests, useStore } from '@/store';
import { todaysReport } from './overview';

// Today's report: the office in a few sentences, most urgent first (cubefarm's phone Company tab).

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function ReportCard() {
  const repos = useStore((s) => s.repos);
  const agents = useStore((s) => s.agents);
  const qa = useStore((s) => s.qa);
  const requests = useStore((s) => s.requests);
  const sessionLimit = useStore((s) => s.settings.sessionLimit);
  const ceo = useStore((s) => s.ceo);
  const lines = useMemo(() => {
    const projects = repos.map((r) => {
      const team = agentsOnRepo(agents, r.id).filter((a) => a.role !== 'ceo');
      const counts = projectPrCounts(r, qa);
      return {
        name: projectName(r),
        issues: r.issues.length,
        prs: r.pulls.filter((p) => p.state === 'OPEN').length,
        ready: counts.ready,
        needsYou: counts.needsYou,
        autoAssign: r.autoAssign,
        working: team.filter((a) => isBusyStatus(a.status)).length,
        idle: team.filter((a) => !isBusyStatus(a.status)).length,
      };
    });
    const boss = agents[CEO_ID];
    return todaysReport(
      {
        projects,
        pending: pendingRequests(requests).length,
        running: Object.values(agents).filter((a) => isBusyStatus(a.status)).length,
        sessionLimit,
        ceo: boss ? { name: boss.name, job: boss.status === 'working' ? (ceo.job?.label ?? 'working') : null, nextReviewAt: ceo.nextReviewAt } : null,
      },
      clock,
    );
  }, [repos, agents, qa, requests, sessionLimit, ceo]);
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="size-4 text-muted-foreground" aria-hidden /> Today's report
        </CardTitle>
        <CardDescription>The office in a few sentences, most urgent first</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map((l) => (
            <li key={l.text} className="flex items-baseline gap-2">
              <StatusDot tone={l.tone} label={l.tone === 'neutral' ? 'Note' : l.tone} className="translate-y-[-1px]" />
              <span className="min-w-0 break-words">{l.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
