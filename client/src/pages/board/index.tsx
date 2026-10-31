import { ExternalLink, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { api } from '@/api';
import { EmptyState } from '@/components/shared/empty-state';
import { Notice } from '@/components/shared/notice';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectNav } from '@/components/shared/project-nav';
import { RelativeTime } from '@/components/shared/relative-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projectName } from '@/hooks/use-project-rows';
import { cardParam, links, parseCard, repoIdFrom } from '@/lib/links';
import { cn } from '@/lib/utils';
import { agentsOnRepo, kanbanFor, useStore, type KanbanCard } from '@/store';
import type { RepoView } from '../../../../shared/types';
import { attempt } from '../projects/actions';
import { backlogState, boardColumns, cardDetail, cardDomKey, cardRef, COLUMNS, filterColumns, findCard, NO_FILTER, repoLabels, type BoardFilter, type ColumnKey } from './board';
import { BoardCardView } from './board-card';
import { CardSheet } from './card-sheet';
import { NewIssueDialog } from './new-issue-dialog';

// /projects/:owner/:name: the project's Kanban board, cubefarm's KanbanView as columns (tabs on a phone). The office
// moves the cards; the manager opens one (?card=issue-12 / ?card=pr-34, so reload, back and forward keep it) to read
// it and act on it.

export default function BoardPage() {
  const repoId = repoIdFrom(useParams());
  const loaded = useStore((s) => s.loaded);
  const repo = useStore((s) => s.repos.find((r) => r.id === repoId));
  if (!loaded) return <Skeleton className="h-64" />;
  if (!repo) {
    return (
      <EmptyState
        title="Project not found"
        description={`${repoId ?? 'This project'} isn't connected to the office.`}
        action={
          <Button asChild variant="outline">
            <Link to={links.projects()}>All projects</Link>
          </Button>
        }
      />
    );
  }
  return <Board repo={repo} />;
}

