import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** A form's Save and Undo, with "Saved" announced once it went through. Save submits the surrounding form. */
export function SaveBar({ dirty, busy, saved, onUndo, label = 'Save', className }: { dirty: boolean; busy: boolean; saved: boolean; onUndo: () => void; label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button type="submit" disabled={!dirty || busy}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        {label}
      </Button>
      {dirty && !busy && (
        <Button type="button" variant="ghost" onClick={onUndo}>
          Undo changes
        </Button>
      )}
      <span role="status" className="flex items-center gap-1 text-sm text-success">
        {saved && !dirty && (
          <>
            <Check className="size-4" aria-hidden /> Saved
          </>
        )}
      </span>
    </div>
  );
}
