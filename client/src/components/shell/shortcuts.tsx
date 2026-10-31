import { Keyboard } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { links } from '@/lib/links';
import { isTypingTarget, shortcutFor, SHORTCUT_LIST } from '@/lib/shortcuts';
import { useStore } from '@/store';

// The single-key shortcuts (lib/shortcuts.ts) and the dialog listing every key. ⌘K's menu opens the list too.

/** Fired to open the shortcuts dialog from elsewhere (the ⌘K menu). */
export const SHORTCUTS_EVENT = 'factory:shortcuts';

export function Shortcuts() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const dialogOpen = !!document.querySelector('[role="dialog"], [role="alertdialog"]');
      const action = shortcutFor(e, { typing: isTypingTarget(e.target instanceof Element ? e.target : document.activeElement), dialogOpen });
      if (!action) return;
      e.preventDefault();
      if (action === 'ceo') useStore.getState().setCeoOpen(true);
      else if (action === 'agents') navigate(links.agents());
      else if (action === 'quiet') void import('@/voice/speaker').then((v) => v.stopSpeaking());
      else setOpen(true);
    };
    const show = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(SHORTCUTS_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(SHORTCUTS_EVENT, show);
    };
  }, [navigate]);

  const groups = [...new Set(SHORTCUT_LIST.map((s) => s.group))];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" aria-hidden /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>Single keys work anywhere outside a text field or terminal.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {groups.map((g) => (
            <section key={g} aria-label={g} className="grid gap-1.5">
              <h3 className="text-xs font-medium text-muted-foreground">{g}</h3>
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-sm">
                {SHORTCUT_LIST.filter((s) => s.group === g).map((s) => (
                  <Fragment key={s.label}>
                    <dt>{s.label}</dt>
                    <dd className="flex flex-wrap items-start justify-end gap-1">
                      {s.keys.map((k) => (
                        <kbd key={k} className="rounded border bg-muted px-1.5 font-mono text-[11px] whitespace-nowrap">
                          {k}
                        </kbd>
                      ))}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
