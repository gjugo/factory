import { Factory } from 'lucide-react';
import { api } from '@/api';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

/** /setup: the first run (shown while settings.setupDone is false). A placeholder until the setup issue lands. */
export default function SetupPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center">
      <EmptyState
        icon={Factory}
        title="Welcome to factory"
        description="Setting up your office (your name, the company and your CEO) arrives with the setup screen."
        action={<Button onClick={() => void api.updateSettings({ setupDone: true })}>Skip for now</Button>}
        className="w-full"
      />
    </div>
  );
}