function Board({ repo }: { repo: RepoView }) {
  const allAgents = useStore((s) => s.agents);
  const qa = useStore((s) => s.qa);
  const usageState = useStore((s) => s.usage.state);
  const agents = useMemo(() => agentsOnRepo(allAgents, repo.id), [allAgents, repo.id]);
  const board = useMemo(() => boardColumns(kanbanFor(repo, agents, qa, { state: usageState }), repo.pulls), [repo, agents, qa, usageState]);
  const [filter, setFilter] = useState<BoardFilter>(NO_FILTER);
  const shown = useMemo(() => filterColumns(board, repo, filter), [board, repo, filter]);
  const [newIssue, setNewIssue] = useState(false);

  // The open card lives in the URL: opening pushes a history entry, so back closes it and forward reopens it.
  const [params, setParams] = useSearchParams();
  const target = parseCard(params.get('card'));
  const found = target ? findCard(board, target, repo.pulls) : null;
  const setCard = useCallback(
    (card: string | null) =>
      setParams((p) => {
        const next = new URLSearchParams(p);
        if (card) next.set('card', card);
        else next.delete('card');
        return next;
      }),
    [setParams],
  );
  const onOpen = useCallback((card: KanbanCard) => setCard(cardParam(cardRef(card))), [setCard]);
  // Closing returns focus to the card it was opened from (or the card it moved to since).
  const lastCard = useRef<string | null>(null);
  if (found) lastCard.current = cardDomKey(found.card);
  const onCloseAutoFocus = useCallback((e: Event) => {
    // The desktop columns and the phone's tab both hold cards: the visible one.
    const all = lastCard.current ? [...document.querySelectorAll<HTMLElement>(`[data-card="${lastCard.current}"]`)] : [];
    const el = all.find((x) => x.offsetParent !== null);
    if (el) {
      e.preventDefault();
      el.focus();
    }
  }, []);

  // On a phone the columns are tabs: a deep link shows its card's column.
  const [tab, setTab] = useState<ColumnKey>('backlog');
  const foundColumn = found?.column;
  useEffect(() => {
    if (foundColumn) setTab(foundColumn);
  }, [foundColumn]);

  const labels = useMemo(() => repoLabels(repo), [repo]);
  const workers = useMemo(() => agents.filter((a) => a.role !== 'ceo'), [agents]);
  const filtered = (filter.query.trim() !== '' || filter.label !== '' || filter.agentId !== '');

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <PageHeader
        title={projectName(repo)}
        description={repo.summary || repo.description || repo.fullName}
        actions={
          <>
            <Button onClick={() => setNewIssue(true)}>
              <Plus aria-hidden /> New issue
            </Button>
            <ProjectNav repoId={repo.id} />
            <Button variant="outline" size="icon" asChild>
              <a href={repo.url} target="_blank" rel="noreferrer" aria-label={`${repo.fullName} on GitHub`} title={`${repo.fullName} on GitHub`}>
                <ExternalLink aria-hidden />
              </a>
            </Button>
          </>
        }
      />
      <Toolbar repo={repo} filter={filter} onFilter={setFilter} labels={labels} agents={workers} />
      {repo.syncError && (
        <Notice tone="danger" title="Sync failed">
          {repo.syncError}
        </Notice>
      )}
      {filtered && (
        <p className="text-sm text-muted-foreground" role="status">
          Showing {COLUMNS.reduce((n, c) => n + shown[c.key].length, 0)} of {COLUMNS.reduce((n, c) => n + board[c.key].length, 0)} cards.{' '}
          <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => setFilter(NO_FILTER)}>
            Clear filters
          </button>
        </p>
      )}

      {/* Desktop: the columns side by side, each scrolling inside the board. */}
      <div className="hidden min-h-0 gap-2 overflow-x-auto pb-1 md:flex md:h-[max(28rem,calc(100dvh-17rem))]" role="region" aria-label="Board">
        {COLUMNS.map((c) => (
          <section key={c.key} aria-labelledby={`col-${c.key}`} className="flex min-w-52 flex-1 basis-0 flex-col rounded-lg border bg-muted/40">
            <h2 id={`col-${c.key}`} className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm font-semibold">
              {c.title}
              <Badge variant="secondary" className="tabular-nums">
                {shown[c.key].length}
              </Badge>
            </h2>
            <ColumnCards repo={repo} column={c.key} cards={shown[c.key]} empty={filtered ? 'No cards match.' : c.empty} onOpen={onOpen} className="flex-1 overflow-y-auto" />
          </section>
        ))}
      </div>

      {/* Phone: one column at a time. */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ColumnKey)} className="md:hidden">
        <TabsList className="grid w-full grid-cols-3 group-data-[orientation=horizontal]/tabs:h-auto">
          {COLUMNS.map((c) => (
            <TabsTrigger key={c.key} value={c.key} className="h-8 gap-1 px-1 text-xs">
              {c.short}
              <span className="text-muted-foreground tabular-nums">{shown[c.key].length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {COLUMNS.map((c) => (
          <TabsContent key={c.key} value={c.key}>
            <ColumnCards repo={repo} column={c.key} cards={shown[c.key]} empty={filtered ? 'No cards match.' : c.empty} onOpen={onOpen} />
          </TabsContent>
        ))}
      </Tabs>

      <CardSheet repo={repo} target={target} found={found} agents={agents} onClose={() => setCard(null)} onCloseAutoFocus={onCloseAutoFocus} />
      <NewIssueDialog open={newIssue} onOpenChange={setNewIssue} repo={repo} agents={agents} onFiled={(n) => setCard(cardParam({ kind: 'issue', number: n }))} />
    </div>
  );
}

function ColumnCards({ repo, column, cards, empty, onOpen, className }: { repo: RepoView; column: ColumnKey; cards: KanbanCard[]; empty: string; onOpen: (c: KanbanCard) => void; className?: string }) {
  if (cards.length === 0) return <p className={cn('p-3 text-sm text-muted-foreground', className)}>{empty}</p>;
  return (
    <ul className={cn('flex flex-col gap-2 p-2', className)}>
      {cards.map((card) => {
        const issue = column === 'backlog' ? repo.issues.find((i) => i.number === card.number) : undefined;
        return (
          <li key={card.key}>
            <BoardCardView repoId={repo.id} card={card} column={column} detail={cardDetail(card, column, repo)} backlog={issue ? backlogState(issue, repo).state : undefined} onOpen={onOpen} />
          </li>
        );
      })}
    </ul>
  );
}

function Toolbar({ repo, filter, onFilter, labels, agents }: { repo: RepoView; filter: BoardFilter; onFilter: (f: BoardFilter) => void; labels: string[]; agents: { id: string; name: string }[] }) {
  const [syncing, setSyncing] = useState(false);
  const sync = async () => {
    setSyncing(true);
    await attempt(() => api.syncRepo(repo.id));
    setSyncing(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-full sm:basis-56 sm:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={filter.query} onChange={(e) => onFilter({ ...filter, query: e.target.value })} placeholder="Search # or title" aria-label="Search cards by number or title" className="pl-8" />
      </div>
      <Select value={filter.label || 'any'} onValueChange={(v) => onFilter({ ...filter, label: v === 'any' ? '' : v })}>
        <SelectTrigger className="min-w-36 flex-1 sm:w-40 sm:flex-none" aria-label="Filter by label">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">All labels</SelectItem>
          {labels.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filter.agentId || 'any'} onValueChange={(v) => onFilter({ ...filter, agentId: v === 'any' ? '' : v })}>
        <SelectTrigger className="min-w-36 flex-1 sm:w-40 sm:flex-none" aria-label="Filter by agent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">All agents</SelectItem>
          {agents.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="flex-1" />
      <span className="text-xs text-muted-foreground">{repo.lastSync ? <>Synced <RelativeTime at={repo.lastSync} /></> : 'Not synced yet'}</span>
      <Button variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}>
        {syncing ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />} Sync now
      </Button>
    </div>
  );
}
