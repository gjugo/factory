import { Cpu, Gauge, Stethoscope, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { sessionsLabel } from '@/lib/agents';
import { links } from '@/lib/links';
import { cn } from '@/lib/utils';
import { usageMeter } from '@/ops';
import { useStore } from '@/store';

/** The connection to the office, the sessions running, Claude's usage and the office doctor's findings, as compact chips. */
export function ConnectionStatus() {
  const connected = useStore((s) => s.connected);
  const usage = useStore((s) => s.usage);
  const limit = useStore((s) => s.settings.sessionLimit);
  const sessions = useStore((s) => sessionsLabel(s.agents, limit));
  const doctor = useStore((s) => s.doctor.length);
  const meter = usageMeter(usage, Date.now());
  const usageTone = meter.tone === 'bad' ? 'border-destructive/30 text-destructive' : meter.tone === 'warn' ? 'border-warning/30 text-warning' : 'text-muted-foreground';
  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" tabIndex={0} className={cn('gap-1', connected ? 'text-muted-foreground' : 'border-destructive/30 text-destructive')}>
            {connected ? <Wifi className="size-3" aria-hidden /> : <WifiOff className="size-3" aria-hidden />}
            <span className="hidden lg:inline">{connected ? 'Live' : 'Offline'}</span>
            <span className="sr-only lg:hidden">{connected ? 'Connected to the office' : 'Not connected to the office'}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{connected ? 'Connected: changes show live' : 'Reconnecting to the office…'}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" tabIndex={0} className="gap-1 text-muted-foreground tabular-nums">
            <Cpu className="size-3" aria-hidden />
            <span className="hidden lg:inline">{sessions}</span>
            <span className="sr-only lg:hidden">{sessions} running</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{limit ? `Agent sessions running now, of the session limit (${limit})` : 'Agent sessions running now (no session limit)'}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" tabIndex={0} className={cn('gap-1', usageTone)}>
            <Gauge className="size-3" aria-hidden />
            <span className="hidden lg:inline">{meter.state}</span>
            <span className="sr-only lg:hidden">Usage: {meter.state}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Claude usage: {meter.state} · {meter.limit}
          {meter.resets ? ` · resets ${meter.resets}` : ''}
        </TooltipContent>
      </Tooltip>
      {doctor > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" asChild className="gap-1 border-warning/30 text-warning tabular-nums">
              <Link to={links.overview('office-doctor')}>
                <Stethoscope className="size-3" aria-hidden />
                {doctor}
                <span className="hidden lg:inline">to check</span>
                <span className="sr-only lg:hidden">{doctor === 1 ? 'finding' : 'findings'} from the office doctor</span>
              </Link>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>The office doctor found something stuck: open it on the overview</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
