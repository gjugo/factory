import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { canPostpone, canUpdateNow, officeUpdateText } from '@/officeUpdate';
import { useStore } from '@/store';
import { attempt } from '../projects/actions';

// What the settings page shows but doesn't edit: the office's own update, the coding agents installed here, and the
// environment the office runs in.

const NO_LAUNCHER = 'Updating needs the office started with its launcher (npm start), which installs the update and restarts it.';

export function OfficeUpdateCard() {
  const update = useStore((s) => s.officeUpdate);
  const commit = useStore((s) => s.officeCommit);
  const [busy, setBusy] = useState(false);
  if (!update) return null;
  const act = (action: 'now' | 'later') => {
    setBusy(true);
    void attempt(() => api.updateOffice(action)).finally(() => setBusy(false));
  };
  const pending = update.state !== 'none';
  return (
    <Card>
      <CardHeader>
        <CardTitle>Office update</CardTitle>
        <CardDescription>Running {commit ? <code>{commit}</code> : 'an unknown commit'}.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p role="status" className={update.state === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
          {officeUpdateText(update)}
        </p>
        {update.detail && update.state !== 'failed' && <p className="text-xs text-muted-foreground">{update.detail}</p>}
        {pending && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !canUpdateNow(update)} onClick={() => act('now')}>
              Update now
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !canPostpone(update)} onClick={() => act('later')}>
              Later
            </Button>
          </div>
        )}
        {!update.launcher && pending && <p className="text-xs text-muted-foreground">{NO_LAUNCHER}</p>}
      </CardContent>
    </Card>
  );
}

export function EnvironmentCard() {
  const clis = useStore((s) => s.clis);
  const version = useStore((s) => s.version);
  const commit = useStore((s) => s.officeCommit);
  const user = useStore((s) => s.user);
  const demo = useStore((s) => s.demo);
  const machinesRoot = useStore((s) => s.machinesRoot);
  const rows: [string, string][] = [
    ['Version', `${version ?? 'unknown'}${commit ? ` (${commit})` : ''}`],
    ['GitHub', `${user ?? 'not signed in'}${demo ? ' (demo)' : ''}`],
    ['Mode', demo ? 'Demo: fake GitHub and agents' : 'Live'],
    ["Agents' machines", machinesRoot || '—'],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment</CardTitle>
        <CardDescription>Where the office runs.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <dl className="grid gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-mono text-xs break-all">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Coding agents</p>
          {clis.length === 0 ? (
            <p className="text-xs text-muted-foreground">Not checked yet.</p>
          ) : (
            <ul className="grid gap-1.5">
              {clis.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  {c.installed ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <XCircle className="size-4 text-muted-foreground" aria-hidden />}
                  <span className="font-medium">{c.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{c.installed ? (c.version ?? 'installed') : 'not installed'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
