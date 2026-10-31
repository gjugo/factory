import { useEffect, useState } from 'react';
import { Globe, Image as ImageIcon } from 'lucide-react';
import type { AgentPromptView } from '../../../../shared/types';
import { avgFixRounds, knownFor, mergesThisWeek, passRate, rank, tenureDays } from '../../../../shared/careers';
import { EmptyState } from '@/components/shared/empty-state';
import { RelativeTime } from '@/components/shared/relative-time';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/api';
import { costLabel } from '@/lib/agents';
import { useStore, type Agent } from '@/store';

// An agent page's read-only tabs: what they're told (Prompt), their browser's latest screenshot (Screen) and their
// record on the team (Record).

/** GET /api/agents/:id/prompt, fetched when the tab opens and when their name changes. */
export function PromptTab({ agent }: { agent: Agent }) {
  const [prompt, setPrompt] = useState<AgentPromptView | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    api.agentPrompt(agent.id).then(
      (p) => live && (setPrompt(p), setFailed(false)),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [agent.id, agent.name]);
  if (failed && !prompt) return <EmptyState title="Couldn't load their prompt" description="The office didn't answer. Try the tab again in a moment." />;
  if (!prompt) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {prompt.kind === 'ceo'
          ? "The CEO's instructions for every job."
          : "The office's workflow and safety rules for each kind of task, sent with every session. <placeholders> are filled in per task."}
      </p>
      {prompt.parts.map((p) => (
        <section key={p.label} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {p.label} <span className="font-normal text-muted-foreground">· {p.text.length.toLocaleString()} characters</span>
          </h3>
          <pre tabIndex={0} aria-label={`${agent.name}'s prompt: ${p.label}`} className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {p.text}
          </pre>
        </section>
      ))}
    </div>
  );
}

/** The latest Playwright screenshot from their browser; `screen` events bring a new one in. */
export function ScreenTab({ agent }: { agent: Agent }) {
  const at = useStore((s) => s.screens[agent.id]) ?? agent.screenshotAt;
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [at]);
  if (!agent.hasScreenshot || !at || broken) {
    return <EmptyState icon={ImageIcon} title="No screenshot yet" description="When they test in a browser, its latest screen shows here." />;
  }
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <Globe className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate font-mono">{agent.browserUrl ?? 'about:blank'}</span>
      </div>
      <img src={`/api/agents/${encodeURIComponent(agent.id)}/screen?t=${at}`} alt={`${agent.name}'s browser, latest screenshot`} className="max-h-[70vh] w-full rounded-md border object-contain object-top" onError={() => setBroken(true)} />
      <figcaption className="text-xs text-muted-foreground">
        Taken <RelativeTime at={at} />
      </figcaption>
    </figure>
  );
}

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex flex-col-reverse rounded-md border p-3" title={hint}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Their career: rank, what they're known for, the numbers, and their last merged PRs. */
export function RecordTab({ agent }: { agent: Agent }) {
  const repo = useStore((s) => s.repos.find((r) => r.id === agent.repoId));
  const c = agent.career;
  if (!c) return <EmptyState title={agent.role === 'ceo' ? `${agent.name} runs the company` : 'No record yet'} description={agent.role === 'ceo' ? 'Their record is the whole office.' : 'It starts with their first task.'} />;
  const now = Date.now();
  const days = tenureDays(c, now);
  const fix = avgFixRounds(c);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-medium">{rank(c)}</p>
        <p className="text-sm text-muted-foreground">“{knownFor(c)}”</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="PRs merged" value={c.merged} />
        <Stat label="PRs opened" value={c.opened} />
        <Stat label="First-time QA passes" value={c.firstPass} hint="PRs that passed QA on their first round" />
        <Stat label="QA pass rate" value={pct(passRate(c))} hint={`${c.qaPass} of ${c.qaPass + c.qaFail} QA rounds on their PRs passed`} />
        <Stat label="Fix rounds per PR" value={fix === null ? '—' : fix.toFixed(1)} />
        <Stat label="QA reviews" value={c.reviews} />
        <Stat label="Longest streak" value={c.best} hint="PRs in a row that passed QA first time" />
        <Stat label="Merged this week" value={mergesThisWeek(c, now)} />
        <Stat label="Days on the team" value={days < 1 ? '<1' : Math.floor(days)} />
        <Stat label="Est. cost · turns" value={`${costLabel(c.costUsd)} · ${c.turns}`} hint="What the coding agents report, API-equivalent" />
      </dl>
      {c.recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Last merged</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {c.recent.map((r) => (
              <li key={r.n} className="flex min-w-0 items-baseline gap-2">
                {repo?.url ? (
                  <a href={`${repo.url}/pull/${r.n}`} target="_blank" rel="noreferrer" className="shrink-0 font-medium hover:underline">
                    #{r.n}
                  </a>
                ) : (
                  <span className="shrink-0 font-medium">#{r.n}</span>
                )}
                <span className="truncate">{r.title || 'untitled'}</span>
                <RelativeTime at={r.at} className="ml-auto shrink-0 text-xs text-muted-foreground" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
