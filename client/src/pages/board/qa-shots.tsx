import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { qaShotUrl } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { QaShotView } from '../../../../shared/types';

// QA's screenshots from the latest round on a PR: thumbnails, and a lightbox that steps through them (← →).

export function QaShots({ repoId, pr, shots, version }: { repoId: string; pr: number; shots: QaShotView[]; version: number }) {
  const [open, setOpen] = useState<number | null>(null);
  const url = (i: number) => qaShotUrl(repoId, pr, i, version);
  const step = (by: number) => setOpen((i) => (i == null ? i : (i + by + shots.length) % shots.length));
  const shot = open != null ? shots[open] : null;
  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="QA screenshots">
        {shots.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full overflow-hidden rounded-md border bg-muted text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <img src={url(i)} alt={s.caption || `Screenshot ${i + 1}`} loading="lazy" className="aspect-video w-full object-cover object-top transition-opacity group-hover:opacity-90" />
              <span className="block truncate bg-card px-2 py-1 text-xs text-foreground">{s.caption || s.page || `Screenshot ${i + 1}`}</span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={open != null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-5xl"
          onKeyDown={(e) => {
            if (shots.length < 2) return;
            if (e.key === 'ArrowRight') step(1);
            if (e.key === 'ArrowLeft') step(-1);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              PR #{pr} · screenshot {open != null ? open + 1 : ''} of {shots.length}
            </DialogTitle>
            <DialogDescription>{shot ? [shot.caption, shot.page].filter(Boolean).join(' · ') || 'From QA’s latest round' : ''}</DialogDescription>
          </DialogHeader>
          {open != null && shot && <img src={url(open)} alt={shot.caption || `Screenshot ${open + 1}`} className="max-h-[70dvh] w-full rounded-md border bg-muted object-contain" />}
          {shots.length > 1 && (
            <div className="flex justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => step(-1)}>
                <ChevronLeft aria-hidden /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => step(1)}>
                Next <ChevronRight aria-hidden />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
