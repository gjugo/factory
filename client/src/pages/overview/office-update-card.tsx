import { Building2 } from 'lucide-react';
import { useState } from 'react';
import type { OfficeUpdateView } from '../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/api';
import { cn } from '@/lib/utils';
import { canPostpone, canUpdateNow, drainDeadline, officeUpdateText } from '@/officeUpdate';
import { useStore } from '@/store';
import { attempt } from './overview';

// The office's own update, as cubefarm's console Office row: the commit it runs, where an update stands, Update now /
// Later, and whether it updates by itself.

const NO_LAUNCHER = 'Start the office with npm run dev or npm start so it can install updates and restart itself.';

function OfficeUpdateBody({ update }: { update: OfficeUpdateView }) {
  const commit = useStore((s) => s.officeCommit);
  const autoUpdate = useStore((s) => s.settings.autoUpdate);
  const [busy, setBusy] = useState(false);
  const act = (action: 'now' | 'later') => {
    setBusy(true);
    void attempt(() => api.updateOffice(action)).finally(() => setBusy(false));
  };
  const deadline = drainDeadline(update);
  const pending = update.state !== 'none';
  const tone = update.state === 'failed' ? 'text-destructive' : update.state === 'none' ? 'text-success' : 'text-info';
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" aria-hidden /> Office
        </CardTitle>
        <CardDescription>
          Running {commit ? <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{commit}</code> : 'an unknown commit'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p role="status" className={cn('font-medium', tone)}>
          {officeUpdateText(update)}
        </p>
        {update.detail && update.state !== 'failed' && <p className="text-muted-foreground">{update.detail}</p>}
        {deadline && update.running > 0 && (
          <p className="text-muted-foreground">
            Sessions still running at {new Date(deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} are stopped, and their work goes back to the queue.
          </p>
        )}
        {pending && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !canUpdateNow(update)} title={update.launcher ? 'Start nothing new, let running sessions finish, then update and restart the office' : NO_LAUNCHER} onClick={() => act('now')}>
              Update now
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !canPostpone(update)} title={update.launcher ? 'Keep working; ask again in 2 hours or when a newer commit lands' : NO_LAUNCHER} onClick={() => act('later')}>
              Later
            </Button>
          </div>
        )}
        {!update.launcher && pending && <p className="text-muted-foreground">{NO_LAUNCHER}</p>}
        {typeof autoUpdate === 'boolean' && (
          <div className="flex items-center gap-2">
            <Switch id="office-auto-update" checked={autoUpdate} onCheckedChange={(v) => void attempt(() => api.updateSettings({ autoUpdate: v }))} />
            <Label htmlFor="office-auto-update" className="font-normal">
              Update automatically when it's quiet
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Nothing on servers that can't update themselves (no officeUpdate in the snapshot). */
export function OfficeUpdateCard() {
  const update = useStore((s) => s.officeUpdate);
  return update ? <OfficeUpdateBody update={update} /> : null;
}
