import type { WithId, UserEvent } from '@/types';
import { Card } from '@/components/ui/Card';

const eventLabels: Partial<Record<UserEvent['type'], string>> = {
  tab_switch: 'Switched tab',
  app_switch: 'Switched app',
  idle: 'Went idle',
  active: 'Back online',
  distraction_detected: 'Distraction detected',
  task_started: 'Started task',
  task_completed: 'Completed task',
  focus_session_started: 'Focus session started',
  focus_session_ended: 'Focus session ended',
};

interface EventFeedProps {
  events: WithId<UserEvent>[];
}

export function EventFeed({ events }: EventFeedProps) {
  return (
    <Card title="Recent activity">
      {events.length === 0 ? (
        <p className="text-sm text-gray-400">No events yet.</p>
      ) : (
        <ul className="space-y-2">
          {events.slice(0, 20).map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-700">
                {eventLabels[event.type] ?? event.type}
              </span>
              <span className="tabular-nums text-gray-400">
                {new Date(event.createdAt).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
