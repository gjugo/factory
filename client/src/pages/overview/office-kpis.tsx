import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { fmtDuration, fmtPct, fmtUsd } from '@/ops';
import { useStore } from '@/store';
import { sparkPoints, sparkSummary, STAGES } from './overview';
import { DOT } from './pipeline-bar';

// The office's numbers from ops.total: the pipeline right now, merges with the 24 h chart, flow and CI, team and cost.

function Tile({ label, value, hint, tone, href }: { label: string; value: number; hint: string; tone?: string; href?: string }) {
  const body = (
    <>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {tone && <span className={cn('size-1.5 rounded-full', tone)} aria-hidden />}
        {label}
      </dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </>
  );
  const cls = 'flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 shadow-xs';
  return href ? (
    <a href={href} title={hint} className="rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&>dl]:hover:bg-accent">
      <dl className={cls}>{body}</dl>
    </a>
  ) : (
    <dl title={hint} className={cls}>
      {body}
    </dl>
  );
}

export function PipelineKpis() {
  const total = useStore((s) => s.ops.total);
  return (
    <section aria-label="The office's pipeline" className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      {STAGES.map((s) => (
        <Tile key={s.key} label={s.label} value={total[s.key]} hint={s.hint} tone={DOT[s.tone]} href={s.key === 'needsYou' ? '#needs-you' : undefined} />
      ))}
      <Tile label="CEO triage" value={total.triage} hint="Stuck PRs the CEO is looking at before they reach you" />
    </section>
  );
}

const chartConfig = { merges: { label: 'Merges', color: 'var(--info)' } } satisfies ChartConfig;

function MergesCard() {
  const total = useStore((s) => s.ops.total);
  // The hour labels follow the spark, which the server refreshes with every ops event.
  const points = useMemo(() => sparkPoints(total.spark, Date.now()), [total.spark]);
  const summary = sparkSummary(points);
  return (
    <Card className="gap-3 lg:col-span-2">
      <CardHeader>
        <CardTitle>Merges</CardTitle>
        <CardDescription>Pull requests merged, per hour over the last 24 hours</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <dl className="flex shrink-0 gap-6 sm:flex-col sm:gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">Today</dt>
            <dd className="text-3xl font-semibold tabular-nums">{total.mergedToday}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last hour</dt>
            <dd className="text-xl font-semibold tabular-nums">{total.mergedHour}</dd>
          </div>
        </dl>
        <figure className="min-w-0 flex-1">
          <div aria-hidden>
            <ChartContainer config={chartConfig} className="aspect-auto h-32 w-full">
              <BarChart data={points} margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} interval={5} tickMargin={6} />
                <YAxis hide allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="merges" fill="var(--color-merges)" radius={3} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </div>
          <figcaption className="sr-only">{summary}</figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, sub, hint, tone }: { label: string; value: string; sub?: string; hint?: string; tone?: string }) {
  return (
    <div title={hint}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-lg font-semibold tabular-nums', tone)}>{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

function FlowCard() {
  const n = useStore((s) => s.ops.total);
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Flow</CardTitle>
        <CardDescription>Medians over 24 hours; pass rates over 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          <Stat label="Lead time" value={fmtDuration(n.leadMs)} sub="issue → merge" hint="Median issue → merge over the last 24 hours" />
          <Stat label="QA wait" value={fmtDuration(n.qaWaitMs)} sub="for a free agent" hint="Median wait for an agent to start testing a PR, last 24 hours" />
          <Stat label="QA pass" value={fmtPct(n.qaPass)} sub="7 days" hint="Share of QA rounds that passed over 7 days" />
          <Stat
            label="CI pass"
            value={n.ciRuns ? fmtPct(n.ciPass) : '—'}
            sub={n.ciRuns ? `median ${fmtDuration(n.ciMs)} · ${n.ciRuns} run${n.ciRuns === 1 ? '' : 's'}` : 'no runs in 7 days'}
            hint="GitHub's checks over 7 days: pass rate and median duration"
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function TeamCostCard() {
  const n = useStore((s) => s.ops.total);
  const ceoCost = useStore((s) => s.ops.ceoCostToday);
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Team and cost</CardTitle>
        <CardDescription>Right now, and since midnight</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-4">
          <Stat label="Busy" value={String(n.busy)} />
          <Stat label="Idle" value={String(n.idle)} />
          <Stat label="Errors" value={String(n.errors)} tone={n.errors ? 'text-destructive' : undefined} />
          <div className="col-span-3 grid grid-cols-2 gap-4 border-t pt-3">
            <Stat label="Cost today" value={`~${fmtUsd(n.costToday)}`} sub="estimate" hint="An estimate from finished sessions' reported cost" />
            <Stat label="CEO today" value={`~${fmtUsd(ceoCost)}`} sub="estimate, included" hint="The CEO's sessions today, already in the cost today" />
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function OfficeNumbers() {
  return (
    <section aria-label="Throughput, flow and team" className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <MergesCard />
      <FlowCard />
      <TeamCostCard />
    </section>
  );
}
