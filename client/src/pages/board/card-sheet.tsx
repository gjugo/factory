import { AppWindow, Compass, ExternalLink, Hourglass, Link2, SquareTerminal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Markdown } from '@/components/shared/markdown';
import { Notice } from '@/components/shared/notice';
import { RelativeTime } from '@/components/shared/relative-time';
import { StatusBadge, ToneBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { links, type BoardCard } from '@/lib/links';
import type { Tone } from '@/lib/status';
import type { Agent, KanbanCard } from '@/store';
import { APPROVED_LABEL } from '../../../../shared/issueTrust';
import { blockers } from '../../../../shared/issues';
import type { PullInfo, QaCheck, QaView, RepoView } from '../../../../shared/types';
import { AgentAvatar, ChecksIcon, LineCounts } from './board-card';
import { BACKLOG_LOOK, backlogState, cardDetail, COLUMNS, noteTone, shownNote, type ColumnKey } from './board';
import { CardActions } from './card-actions';
import { QaShots } from './qa-shots';

// A card up close (cubefarm's CardView and the Kanban's buttons): the issue as Markdown and its linked PR, QA's report
// with its checks and screenshots, GitHub's checks, and what the manager can do. It follows the card as it moves.

const RESULT: Record<QaCheck['result'], { label: string; tone: Tone }> = {
  pass: { label: 'Pass', tone: 'success' },
  fail: { label: 'Fail', tone: 'danger' },
  skip: { label: 'Skipped', tone: 'neutral' },
};

export interface CardSheetProps {
  repo: RepoView;
  /** The ?card= asked for (null: closed). */
  target: BoardCard | null;
  found: { card: KanbanCard; column: ColumnKey } | null;
  agents: Agent[];
  onClose: () => void;
  onCloseAutoFocus: (e: Event) => void;
}

export function CardSheet({ repo, target, found, agents, onClose, onCloseAutoFocus }: CardSheetProps) {
  const label = target ? `${target.kind === 'pr' ? 'PR' : 'Issue'} #${target.number}` : '';
  return (
    <Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 overflow-y-auto sm:max-w-xl"
        // The sheet itself takes focus, not its first button (often a destructive one).
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {found ? (
          <CardBody repo={repo} card={found.card} column={found.column} agents={agents} />
        ) : (
          <Gone repo={repo} target={target} label={label} />
        )}
      </SheetContent>
    </Sheet>
  );
}

/** A ?card= that isn't on the board: a PR closed without merging points to its issues, back in the backlog. */
function Gone({ repo, target, label }: { repo: RepoView; target: BoardCard | null; label: string }) {
  // Closed PRs leave repo.pulls; the issue they closed waits as held, which remembers the PR.
  const held = target?.kind === 'pr' ? (repo.held ?? []).filter((h) => h.pr === target.number).map((h) => h.issue) : [];
  return (
    <SheetHeader>
      <SheetTitle>{label}</SheetTitle>
      <SheetDescription>{held.length ? 'It was closed without merging.' : "That card isn't on the board: it may be closed, or the office hasn't synced it yet."}</SheetDescription>
      {held.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {held.map((n) => (
            <Button key={n} variant="outline" size="sm" asChild>
              <Link to={links.board(repo.id, { kind: 'issue', number: n })}>Open issue #{n}</Link>
            </Button>
          ))}
        </div>
      )}
    </SheetHeader>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="grid gap-2 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CardBody({ repo, card, column, agents }: { repo: RepoView; card: KanbanCard; column: ColumnKey; agents: Agent[] }) {
  const { pull, issue, labels, waits, since } = cardDetail(card, column, repo);
  const open = new Set(repo.issues.map((i) => i.number));
  const waiters = issue ? repo.issues.filter((i) => blockers(i.body, open).includes(issue.number)).map((i) => i.number) : [];
  const isPr = card.prNumber != null;
  // A merged PR that never went through the office's QA has nothing to say there.
  const showQa = isPr && (!!card.qa || column !== 'merged');
  const backlog = column === 'backlog' && issue ? backlogState(issue, repo).state : undefined;
  const note = shownNote(card, column, backlog);
  const columnTitle = COLUMNS.find((c) => c.key === column)?.title ?? '';
  const url = card.url ?? pull?.url ?? issue?.url;
  const chip = (n: number) => (
    <Link key={n} to={links.board(repo.id, { kind: 'issue', number: n })} className="rounded-sm border px-1.5 py-0.5 font-mono text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      #{n}
    </Link>
  );
  return (
    <>
      <SheetHeader className="gap-2 pr-12">
        <p className="font-mono text-xs text-muted-foreground">{isPr ? `PR #${card.number}` : `Issue #${card.number}`}</p>
        <SheetTitle className="text-lg leading-snug">{card.title}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{columnTitle}</Badge>
            {backlog && <ToneBadge tone={BACKLOG_LOOK[backlog].tone} label={BACKLOG_LOOK[backlog].label} />}
            {note && <ToneBadge tone={noteTone(card.tone)} label={note} />}
            {labels.map((l) => (
              <Badge key={l} variant="secondary" className="font-normal">
                {l}
              </Badge>
            ))}
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-3 px-4 pb-4">
        <WhoHasIt card={card} column={column} since={since} />
        {backlog === 'untrusted' && (
          <Notice title={`Filed by @${issue?.author || 'someone unknown'}, who isn't a trusted author`}>
            <p>
              Agents only start it when you assign it. Read it first: its description becomes an agent's instructions. To let it start on its own, label it{' '}
              <code className="font-mono">{APPROVED_LABEL}</code> on GitHub yourself (the label counts only when you or a trusted author added it), or add its author under
              Settings → Trusted issue authors.
            </p>
          </Notice>
        )}
        {waits.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Hourglass className="size-4" aria-hidden /> Waits for {waits.map(chip)}
          </div>
        )}
        {waiters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Link2 className="size-4" aria-hidden /> {waiters.map(chip)} {waiters.length === 1 ? 'waits' : 'wait'} for this
          </div>
        )}
        <CardActions repo={repo} card={card} column={column} agents={agents} waits={waits} />
      </div>
      <Separator />

      {showQa && <QaSection repo={repo} card={card} qa={card.qa} />}
      {pull && column !== 'merged' && (
        <>
          <Separator />
          <ChecksSection pull={pull} />
        </>
      )}
      {(issue || !isPr) && (
        <>
          {showQa && <Separator />}
          <Section title={isPr && issue ? `Closes #${issue.number}: ${issue.title}` : 'Description'}>
            {issue?.body?.trim() ? <Markdown text={issue.body} /> : <p className="text-sm text-muted-foreground">{issue ? 'The issue has no description.' : 'The issue is no longer open.'}</p>}
          </Section>
        </>
      )}
      <Separator />
      <div className="flex flex-wrap gap-2 px-4 py-4">
        {url && (
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden /> Open on GitHub
            </a>
          </Button>
        )}
        {issue && isPr && (
          <Button variant="outline" size="sm" asChild>
            <a href={issue.url} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden /> Issue #{issue.number}
            </a>
          </Button>
        )}
        {isPr && pull?.state === 'OPEN' && (
          <Button variant="outline" size="sm" asChild>
            <Link to={links.app(repo.id, { pr: card.prNumber })}>
              <AppWindow aria-hidden /> Preview
            </Link>
          </Button>
        )}
        {card.agent && (
          <Button variant="outline" size="sm" asChild>
            <Link to={links.agent(card.agent.id)}>
              <SquareTerminal aria-hidden /> {card.agent.name}'s terminal
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}

function WhoHasIt({ card, column, since }: { card: KanbanCard; column: ColumnKey; since: number | null }) {
  const a = card.agent;
  const at = since ? <RelativeTime at={since} /> : null;
  let text: ReactNode;
  if (column === 'backlog') text = <>Nobody has it yet{at && <> · filed {at}</>}</>;
  else if (column === 'building') text = <>{a ? `${a.name} is building it` : 'Someone has it'}{at && <> · started {at}</>}</>;
  else if (column === 'merged') text = <>Merged {at}{a && ` · written by ${a.name}`}</>;
  else if (card.qa?.status === 'testing') text = <>{a?.name ?? 'QA'} is testing it · round {card.qa.round} · since <RelativeTime at={card.qa.updatedAt} /></>;
  else if (card.qa?.status === 'fixing') text = <>{a?.name ?? 'An agent'} is fixing it · since <RelativeTime at={card.qa.updatedAt} /></>;
  else text = <>{a ? `${a.name} wrote it` : 'Opened outside the office'}{at && <> · opened {at}</>}</>;
  return (
    <div className="flex items-center gap-2 text-sm">
      {a && (
        <Link to={links.agent(a.id)} className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`${a.name}'s page`}>
          <AgentAvatar agent={a} />
        </Link>
      )}
      <span className="text-muted-foreground">{text}</span>
      {a && column === 'building' && <StatusBadge kind="agent" status={a.status} className="ml-auto" />}
    </div>
  );
}

function QaSection({ repo, card, qa }: { repo: RepoView; card: KanbanCard; qa?: QaView }) {
  return (
    <Section
      title={qa ? `QA · round ${qa.round}` : 'QA'}
      action={
        qa?.commentUrl ? (
          <a href={qa.commentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline">
            Report comment <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : undefined
      }
    >
      {!qa && <p className="text-sm text-muted-foreground">Not sent to QA yet.</p>}
      {qa && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="qa" status={qa.status} />
          <span className="text-xs text-muted-foreground">
            updated <RelativeTime at={qa.updatedAt} />
          </span>
        </div>
      )}
      {qa?.ceoLooking && (
        <Notice>
          <span className="inline-flex items-center gap-1.5">
            <Compass className="size-4" aria-hidden /> The CEO is looking at it before it comes to you.
          </span>
        </Notice>
      )}
      {qa?.mergeNote && <Notice title="Merge">{qa.mergeNote}</Notice>}
      {qa?.summary && <Markdown text={qa.summary} />}
      {qa && !qa.summary && <p className="text-sm text-muted-foreground">No report yet{qa.status === 'testing' ? ': the test is running' : ''}.</p>}
      {qa && qa.checks.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check</TableHead>
                <TableHead className="w-24">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qa.checks.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{c.name}</span>
                    {c.details && <p className="text-xs text-muted-foreground">{c.details}</p>}
                  </TableCell>
                  <TableCell className="align-top">
                    <ToneBadge tone={RESULT[c.result]?.tone ?? 'neutral'} label={RESULT[c.result]?.label ?? c.result} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {qa?.shots && qa.shots.length > 0 && card.prNumber != null && <QaShots repoId={repo.id} pr={card.prNumber} shots={qa.shots} version={qa.updatedAt} />}
    </Section>
  );
}

function ChecksSection({ pull }: { pull: PullInfo }) {
  return (
    <Section title="GitHub">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge kind="checks" status={pull.checks} />
        {pull.mergeable === 'CONFLICTING' && <ToneBadge tone="danger" label="Conflicts with the base branch" />}
        {pull.isDraft && <ToneBadge tone="neutral" label="Draft" />}
        <LineCounts pull={pull} className="ml-auto" />
      </div>
      {pull.failedChecks.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {pull.failedChecks.map((c) => (
            <li key={c.name} className="flex items-center gap-2">
              <ChecksIcon checks="failing" />
              {c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                  {c.name}
                </a>
              ) : (
                c.name
              )}
            </li>
          ))}
        </ul>
      )}
      {pull.pendingChecks.length > 0 && (
        <ul className="grid gap-1 text-sm text-muted-foreground">
          {pull.pendingChecks.map((name) => (
            <li key={name} className="flex items-center gap-2">
              <ChecksIcon checks="pending" /> {name}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
