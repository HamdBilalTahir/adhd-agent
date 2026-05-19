import { TaskCard } from '@/components/dashboard/TaskCard';
import type { WithId, TaskBlock } from '@/types';

const now = new Date();
const h = (offset: number) =>
  new Date(now.getTime() + offset * 60_000).toISOString();

const placeholderTasks: WithId<TaskBlock>[] = [
  {
    id: '1',
    userId: 'demo',
    task: 'Review project brief',
    scheduledStart: h(0),
    scheduledEnd: h(30),
    completed: false,
  },
  {
    id: '2',
    userId: 'demo',
    task: 'Reply to outstanding emails',
    scheduledStart: h(35),
    scheduledEnd: h(55),
    completed: false,
  },
  {
    id: '3',
    userId: 'demo',
    task: 'Weekly planning',
    scheduledStart: h(60),
    scheduledEnd: h(75),
    completed: true,
    completedAt: h(-10),
  },
];

export default function TasksPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today&apos;s tasks</h1>
        <p className="text-sm text-gray-500">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
      {placeholderTasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
