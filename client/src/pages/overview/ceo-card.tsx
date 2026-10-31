import { ArrowRight, Briefcase } from 'lucide-react';
import { Link } from 'react-router';
import { CEO_ID } from '../../../../shared/types';
import { RelativeTime } from '@/components/shared/relative-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/api';
import { links } from '@/lib/links';
import { useStore } from '@/store';
import { attempt } from './overview';

// The CEO at a glance: the job in hand, the queue behind it, the last and next review, and the way to its console.

const QUEUE_SHOWN = 4;

export function CeoCard() {
  const ceo = useStore((s) => s.ceo);
  const name = useStore((s) => s.agents[CEO_ID]?.name) ?? 'The CEO';
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="size-4 text-muted-foreground" aria-hidden /> {name}
        </CardTitle>
        <CardDescription>Your CEO: plans the work and looks at what's stuck</CardDescription>
        <CardAction>
          <Badge variant="outline" className={ceo.job ? 'border-info/30 bg-info/10 text-info' : 'text-muted-foreground'}>
            {ceo.job ? 'Working' : 'Idle'}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Now</dt>
          <dd className="min-w-0 break-words">{ceo.job?.label ?? 'Nothing'}</dd>
          <dt className="text-muted-foreground">Queue</dt>
          <dd className="min-w-0">
            {ceo.queue.length === 0 ? (
              'Empty'
            ) : (
              <ul className="flex flex-col gap-0.5">
                {ceo.queue.slice(0, QUEUE_SHOWN).map((j, i) => (
                  <li key={i} className="break-words">
                    {j.label}
                  </li>
                ))}
                {ceo.queue.length > QUEUE_SHOWN && <li className="text-muted-foreground">and {ceo.queue.length - QUEUE_SHOWN} more</li>}
              </ul>
            )}
          </dd>
          <dt className="text-muted-foreground">Last review</dt>
          <dd>{ceo.lastReviewAt ? <RelativeTime at={ceo.lastReviewAt} /> : 'Not yet'}</dd>
          <dt className="text-muted-foreground">Next review</dt>
          <dd>{ceo.nextReviewAt ? <RelativeTime at={ceo.nextReviewAt} /> : 'Heartbeat off'}</dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link to={links.ceo()}>
              Open the CEO <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button size="sm" variant="outline" title="Ask the CEO to review every project now" onClick={() => void attempt(() => api.ceoReview())}>
            Review now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
