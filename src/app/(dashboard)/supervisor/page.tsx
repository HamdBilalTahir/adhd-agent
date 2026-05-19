import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const placeholderSupervisees = [
  {
    id: '1',
    name: 'Alex Johnson',
    status: 'on_track',
    lastActive: '2 min ago',
  },
  { id: '2', name: 'Sam Rivera', status: 'drifting', lastActive: '12 min ago' },
];

const statusConfig = {
  on_track: { label: 'On track', color: 'bg-green-100 text-green-700' },
  drifting: { label: 'Drifting', color: 'bg-amber-100 text-amber-700' },
  offline: { label: 'Offline', color: 'bg-gray-100 text-gray-500' },
} as const;

type StatusKey = keyof typeof statusConfig;

export default function SupervisorPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Live feed</h1>

      <div className="space-y-3">
        {placeholderSupervisees.map((s) => {
          const config = statusConfig[s.status as StatusKey];
          return (
            <Link key={s.id} href={`/supervisor/${s.id}`}>
              <Card className="flex cursor-pointer items-center justify-between transition-shadow hover:shadow-md">
                <div>
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    Last active {s.lastActive}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${config.color}`}
                >
                  {config.label}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
