import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { api } from '@/api';
import { Notice } from '@/components/shared/notice';
import { PageHeader } from '@/components/shared/page-header';
import { SaveBar } from '@/components/shared/save-bar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSavedFlag } from '@/hooks/use-draft';
import { EFFORTS, LIMITS, officeSettingsPatch, officeSettingsSchema, toOfficeForm, type OfficeSettingsForm } from '@/lib/office-settings';
import { useTheme } from '@/lib/theme';
import { useStore } from '@/store';
import { modelSuggestions } from '../../../../shared/models';
import { UI_THEMES, type UiTheme } from '../../../../shared/ui';
import { NotificationSettings } from './notifications-card';
import { EnvironmentCard, OfficeUpdateCard } from './office-info';
import { VoiceSettingsSection } from './voice-settings';

const THEME_LABEL: Record<UiTheme, string> = { light: 'Light', dark: 'Dark', system: 'System' };

/** /settings: how the office runs, saved in the office (SWARM_HOME) for every browser. cubefarm's Settings tab. */
export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="How the office runs. Saved in the office, for every browser." />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <OfficeSettingsCards />
        <div className="grid min-w-0 content-start gap-6">
          <AppearanceCard />
          <OfficeUpdateCard />
          <EnvironmentCard />
        </div>
      </div>
      <NotificationSettings />
      <VoiceSettingsSection />
    </div>
  );
}

