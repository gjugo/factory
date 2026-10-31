import { FastForward, Gauge } from 'lucide-react';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/api';
import { cn } from '@/lib/utils';
import { usageMeter } from '@/ops';
import { useStore } from '@/store';
import { attempt } from './overview';

// Claude's usage: normal, pacing new work after a warning, or paused at the limit; the latest warning, and
// "Resume full speed". The demo can simulate a warning or the limit.

const BADGE = { good: 'border-success/30 bg-success/10 text-success', warn: 'border-warning/30 bg-warning/10 text-warning', bad: 'border-destructive/30 bg-destructive/10 text-destructive' };

const plural = (n: number) => `${n} session${n === 1 ? '' : 's'}`;

async function confirmResume() {
  const { usage, settings } = useStore.getState();
  if (usage.state !== 'pacing') return;
  const m = usageMeter(usage, Date.now());
  const ok = await confirmDialog({
    title: 'Resume full speed?',
    body: `Claude warned that usage is getting high${usage.warning ? ` (${m.limit})` : ''}, so until ${m.resets} new issues only start while fewer than ${plural(settings.pacingSessions)} run. Resume if you've topped up or your usage was reset. If Claude still turns a session away at the limit, the office pauses until it resets.`,
    confirm: 'Resume full speed',
  });
  if (ok) await attempt(() => api.resumeFullSpeed());
}

export function UsageCard() {
  const usage = useStore((s) => s.usage);
  const sessions = useStore((s) => s.settings.pacingSessions);
  const demo = useStore((s) => s.demo);
  const m = usageMeter(usage, Date.now());
  const pct = m.pct ?? 0;
  const why =
    usage.state === 'pacing'
      ? `Until ${m.resets}, new issues only start while fewer than ${plural(sessions)} run; QA, fixes and the CEO carry on.`
      : usage.state === 'paused'
        ? `Claude turned a session away at the limit, so nothing new starts until ${m.resets}. Sessions already running carry on.`
        : 'New work starts at full speed. When Claude warns that usage is getting high, the office paces itself.';
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-4 text-muted-foreground" aria-hidden /> Claude usage
        </CardTitle>
        <CardDescription>{usage.state === 'normal' ? 'Full speed' : `${m.state} until ${m.resets}`}</CardDescription>
        <CardAction>
          <Badge variant="outline" className={BADGE[m.tone]}>
            {m.state}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-medium">{m.limit}</span>
            {m.resets && <span className="shrink-0 text-xs text-muted-foreground">resets {m.resets}</span>}
          </div>
          <Progress
            value={Math.min(100, pct)}
            aria-label="Claude usage at the last warning"
            className={cn('bg-muted', pct >= 90 ? '[&>*]:bg-destructive' : pct >= 75 ? '[&>*]:bg-warning' : '[&>*]:bg-success')}
          />
        </div>
        <p className="text-sm text-muted-foreground">{why}</p>
        <div>
          <Button
            size="sm"
            disabled={usage.state !== 'pacing'}
            title={usage.state === 'paused' ? "A pause at the limit can't be cleared early" : usage.state === 'normal' ? 'Already at full speed' : 'Stop pacing new issues now'}
            onClick={() => void confirmResume()}
          >
            <FastForward aria-hidden /> Resume full speed
          </Button>
        </div>
        {demo && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">Demo:</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void attempt(() => api.simulateUsage('warning'))}>
              Simulate a warning
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void attempt(() => api.simulateUsage('limit'))}>
              Simulate the limit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
