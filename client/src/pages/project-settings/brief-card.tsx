import { Brain, Loader2, RotateCw } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { api } from '@/api';
import { SaveBar } from '@/components/shared/save-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDraft, useSavedFlag } from '@/hooks/use-draft';
import { useStore } from '@/store';
import type { RepoView } from '../../../../shared/types';
import { attempt } from '../projects/actions';

// The brief (what the project should build next, which the CEO turns into issues), and what the CEO wrote about the
// project: its one-line summary and the QA brief every test pass follows. From cubefarm's brief panel.

export function BriefCard({ repo }: { repo: RepoView }) {
  const mission = useDraft(repo.mission);
  const { saved, flash } = useSavedFlag();
  const [busy, setBusy] = useState<'save' | 'plan' | 'onboard' | null>(null);
  const ceo = useStore((s) => s.ceo);
  const id = useId();
  const act = async (kind: 'save' | 'plan' | 'onboard', fn: () => Promise<unknown>) => {
    setBusy(kind);
    const ok = (await attempt(fn)) !== undefined;
    setBusy(null);
    return ok;
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (await act('save', () => api.updateRepo(repo.id, { mission: mission.value }))) {
      mission.set(mission.value.trim());
      flash();
    }
  };
  const plan = async () => {
    if (await act('plan', () => api.planProject(repo.id, mission.value.trim()))) {
      mission.set(mission.value.trim());
      useStore.getState().pushToast('success', 'The CEO will plan it: see the CEO status below.');
    }
  };
  const onboard = async () => {
    if (await act('onboard', () => api.onboardProject(repo.id))) useStore.getState().pushToast('success', `The CEO will study ${repo.fullName} again.`);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Brief</CardTitle>
        <CardDescription>What this project should build next. The CEO turns it into issues and sizes the team.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form className="grid gap-3" onSubmit={save}>
          <Label htmlFor={`${id}-mission`} className="sr-only">
            Brief
          </Label>
          <Textarea
            id={`${id}-mission`}
            value={mission.value}
            onChange={(e) => mission.set(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="e.g. Add a checkout page with card payments, and a thank-you email."
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SaveBar dirty={mission.dirty} busy={busy === 'save'} saved={saved} onUndo={mission.reset} label="Save brief" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={!!busy} onClick={() => void onboard()}>
                {busy === 'onboard' ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
                Onboard
              </Button>
              <Button type="button" disabled={!!busy || !mission.value.trim()} onClick={() => void plan()}>
                {busy === 'plan' ? <Loader2 className="animate-spin" aria-hidden /> : <Brain aria-hidden />}
                Ask the CEO to plan
              </Button>
            </div>
          </div>
        </form>
        <div role="status" className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">CEO status</p>
          {ceo.job ? <p className="text-muted-foreground">Working on: {ceo.job.label}</p> : <p className="text-muted-foreground">Not working on anything right now.</p>}
          {ceo.queue.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {ceo.queue.map((j, i) => (
                <li key={`${j.kind}-${i}`}>Queued: {j.label}</li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Onboard has the CEO study the repository again and rethink its profile, QA brief and team size.</p>
      </CardContent>
    </Card>
  );
}

export function ProfileCard({ repo }: { repo: RepoView }) {
  const summary = useDraft(repo.summary);
  const qaBrief = useDraft(repo.qaBrief);
  const { saved, flash } = useSavedFlag();
  const [busy, setBusy] = useState(false);
  const id = useId();
  const dirty = summary.dirty || qaBrief.dirty;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = (await attempt(() => api.updateRepo(repo.id, { summary: summary.value, qaBrief: qaBrief.value }))) !== undefined;
    setBusy(false);
    if (ok) {
      summary.set(summary.value.trim());
      qaBrief.set(qaBrief.value.trim());
      flash();
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Written by the CEO when they study the project. Edit either to correct them.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={save}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-summary`}>Summary</Label>
            <Input
              id={`${id}-summary`}
              value={summary.value}
              onChange={(e) => summary.set(e.target.value)}
              maxLength={140}
              placeholder="e.g. Booking site · Next.js + Postgres"
              aria-describedby={`${id}-summary-hint`}
            />
            <p id={`${id}-summary-hint`} className="text-xs text-muted-foreground">
              One line, at most 140 characters ({summary.value.length}/140).
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-qa`}>QA brief</Label>
            <Textarea
              id={`${id}-qa`}
              value={qaBrief.value}
              onChange={(e) => qaBrief.set(e.target.value)}
              rows={6}
              maxLength={2500}
              placeholder="What every QA pass must check on this project."
              aria-describedby={`${id}-qa-hint`}
            />
            <p id={`${id}-qa-hint`} className="text-xs text-muted-foreground">
              How QA tests this kind of project, at most 2,500 characters ({qaBrief.value.length.toLocaleString('en-US')}/2,500).
            </p>
          </div>
          <SaveBar
            dirty={dirty}
            busy={busy}
            saved={saved}
            onUndo={() => {
              summary.reset();
              qaBrief.reset();
            }}
          />
        </form>
      </CardContent>
    </Card>
  );
}
