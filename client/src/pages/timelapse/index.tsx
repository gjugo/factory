import { CircleAlert, CirclePlus, FlaskConical, GitMerge, History, Play } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/api';
import { marksBetween, replayDay, setReplaySpeed, startReplay, usePresence, useReplay } from '@/replay';
import { sinceLastHere, SPEEDS } from '@/replayClock';
import { useStore } from '@/store';
import { dayKey, type JournalDayView } from '../../../../shared/journal';
import { agoText, dayLabel, hhmm, markCounts, sizeText, spanText, speedNote } from './timelapse';
import { MARK_BG, TimelineMarks } from './timeline-marks';

// /timelapse: replay a recorded day of the office, or what happened while you were away, on every page of the
// dashboard (replay.ts; the bar is components/shell/replay-bar.tsx). cubefarm's console tab of the same name.

const DAY_MS = 24 * 60 * 60_000;

function dayName(d: JournalDayView, now: number) {
  if (d.day === dayKey(now)) return 'Today';
  if (d.day === dayKey(now - DAY_MS)) return 'Yesterday';
  return dayLabel(d.from);
}

/** A moment as its time, with the day when it isn't today. */
const when = (t: number, now: number) => (dayKey(t) === dayKey(now) ? hhmm(t) : `${dayLabel(t)}, ${hhmm(t)}`);

function Count({ kind, n, label, icon: Icon }: { kind: keyof typeof MARK_BG; n: number; label: string; icon: typeof GitMerge }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className={`size-2 rounded-full ${MARK_BG[kind]}`} aria-hidden />
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      {n} {label}
    </span>
  );
}

function DayRow({ day, speed, now }: { day: JournalDayView; speed: number; now: number }) {
  const c = markCounts(day.marks);
  const name = dayName(day, now);
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium">
            {name}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {hhmm(day.from)}–{hhmm(day.to)} · {spanText(day.to - day.from)} · {sizeText(day.bytes)}
            </span>
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Count kind="merge" n={c.merge} label="merged" icon={GitMerge} />
            <Count kind="needs-human" n={c['needs-human']} label="needed you" icon={CircleAlert} />
            <Count kind="issue" n={c.issue} label={c.issue === 1 ? 'new issue' : 'new issues'} icon={CirclePlus} />
          </p>
        </div>
        <Button size="sm" onClick={() => void replayDay(day, speed)} aria-label={`Replay ${name}`}>
          <Play aria-hidden /> Replay
        </Button>
      </div>
      <svg className="h-3 w-full overflow-visible" aria-hidden>
        <rect x="0" y="5" width="100%" height="2" rx="1" className="fill-muted" />
        <TimelineMarks marks={day.marks} from={day.from} to={day.to} r={3} />
      </svg>
    </li>
  );
}

export default function TimelapsePage() {
  const demo = useStore((s) => s.demo);
  const replaying = useStore((s) => s.replaying);
  const speed = useReplay((s) => s.speed);
  const presence = usePresence();
  const [days, setDays] = useState<JournalDayView[] | null>(null);
  const [making, setMaking] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    () =>
      api
        .journalDays()
        .then(setDays)
        .catch(() => setDays([])),
    [],
  );
  useEffect(() => {
    void load();
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const recorded = days?.length ? { from: days[0].from, to: days[days.length - 1].to } : null;
  const away = sinceLastHere(presence, recorded);
  const sample = () => {
    setMaking(true);
    void api
      .journalSample()
      .then(load)
      .catch(() => undefined)
      .finally(() => setMaking(false));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Time-lapse" description="Watch a recorded day of the office again, or what happened while you were away. Every page shows the past as it was: the boards, mission control, the agents." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Since I was last here</CardTitle>
              <CardDescription>
                {away
                  ? `You were away from ${when(away.from, now)} to ${when(away.to, now)}: ${spanText(away.to - away.from)}, which started ${agoText(now - away.from)}.`
                  : 'Nothing to catch up on yet. Once this browser has been away for 10 minutes or more, what happened meanwhile shows up here.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled={!away} onClick={() => away && void startReplay({ ...away, label: 'since you were last here', speed, marks: days ? marksBetween(days, away.from, away.to) : undefined })}>
                <Play aria-hidden /> Catch up
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recorded days</CardTitle>
              <CardDescription>The office keeps a journal of the last 7 days (about 200 MB at most). Terminal output, settings and keys are never written to it.</CardDescription>
            </CardHeader>
            <CardContent>
              {days === null ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading the journal">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : days.length === 0 ? (
                <EmptyState icon={History} title="Nothing recorded yet" description="The office keeps a journal from now on: come back later to replay it." />
              ) : (
                <ul className="divide-y">
                  {[...days].reverse().map((d) => (
                    <DayRow key={d.day} day={d} speed={speed} now={now} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Speed</CardTitle>
              <CardDescription>You can change it while it plays, too.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={String(speed)} onValueChange={(s) => setReplaySpeed(Number(s))} aria-label="Replay speed" data-replay-ok>
                {SPEEDS.map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <RadioGroupItem value={String(s)} id={`speed-${s}`} />
                    <Label htmlFor={`speed-${s}`} className="font-normal">
                      <span className="font-medium tabular-nums">{s}×</span>
                      <span className="text-muted-foreground">{speedNote(s)}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>While it plays</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Every page shows the recorded moment: move around to watch a board, mission control or an agent. Nothing can be changed meanwhile: assigning, merging,
                messaging and settings wait until you're back.
              </p>
              <p>
                Drag along the timeline or use the arrow keys to jump. Its dots are merges, PRs that needed you and new issues. <kbd className="rounded border bg-muted px-1 font-mono text-xs">Esc</kbd> goes straight back
                to the live office.
              </p>
              {demo && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-muted-foreground">Demo office: write a made-up working day on these projects as yesterday's journal.</p>
                  <Button variant="outline" size="sm" disabled={making || replaying} onClick={sample}>
                    <FlaskConical aria-hidden /> {making ? 'Writing…' : 'Write a sample day'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
