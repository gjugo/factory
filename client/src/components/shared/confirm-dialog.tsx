import type { ReactNode } from 'react';
import { create } from 'zustand';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { showReplayHint } from '@/lib/replay-guard';
import { useStore } from '@/store';

// The dashboard's own confirmation, instead of the browser's confirm():
//   if (await confirmDialog({ title: 'Merge PR #12?', confirm: 'Merge' })) …
// <ConfirmDialog /> is mounted once by the shell.

export interface Ask {
  title: string;
  body?: ReactNode;
  confirm?: string; // label of the confirm button
  cancel?: string;
  tone?: 'default' | 'danger';
}

const useConfirm = create<{ ask: (Ask & { resolve: (ok: boolean) => void }) | null }>(() => ({ ask: null }));

export function confirmDialog(ask: Ask): Promise<boolean> {
  // Every question here leads to an action, and none can be taken while the time-lapse plays.
  if (useStore.getState().replaying) {
    showReplayHint();
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    useConfirm.getState().ask?.resolve(false); // a newer question replaces an unanswered one
    useConfirm.setState({ ask: { ...ask, resolve } });
  });
}

function answer(ok: boolean) {
  const ask = useConfirm.getState().ask;
  if (!ask) return;
  useConfirm.setState({ ask: null });
  ask.resolve(ok);
}

export function ConfirmDialog() {
  const ask = useConfirm((s) => s.ask);
  return (
    <AlertDialog open={!!ask} onOpenChange={(open) => !open && answer(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ask?.title}</AlertDialogTitle>
          {ask?.body && <AlertDialogDescription asChild={typeof ask.body !== 'string'}>{typeof ask.body === 'string' ? ask.body : <div>{ask.body}</div>}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => answer(false)}>{ask?.cancel ?? 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction className={ask?.tone === 'danger' ? buttonVariants({ variant: 'destructive' }) : undefined} onClick={() => answer(true)}>
            {ask?.confirm ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
