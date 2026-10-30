import { Check, Factory, Loader2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { links } from '@/lib/links';
import { SETUP_STEPS, setupBody, type SetupDraft } from '@/lib/setup';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { CEO_ID, type SwarmSettings } from '../../../../shared/types';

// /setup, the first run (while settings.setupDone is false): who you are, the company, the CEO's name and how team
// changes are decided, then on to the first project. Every field has a default; Skip keeps the office's own.

export default function SetupPage() {
  const user = useStore((s) => s.user);
  const demo = useStore((s) => s.demo);
  const ghReady = useStore((s) => s.ghReady);
  const ghError = useStore((s) => s.ghError);
  const ceo = useStore((s) => s.agents[CEO_ID]);
  const settings = useStore((s) => s.settings);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<SetupDraft>({ managerName: '', companyName: '', ceoName: '', scaling: 'approve' });
  const set = (patch: Partial<SetupDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const ids = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Each step's heading takes focus, so a screen reader hears where it is.
  useEffect(() => {
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [step]);

  /** Marks setup done and makes the store agree at once, so the gate lets the next page through. */
  const markDone = async () => {
    const next = (await api.updateSettings({ setupDone: true })) as SwarmSettings;
    useStore.setState({ settings: next });
  };
  const finish = async (to: string) => {
    setBusy(true);
    try {
      await api.setup(setupBody(draft, { user, ceo: ceo ? { name: ceo.name, look: ceo.look, color: ceo.color } : null }));
      await markDone();
      navigate(to);
    } catch {
      setBusy(false); // already a toast
    }
  };
  const skip = async () => {
    setBusy(true);
    try {
      await markDone();
      navigate(links.overview());
    } catch {
      setBusy(false);
    }
  };
  const next = (e: FormEvent) => {
    e.preventDefault();
    setStep((s) => Math.min(s + 1, SETUP_STEPS.length - 1));
  };
  const last = step === SETUP_STEPS.length - 1;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 py-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" aria-label="Setup steps">
        {SETUP_STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full border text-[10px] font-medium',
                i < step && 'border-primary bg-primary text-primary-foreground',
                i === step && 'border-primary text-primary',
                i > step && 'text-muted-foreground',
              )}
              aria-hidden
            >
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={cn(i === step ? 'font-medium' : 'text-muted-foreground', i !== step && 'hidden sm:inline')}>{label}</span>
            {i < SETUP_STEPS.length - 1 && <span className="hidden h-px w-4 bg-border sm:block" aria-hidden />}
          </li>
        ))}
      </ol>
      <Card>
        <form onSubmit={next} noValidate>
          <CardHeader>
            {step === 0 && (
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
                <Factory className="size-5 text-muted-foreground" aria-hidden />
              </div>
            )}
            <CardTitle>
              <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
                {['Welcome to factory', "Who's running the company?", 'Your CEO', 'Team changes', 'All set'][step]}
              </h1>
            </CardTitle>
            <CardDescription>
              {
                [
                  'A team of AI coding agents working through your GitHub issues, run by a CEO agent. A few questions and you are ready.',
                  'That is you. You run the company; the agents do the typing.',
                  'The CEO studies each project, plans the work you ask for and sizes each team.',
                  'When the CEO wants to grow or shrink a team:',
                  'Add a project and the CEO studies it, then a team starts on its issues.',
                ][step]
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 py-2">
            {step === 0 && (
              <>
                {!ghReady && <Notice tone="danger" title="GitHub isn't ready">{ghError ?? 'The office could not reach GitHub.'}</Notice>}
                {demo && <Notice>Demo mode: GitHub and the agents are simulated, nothing is spent.</Notice>}
              </>
            )}
            {step === 1 && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={`${ids}-me`}>Your name</Label>
                  <Input id={`${ids}-me`} value={draft.managerName} onChange={(e) => set({ managerName: e.target.value })} placeholder={user ?? 'Boss'} maxLength={40} autoComplete="name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${ids}-company`}>Company name</Label>
                  <Input id={`${ids}-company`} value={draft.companyName} onChange={(e) => set({ companyName: e.target.value })} placeholder={settings.companyName || 'factory'} maxLength={60} autoComplete="organization" />
                </div>
                <p className="text-xs text-muted-foreground">Change either any time in Settings.</p>
              </>
            )}
            {step === 2 && (
              <div className="grid gap-2">
                <Label htmlFor={`${ids}-ceo`}>CEO's name</Label>
                <Input id={`${ids}-ceo`} value={draft.ceoName} onChange={(e) => set({ ceoName: e.target.value })} placeholder={ceo?.name ?? 'Morgan'} maxLength={40} />
              </div>
            )}
            {step === 3 && (
              <RadioGroup value={draft.scaling} onValueChange={(v) => set({ scaling: v as SetupDraft['scaling'] })} aria-label="Team changes from the CEO" className="grid gap-2">
                {(
                  [
                    ['approve', 'I approve each one', 'Recommended. New agents and let-gos wait for you under Needs you.'],
                    ['auto', 'Apply straight away', 'Up to the most agents per project. Idle agents leave first.'],
                  ] as const
                ).map(([value, title, text]) => (
                  <Label
                    key={value}
                    htmlFor={`${ids}-${value}`}
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/40"
                  >
                    <RadioGroupItem value={value} id={`${ids}-${value}`} className="mt-0.5" />
                    <span className="grid gap-1">
                      <span className="font-medium">{title}</span>
                      <span className="text-xs text-muted-foreground">{text}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )}
            {last && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {Object.entries({
                  You: draft.managerName.trim() || user || 'Boss',
                  Company: draft.companyName.trim() || 'factory',
                  CEO: draft.ceoName.trim() || ceo?.name || 'Morgan',
                  'Team changes': draft.scaling === 'approve' ? 'You approve each one' : 'Applied straight away',
                }).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 pt-4">
            {step === 0 ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void skip()}>
                Skip setup
              </Button>
            ) : (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {last ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => void finish(links.overview())}>
                  Go to the overview
                </Button>
                <Button type="button" disabled={busy} onClick={() => void finish(links.addProject())}>
                  {busy && <Loader2 className="animate-spin" aria-hidden />}
                  Add your first project
                </Button>
              </div>
            ) : (
              <Button type="submit">{step === 0 ? "Let's set up" : 'Next'}</Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
