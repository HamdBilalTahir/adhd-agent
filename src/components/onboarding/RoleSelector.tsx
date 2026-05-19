'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';

export function RoleSelector() {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        className="group text-left"
        onClick={() => router.push('/onboarding/supervisee')}
      >
        <Card className="transition-all group-hover:border-indigo-400 group-hover:shadow-md">
          <div className="mb-2 text-2xl">🧠</div>
          <h3 className="font-semibold text-gray-900">I need support</h3>
          <p className="mt-1 text-sm text-gray-500">
            Let the agent help you stay on task and build focus habits.
          </p>
        </Card>
      </button>

      <button
        className="group text-left"
        onClick={() => router.push('/onboarding/supervisor')}
      >
        <Card className="transition-all group-hover:border-indigo-400 group-hover:shadow-md">
          <div className="mb-2 text-2xl">👁️</div>
          <h3 className="font-semibold text-gray-900">I&apos;m a supporter</h3>
          <p className="mt-1 text-sm text-gray-500">
            Stay informed and provide accountability for someone you care about.
          </p>
        </Card>
      </button>
    </div>
  );
}
