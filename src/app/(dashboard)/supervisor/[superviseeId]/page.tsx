import { Card } from '@/components/ui/Card';
import { EventFeed } from '@/components/dashboard/EventFeed';

interface Props {
  params: Promise<{ superviseeId: string }>;
}

export default async function SuperviseeDetailPage({ params }: Props) {
  const { superviseeId } = await params;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supervisee detail</h1>
        <p className="font-mono text-xs text-gray-400">{superviseeId}</p>
      </div>

      <Card title="Focus status">
        <p className="text-sm text-gray-500">
          Real-time status will appear here.
        </p>
      </Card>

      <Card title="Task progress">
        <p className="text-sm text-gray-500">
          Task completion data will appear here.
        </p>
      </Card>

      <EventFeed events={[]} />
    </div>
  );
}
