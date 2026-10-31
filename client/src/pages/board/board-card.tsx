import { CircleCheck, CircleDashed, CircleX, GitMerge, GitPullRequest, Hourglass } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router';
import { RelativeTime } from '@/components/shared/relative-time';
import { ToneBadge } from '@/components/shared/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { links } from '@/lib/links';
import { statusLook } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { Agent, KanbanCard } from '@/store';
import type { PullInfo } from '../../../../shared/types';
import { BACKLOG_LOOK, cardDomKey, initials, noteTone, shownNote, type BacklogState, type CardDetail, type ColumnKey } from './board';

// One card on the board. Its title is the button that opens the card's sheet (stretched over the card), so the agent
// link and dependency chips stay real links of their own.

const EDGE: Record<NonNullable<KanbanCard['tone']>, string> = { good: 'border-l-success', warn: 'border-l-warning', bad: 'border-l-destructive' };

/** An agent's initials in a circle. */
export function AgentAvatar({ agent, className }: { agent: Pick<Agent, 'name'>; className?: string }) {
  return (
    <Avatar size="sm" className={className}>
      <AvatarFallback className="bg-secondary text-[10px] font-medium text-secondary-foreground">{initials(agent.name)}</AvatarFallback>
    </Avatar>
  );
}

/** GitHub's checks on a PR as a small icon, named for screen readers. */
export function ChecksIcon({ checks }: { checks: PullInfo['checks'] }) {
  const { label } = statusLook('checks', checks);
  const Icon = checks === 'passing' ? CircleCheck : checks === 'failing' ? CircleX : CircleDashed;
  const color = checks === 'passing' ? 'text-success' : checks === 'failing' ? 'text-destructive' : checks === 'pending' ? 'text-info' : 'text-muted-foreground';
  return <Icon className={cn('size-3.5 shrink-0', color)} role="img" aria-label={label} />;
}

export function LineCounts({ pull, className }: { pull: Pick<PullInfo, 'additions' | 'deletions'>; className?: string }) {
  return (
    <span className={cn('font-mono text-xs tabular-nums', className)}>
      <span className="text-success">+{pull.additions}</span> <span className="text-destructive">−{pull.deletions}</span>
    </span>
  );
}

export interface BoardCardProps {
  repoId: string;
  card: KanbanCard;
  column: ColumnKey;
  detail: CardDetail;
  backlog?: BacklogState;
  onOpen: (card: KanbanCard) => void;
}

export const BoardCardView = memo(function BoardCardView({ repoId, card, column, detail, backlog, onOpen }: BoardCardProps) {
  const { pull, labels, waits, since } = detail;
  const isPr = card.prNumber != null;
  const note = shownNote(card, column, backlog);
  const state = backlog ? BACKLOG_LOOK[backlog] : null;
  const ageLabel = column === 'merged' ? 'merged' : column === 'building' ? 'started' : isPr ? 'opened' : 'filed';
  return (
    <article
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border border-l-2 bg-card p-3 text-card-foreground shadow-xs transition-colors [contain-intrinsic-size:auto_7rem] [content-visibility:auto] hover:bg-accent/40',
        'has-[[data-card]:focus-visible]:ring-2 has-[[data-card]:focus-visible]:ring-ring has-[[data-card]:focus-visible]:ring-offset-2 has-[[data-card]:focus-visible]:ring-offset-background',
        card.tone ? EDGE[card.tone] : 'border-l-border',
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isPr ? column === 'merged' ? <GitMerge className="size-3.5" aria-hidden /> : <GitPullRequest className="size-3.5" aria-hidden /> : null}
        <span className="font-mono tabular-nums">{isPr ? `PR #${card.number}` : `#${card.number}`}</span>
        {pull && column !== 'merged' && <ChecksIcon checks={pull.checks} />}
        {pull?.isDraft && <span>draft</span>}
        <span className="flex-1" />
        {pull && <LineCounts pull={pull} />}
      </div>
      <button
        type="button"
        data-card={cardDomKey(card)}
        onClick={() => onOpen(card)}
        className="text-left text-sm leading-snug font-medium outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
      >
        {card.title || `#${card.number}`}
      </button>
      {(labels.length > 0 || state) && (
        <div className="flex flex-wrap items-center gap-1">
          {state && <ToneBadge tone={state.tone} label={state.label} />}
          {labels.slice(0, 3).map((l) => (
            <Badge key={l} variant="secondary" className="max-w-32 truncate font-normal">
              {l}
            </Badge>
          ))}
          {labels.length > 3 && <span className="text-xs text-muted-foreground">+{labels.length - 3}</span>}
        </div>
      )}
      {waits.length > 0 && (
        <div className="relative z-10 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Hourglass className="size-3" aria-hidden />
          <span>Waits for</span>
          {waits.map((n) => (
            <Link
              key={n}
              to={links.board(repoId, { kind: 'issue', number: n })}
              className="rounded-sm border px-1.5 py-0.5 font-mono text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Open blocking issue #${n}`}
            >
              #{n}
            </Link>
          ))}
        </div>
      )}
      {note && isPr && <ToneBadge tone={noteTone(card.tone)} label={note} className="max-w-full justify-start truncate" />}
      {note && !isPr && <p className={cn('text-xs', card.tone === 'bad' ? 'text-destructive' : card.tone === 'warn' ? 'text-warning' : 'text-muted-foreground')}>{note}</p>}
      {(card.agent || since) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {card.agent && (
            <Link
              to={links.agent(card.agent.id)}
              className="relative z-10 flex min-w-0 items-center gap-1.5 rounded-sm text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <AgentAvatar agent={card.agent} />
              <span className="min-w-6 truncate">{card.agent.name}</span>
              {card.agent.task === 'qa' && card.agent.prNumber === card.prNumber && <span className="shrink-0 text-muted-foreground">· QA</span>}
            </Link>
          )}
          <span className="flex-1" />
          {since && (
            <span className="relative z-10 shrink-0">
              <span className="sr-only">{ageLabel} </span>
              <RelativeTime at={since} />
            </span>
          )}
        </div>
      )}
    </article>
  );
});
