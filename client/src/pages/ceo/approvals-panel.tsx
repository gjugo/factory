import { UserMinus, UserPlus, Users } from 'lucide-react';
import { useId } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { api } from '@/api';
import { pendingRequests, useStore } from '@/store';
import { RequestCard } from './request-card';

// The team changes waiting on the manager, the demo's way to make one, and the last few decisions.

const RECENT = 8;

export function ApprovalsPanel() {
  const requests = useStore((s) => s.requests);
  const demo = useStore((s) => s.demo);
  const id = useId();
  const pending = pendingRequests(requests);
  const decided = requests
    .filter((r) => r.status !== 'pending')
    .sort((a, b) => (b.decidedAt ?? b.createdAt) - (a.decidedAt ?? a.createdAt))
    .slice(0, RECENT);
  const propose = (kind: 'hire' | 'let-go') => void api.demoPropose(kind).catch(() => undefined);

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby={`${id}-pending`}>
        <h2 id={`${id}-pending`} className="text-sm font-semibold">
          Waiting on you{pending.length > 0 && <span className="text-muted-foreground"> · {pending.length}</span>}
        </h2>
        {pending.length === 0 ? (
          <EmptyState icon={Users} title="Nothing to decide" description="When the CEO wants a project's team to grow or shrink, the change shows up here for your OK." className="p-6" />
        ) : (
          pending.map((r) => <RequestCard key={r.id} req={r} />)
        )}
        {demo && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Demo:</span>
            <Button variant="outline" size="sm" onClick={() => propose('hire')}>
              <UserPlus aria-hidden /> Propose a hire
            </Button>
            <Button variant="outline" size="sm" onClick={() => propose('let-go')}>
              <UserMinus aria-hidden /> Propose a let-go
            </Button>
          </div>
        )}
      </section>
      {decided.length > 0 && (
        <section className="space-y-3" aria-labelledby={`${id}-recent`}>
          <h2 id={`${id}-recent`} className="text-sm font-semibold">
            Recent decisions
          </h2>
          {decided.map((r) => (
            <RequestCard key={r.id} req={r} />
          ))}
        </section>
      )}
    </div>
  );
}
