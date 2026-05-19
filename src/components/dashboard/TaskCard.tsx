'use client';

import type { WithId, TaskBlock } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface TaskCardProps {
  task: WithId<TaskBlock>;
  onComplete?: (id: string) => void;
  onSkip?: (id: string) => void;
}

export function TaskCard({ task, onComplete, onSkip }: TaskCardProps) {
  const scheduledEnd = new Date(task.scheduledEnd);
  const isOverdue = !task.completed && scheduledEnd < new Date();

  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {task.completed ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Done
            </span>
          ) : isOverdue ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
              Overdue
            </span>
          ) : (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Pending
            </span>
          )}
          <span className="text-xs text-gray-400">
            {new Date(task.scheduledStart).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' – '}
            {scheduledEnd.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p
          className={`truncate font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}
        >
          {task.task}
        </p>
      </div>

      {!task.completed && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={() => onComplete?.(task.id)}>
            Done
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSkip?.(task.id)}>
            Skip
          </Button>
        </div>
      )}
    </Card>
  );
}
