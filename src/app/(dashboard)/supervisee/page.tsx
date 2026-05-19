import { Card } from '@/components/ui/Card';
import { EventFeed } from '@/components/dashboard/EventFeed';

export default function SuperviseeDashboard() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your day</h1>
        <p className="text-sm text-gray-500">Focus agent is active</p>
      </div>

      <Card title="Focus status">
        <div className="flex items-center gap-3">
          <span className="inline-block h-3 w-3 rounded-full bg-green-400 shadow-md shadow-green-200" />
          <span className="text-sm font-medium text-gray-700">On track</span>
        </div>
      </Card>

      <EventFeed events={[]} />
    </div>
  );
}
