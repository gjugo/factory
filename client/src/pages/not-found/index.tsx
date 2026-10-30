import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { links } from '@/lib/links';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="There's nothing at this address."
      action={
        <Button asChild variant="outline">
          <Link to={links.overview()}>Back to the overview</Link>
        </Button>
      }
    />
  );
}
