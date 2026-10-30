import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { relativeTime } from '@/lib/time';

/** "5m ago", kept current, with the exact time on hover and for screen readers. */
export function RelativeTime({ at, className }: { at: number | string | null | undefined; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = typeof at === 'string' ? Date.parse(at) : at;
  if (ms == null || !Number.isFinite(ms)) return <span className={className}>—</span>;
  const exact = new Date(ms).toLocaleString();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={new Date(ms).toISOString()} className={className}>
          {relativeTime(ms, now)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{exact}</TooltipContent>
    </Tooltip>
  );
}
