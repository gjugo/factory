import { ChevronLeft, ChevronRight, ExternalLink, KanbanSquare } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Markdown } from '@/components/shared/markdown';
import { RelativeTime } from '@/components/shared/relative-time';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { qaShotUrl } from '@/lib/channels';
import { links } from '@/lib/links';
import { cn } from '@/lib/utils';
import type { PullInfo, QaCheck, QaView, RepoView } from '../../../../shared/types';

// The PR beside its app: GitHub's checks, and QA's latest round (status, summary, checks, merge note, report and
// screenshots, which open in a lightbox).

const CHECK_TONE: Record<QaCheck['result'], string> = { pass: 'text-success', fail: 'text-destructive', skip: 'text-muted-foreground' };
const CHECK_LABEL: Record<QaCheck['result'], string> = { pass: 'Pass', fail: 'Fail', skip: 'Skipped' };

export function QaPanel({ repo, pull, qa, className }: { repo: RepoView; pull: PullInfo; qa?: QaView; className?: string }) {
  const shots = qa?.shots ?? [];
  const [shot, setShot] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  return (
    <Card className={cn('gap-4 py-4', className)} aria-label={`PR #${pull.number}: checks and QA`} role="complementary">
      <CardHeader className="px-4">
        <CardTitle className="text-base leading-snug">
          <a href={pull.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
            PR #{pull.number}
            <ExternalLink className="ml-1 inline size-3.5 align-baseline" aria-label="(opens GitHub)" />
          </a>{' '}
          <span className="font-normal">{pull.title}</span>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            <span className="text-success">+{pull.additions}</span> <span className="text-destructive">−{pull.deletions}</span>
          </span>
          <a href={`${pull.url}/checks`} target="_blank" rel="noreferrer" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <StatusBadge kind="checks" status={pull.checks} />
          </a>
          {pull.isDraft && <span>Draft</span>}
          <span>
            opened <RelativeTime at={pull.createdAt} />
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-4 text-sm">
        {pull.failedChecks.length > 0 && (
          <ul className="grid gap-1 text-xs">
            {pull.failedChecks.map((c) => (
              <li key={c.name} className="text-destructive">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    {c.name} failed
                  </a>
                ) : (
                  `${c.name} failed`
                )}
              </li>
            ))}
          </ul>
        )}
        {qa ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="qa" status={qa.status} />
              <span className="text-xs text-muted-foreground">Round {qa.round}</span>
              <span className="text-xs text-muted-foreground">
                · <RelativeTime at={qa.updatedAt} />
              </span>
            </div>
            {qa.mergeNote && <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{qa.mergeNote}</p>}
            {qa.summary ? (
              <Markdown className="text-sm" text={qa.summary} />
            ) : (
              <p className="text-muted-foreground">{qa.status === 'testing' ? 'QA is testing it now.' : 'No QA report yet.'}</p>
            )}
            {qa.checks.length > 0 && (
              <ul className="grid gap-2" aria-label="QA checks">
                {qa.checks.map((c, i) => (
                  <li key={i} className="grid gap-0.5">
                    <span className="flex items-baseline gap-2">
                      <span className={cn('shrink-0 text-xs font-medium', CHECK_TONE[c.result])}>{CHECK_LABEL[c.result]}</span>
                      <span className="font-medium">{c.name}</span>
                    </span>
                    {c.details && <span className="text-xs text-muted-foreground">{c.details}</span>}
                  </li>
                ))}
              </ul>
            )}
            {shots.length > 0 && (
              <div className="grid grid-cols-2 gap-2" aria-label="QA screenshots" role="group">
                {shots.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      opener.current = e.currentTarget;
                      setShot(i);
                    }}
                    className="group grid gap-1 rounded-md border p-1 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    aria-label={`Screenshot ${i + 1}: ${s.caption}`}
                  >
                    <img src={qaShotUrl(repo.id, pull.number, i, qa.updatedAt)} alt="" loading="lazy" className="aspect-video w-full rounded-sm object-cover object-top" />
                    <span className="line-clamp-2 text-xs text-muted-foreground">{s.caption}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">QA hasn't tested this PR yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={links.board(repo.id, { kind: 'pr', number: pull.number })}>
              <KanbanSquare aria-hidden /> Board card
            </Link>
          </Button>
          {qa?.commentUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={qa.commentUrl} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden /> Full report
              </a>
            </Button>
          )}
        </div>
      </CardContent>
      {qa && shots.length > 0 && <Lightbox repo={repo} pull={pull} qa={qa} index={shot} onIndex={setShot} onClosed={() => opener.current?.focus()} />}
    </Card>
  );
}

/** QA's screenshots, one at a time, with ← → between them. Closing returns focus to the thumbnail that opened it. */
function Lightbox({
  repo,
  pull,
  qa,
  index,
  onIndex,
  onClosed,
}: {
  repo: RepoView;
  pull: PullInfo;
  qa: QaView;
  index: number | null;
  onIndex: (i: number | null) => void;
  onClosed: () => void;
}) {
  const shots = qa.shots ?? [];
  const i = index ?? 0;
  const s = shots[i];
  const go = (d: number) => onIndex((i + d + shots.length) % shots.length);
  return (
    <Dialog open={index != null && !!s} onOpenChange={(open) => !open && onIndex(null)}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-5xl"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onClosed();
        }}
        onKeyDown={(e) => {
          if (shots.length < 2) return;
          if (e.key === 'ArrowRight') go(1);
          else if (e.key === 'ArrowLeft') go(-1);
        }}
      >
        <div className="grid gap-1 pr-8">
          <DialogTitle className="text-base">{s?.caption}</DialogTitle>
          <DialogDescription>
            PR #{pull.number}, QA round {qa.round} · screenshot {i + 1} of {shots.length}
            {s?.page ? ` · ${s.page}` : ''}
          </DialogDescription>
        </div>
        {s && <img src={qaShotUrl(repo.id, pull.number, i, qa.updatedAt)} alt={s.caption} className="mx-auto max-h-full min-h-0 w-auto max-w-full rounded-md border object-contain" />}
        {shots.length > 1 && (
          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => go(-1)}>
              <ChevronLeft aria-hidden /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => go(1)}>
              Next <ChevronRight aria-hidden />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
