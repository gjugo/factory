import { MessagesSquare } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { CEO_ID } from '../../../../shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { links } from '@/lib/links';
import { ApprovalsPanel, CeoChatPanel, CeoStatus, useCeoPresence } from '@/pages/ceo';
import { pendingRequests, useCeoBadge, useStore } from '@/store';

/** The top bar's CEO chat button (with what's unread or waiting on the manager) and the sheet it opens. */
export function CeoSheet() {
  const open = useStore((s) => s.ceoOpen);
  const setOpen = useStore((s) => s.setCeoOpen);
  const name = useStore((s) => s.agents[CEO_ID]?.name ?? 'CEO');
  const pending = useStore((s) => pendingRequests(s.requests).length);
  const presence = useCeoPresence();
  const badge = useCeoBadge();
  const [tab, setTab] = useState('chat');
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={badge ? `CEO chat, ${badge} unread or waiting` : 'CEO chat'}>
          <MessagesSquare className="size-4" aria-hidden />
          {badge > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px] tabular-nums" aria-hidden>
              {badge > 99 ? '99+' : badge}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="gap-1 border-b pr-12">
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>
            <span aria-live="polite">{presence}</span>
            {' · '}
            <Link to={links.ceo()} onClick={() => setOpen(false)} className="underline underline-offset-4">
              Open the CEO page
            </Link>
          </SheetDescription>
        </SheetHeader>
        <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
          <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals
              {pending > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 rounded-full px-1 text-[10px] tabular-nums">
                  {pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="flex min-h-0 flex-col">
            <CeoChatPanel />
          </TabsContent>
          <TabsContent value="approvals" className="min-h-0 overflow-y-auto p-4">
            <ApprovalsPanel />
          </TabsContent>
          <TabsContent value="status" className="min-h-0 overflow-y-auto p-4">
            <CeoStatus />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
