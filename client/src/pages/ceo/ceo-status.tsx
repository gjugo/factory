import { Loader2, RefreshCw, SquareTerminal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { CEO_ID, type CeoJobKind } from '../../../../shared/types';
import { RelativeTime } from '@/components/shared/relative-time';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/api';
import { links } from '@/lib/links';
import { isBusy, useStore } from '@/store';
import { presenceLine } from './hire';

// What the CEO is doing: its current job, what's queued, its reviews, and the way to its terminal.

const JOB_LABEL: Record<CeoJobKind, string> = { onboard: 'Onboarding', plan: 'Planning', review: 'Review', chat: 'Chat', triage: 'Triage' };

/** The CEO's presence line ("Typing…", "Busy: …", "Available"), as the chat's header shows it. */
export function useCeoPresence(): string {
  const status = useStore((s) => s.agents[CEO_ID]?.status);
  const info = useStore((s) => s.ceo);
  const limit = useStore((s) => s.settings.sessionLimit);
  const running = useStore((s) => Object.values(s.agents).filter(isBusy).length);
  return presenceLine(status, info, running, limit);
}

export function CeoStatus() {
  const ceo = useStore((s) => s.agents[CEO_ID]);
  const info = useStore((s) => s.ceo);
  const [reviewing, setReviewing] = useState(false);
  const review = async () => {
    setReviewing(true);
    await api.ceoReview().catch(() => undefined);
    setReviewing(false);
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Status</span>
        {ceo ? <StatusBadge kind="agent" status={ceo.status} /> : <span className="text-muted-foreground">No CEO yet</span>}
      </div>
      <div className="space-y-1">
        <div className="text-muted-foreground">Now</div>
        {info.job ? (
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="secondary">{JOB_LABEL[info.job.kind]}</Badge>
            <span className="min-w-0 truncate" title={info.job.label}>
              {info.job.label}
            </span>
          </div>
        ) : (
          <div>Nothing</div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-muted-foreground">Queue{info.queue.length > 0 && ` · ${info.queue.length}`}</div>
        {info.queue.length ? (
          <ol className="space-y-1">
            {info.queue.map((j, i) => (
              <li key={`${i}-${j.kind}-${j.label}`} className="flex min-w-0 items-center gap-2">
                <Badge variant="outline">{JOB_LABEL[j.kind]}</Badge>
                <span className="min-w-0 truncate" title={j.label}>
                  {j.label}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div>Empty</div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div>
          <dt className="text-muted-foreground">Last review</dt>
          <dd>{info.lastReviewAt ? <RelativeTime at={info.lastReviewAt} /> : 'Never'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Next review</dt>
          <dd>{info.nextReviewAt ? <RelativeTime at={info.nextReviewAt} /> : 'Off'}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={reviewing} onClick={() => void review()}>
          {reviewing ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
          Review now
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to={links.agent(CEO_ID)}>
            <SquareTerminal aria-hidden />
            Terminal
          </Link>
        </Button>
      </div>
    </div>
  );
}
