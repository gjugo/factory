import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { CeoChatPanel } from './ceo-chat-panel';

export { CeoChatPanel };

/** /ceo: the manager's console with the CEO. A placeholder until the CEO screen's issue lands. */
export default function CeoPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader title="CEO" description="Talk to the CEO, decide on team changes and see what it is working on." />
      <Card className="flex min-h-80 flex-col overflow-hidden py-0">
        <CeoChatPanel />
      </Card>
    </div>
  );
}
