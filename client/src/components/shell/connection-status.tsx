import { Gauge, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usageMeter } from '@/ops';
import { useStore } from '@/store';

/** The connection to the office and where Claude's usage stands, as two compact chips. */
export function ConnectionStatus() {
  const connected = useStore((s) => s.connected);
  const usage = useStore((s) => s.usage);
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
    </div>
  );
}
