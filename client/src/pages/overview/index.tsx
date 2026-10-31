import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/store';
import { ActivityFeed } from './activity-feed';
import { CeoCard } from './ceo-card';
import { DoctorCard } from './office-doctor';
import { OfficeNumbers, PipelineKpis } from './office-kpis';
import { OfficeUpdateCard } from './office-update-card';
import { NeedsYouCard } from './needs-you';
import { ProjectsTable } from './projects-table';
import { ReportCard } from './report-card';
import { UsageCard } from './usage-card';

// /: mission control, cubefarm's lobby wall and the console's Ops tab as one page. Everything comes from the snapshot
// and its events (ops, doctor, usage, ticker, ceo, officeUpdate): no polling.

function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading mission control">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-48 lg:col-span-2" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const loaded = useStore((s) => s.loaded);
  const { hash } = useLocation();
  // links.overview('needs-you') from elsewhere: the cards only exist once the snapshot is in.
  useEffect(() => {
    if (loaded && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [loaded, hash]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mission control" description="Every project's pipeline and numbers, and what needs you." />
      {!loaded ? (
        <Loading />
      ) : (
        <>
          <PipelineKpis />
          <OfficeNumbers />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
              <ProjectsTable />
              <ActivityFeed />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <NeedsYouCard />
              <DoctorCard />
              <ReportCard />
              <UsageCard />
              <CeoCard />
              <OfficeUpdateCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