function OfficeSettingsCards() {
  const settings = useStore((s) => s.settings);
  const clis = useStore((s) => s.clis);
  const user = useStore((s) => s.user);
  const form = useForm<OfficeSettingsForm>({ resolver: zodResolver(officeSettingsSchema), defaultValues: toOfficeForm(settings), mode: 'onTouched' });
  const { saved, flash } = useSavedFlag();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = form.formState.isDirty;

  // Another tab's save (or the server's own correction) shows here unless this tab is mid-edit.
  useEffect(() => {
    if (!form.formState.isDirty) form.reset(toOfficeForm(settings));
  }, [settings, form]);

  const submit = form.handleSubmit(
    async (values) => {
      const patch = officeSettingsPatch(values, settings);
      setError(null);
      setBusy(true);
      try {
        const next = (await api.updateSettings(patch)) as typeof settings;
        form.reset(toOfficeForm(next ?? settings));
        flash();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    (errors: FieldErrors<OfficeSettingsForm>) => setError(`${Object.keys(errors).length === 1 ? 'One field needs' : `${Object.keys(errors).length} fields need`} fixing before saving.`),
  );

  const cli = form.watch('defaultCli');
  const runtime = form.watch('runtime');
  const modelsId = useId();

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="grid min-w-0 content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>Who runs the office, and where its projects live.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="managerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={user ?? 'Boss'} maxLength={LIMITS.managerName + 10} autoComplete="name" />
                  </FormControl>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="factory" autoComplete="organization" />
                  </FormControl>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectsDir"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Projects folder</FormLabel>
                  <FormControl>
                    <Input {...field} spellCheck={false} className="font-mono" />
                  </FormControl>
                  <FormDescription>New projects are created here, and Add a project lists its folders.</FormDescription>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>What a new agent runs unless they have their own. The CEO always runs Claude Code.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="runtime"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Runtime</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-2">
                      <RadioCard value="terminal" title="Real terminals" text="Each agent is its coding agent CLI in its own terminal, live in the dashboard." />
                      <RadioCard value="sdk" title="Agent SDK" text="Claude Code through the Claude Agent SDK, shown as a log of its steps." />
                    </RadioGroup>
                  </FormControl>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            {runtime === 'terminal' && (
              <FormField
                control={form.control}
                name="defaultCli"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default coding agent</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(clis.length ? clis : [{ id: 'claude' as const, label: 'Claude Code', installed: true }]).map((c) => (
                          <SelectItem key={c.id} value={c.id} disabled={!c.installed}>
                            {c.label}
                            {c.installed ? '' : ' (not installed)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage role="alert" />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="defaultModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default model</FormLabel>
                  <FormControl>
                    <Input {...field} list={modelsId} placeholder="The agent's own default" spellCheck={false} />
                  </FormControl>
                  <datalist id={modelsId}>
                    {modelSuggestions(runtime === 'terminal' ? cli : 'claude').map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultEffort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default effort</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EFFORTS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <NumberField form={form} name="sessionLimit" label="Session limit" hint="Most agent sessions running at once; 0 for no limit." limits={LIMITS.sessionLimit} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team and CEO</CardTitle>
            <CardDescription>How teams grow, and how often the CEO reviews the company.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="scaling"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Team changes from the CEO</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-2">
                      <RadioCard value="approve" title="I approve each one" text="New agents and let-gos wait for you under Needs you." />
                      <RadioCard value="auto" title="Apply straight away" text="Up to the most agents per project. Idle agents leave first." />
                    </RadioGroup>
                  </FormControl>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <NumberField form={form} name="maxAgents" label="Most agents per project" hint={`From ${LIMITS.maxAgents.min} to ${LIMITS.maxAgents.max}. Hiring past it is refused.`} limits={LIMITS.maxAgents} />
            <NumberField form={form} name="ceoHeartbeatMin" label="CEO review every (minutes)" hint="Checks team sizes and stuck pull requests; 0 turns it off." limits={LIMITS.ceoHeartbeatMin} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage and housekeeping</CardTitle>
            <CardDescription>Pacing after Claude's usage warnings, disk space, and the office's own updates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <NumberField form={form} name="pacingSessions" label="Sessions while pacing" hint="After a usage warning, new issues start only while fewer sessions than this run." limits={LIMITS.pacingSessions} />
            <NumberField form={form} name="trimIdleDesksMin" label="Trim idle desks after (minutes)" hint="An idle desk loses node_modules and build output; 0 never trims." limits={LIMITS.trimIdleDesksMin} />
            {typeof settings.autoUpdate === 'boolean' && (
              <FormField
                control={form.control}
                name="autoUpdate"
                render={({ field }) => (
                  <FormItem className="flex items-start justify-between gap-4 sm:col-span-2">
                    <div className="grid gap-1">
                      <FormLabel>Update the office automatically</FormLabel>
                      <FormDescription className="text-xs">When an update is ready, start nothing new, let sessions finish, then update and restart.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-2 z-10 grid gap-2 rounded-lg border bg-background p-3 shadow-sm">
          {error && <Notice tone="danger">{error}</Notice>}
          <SaveBar
            dirty={dirty}
            busy={busy}
            saved={saved}
            label="Save settings"
            onUndo={() => {
              form.reset(toOfficeForm(settings));
              setError(null);
            }}
          />
        </div>
      </form>
    </Form>
  );
}

type NumberName = 'sessionLimit' | 'maxAgents' | 'ceoHeartbeatMin' | 'pacingSessions' | 'trimIdleDesksMin';

function NumberField({ form, name, label, hint, limits }: { form: ReturnType<typeof useForm<OfficeSettingsForm>>; name: NumberName; label: string; hint: string; limits: { min: number; max: number } }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} type="number" inputMode="numeric" min={limits.min} max={limits.max} step={1} />
          </FormControl>
          <FormDescription className="text-xs">{hint}</FormDescription>
          <FormMessage role="alert" />
        </FormItem>
      )}
    />
  );
}

function RadioCard({ value, title, text }: { value: string; title: string; text: string }) {
  const id = useId();
  return (
    <Label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/40">
      <RadioGroupItem value={value} id={id} className="mt-0.5" aria-describedby={`${id}-text`} />
      <span className="grid gap-1">
        <span className="font-medium">{title}</span>
        <span id={`${id}-text`} className="text-xs text-muted-foreground">
          {text}
        </span>
      </span>
    </Label>
  );
}

function AppearanceCard() {
  const [theme, setTheme] = useTheme();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>The dashboard's theme, saved as you pick it.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={theme} onValueChange={(v) => setTheme(v as UiTheme)} className="flex flex-wrap gap-4" aria-label="Theme">
          {UI_THEMES.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <RadioGroupItem value={t} id={`theme-${t}`} />
              <Label htmlFor={`theme-${t}`}>{THEME_LABEL[t]}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
