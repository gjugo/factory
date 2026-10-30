import { MessagesSquare } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { links } from '@/lib/links';
import { CeoChatPanel } from '@/pages/ceo';
import { useCeoBadge, useStore } from '@/store';

/** The top bar's CEO chat button (with what's unread or waiting on the manager) and the sheet it opens. */
export function CeoSheet() {
  const open = useStore((s) => s.ceoOpen);
  const setOpen = useStore((s) => s.setCeoOpen);
  const badge = useCeoBadge();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={badge ? `CEO chat, ${badge} unread` : 'CEO chat'}>
          <MessagesSquare className="size-4" aria-hidden />
          {badge > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px] tabular-nums" aria-hidden>
              {badge > 99 ? '99+' : badge}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>CEO</SheetTitle>
          <SheetDescription>
            Messages from your CEO.{' '}
            <Link to={links.ceo()} onClick={() => setOpen(false)} className="underline underline-offset-4">
              Open the CEO page
            </Link>
          </SheetDescription>
        </SheetHeader>
        <CeoChatPanel />
      </SheetContent>
    </Sheet>
  );
}
