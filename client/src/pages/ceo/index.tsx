import { CEO_ID } from '../../../../shared/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { pendingRequests, useStore } from '@/store';
import { ApprovalsPanel } from './approvals-panel';
import { CeoChatPanel } from './ceo-chat-panel';
import { CeoStatus, useCeoPresence } from './ceo-status';

export { ApprovalsPanel, CeoChatPanel, CeoStatus, useCeoPresence };

/** /ceo: the manager's console with the CEO: the conversation, what the CEO is doing, and its team changes. */
export default function CeoPage() {
  const name = useStore((s) => s.agents[CEO_ID]?.name ?? 'CEO');
  const pending = useStore((s) => pendingRequests(s.requests).length);
  const presence = useCeoPresence();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader title={name} description="Talk to the CEO, decide on team changes and see what it is working on." />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Card className="flex h-[70dvh] min-h-96 min-w-0 flex-col gap-0 overflow-hidden py-0 lg:h-[calc(100dvh-15rem)]">
          <CardHeader className="border-b py-4">
            <CardTitle>Chat</CardTitle>
            <CardDescription aria-live="polite">{presence}</CardDescription>
          </CardHeader>
          <CeoChatPanel />
        </Card>
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Work queue</CardTitle>
            </CardHeader>
            <CardContent>
              <CeoStatus />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Team changes{pending > 0 && ` · ${pending}`}</CardTitle>
              <CardDescription>The CEO's hires and let-gos, for your OK.</CardDescription>
            </CardHeader>
            <CardContent>
              <ApprovalsPanel />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
