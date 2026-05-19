import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SuperviseeOnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Set up your account
          </h1>
          <p className="mt-2 text-gray-500">
            Grant permissions so the agent can monitor and support you.
          </p>
        </div>

        <Card title="Browser extension">
          <p className="mb-4 text-sm text-gray-600">
            The browser extension tracks tab switches and active websites to
            detect distraction patterns.
          </p>
          <Button variant="secondary" className="w-full">
            Install extension (coming soon)
          </Button>
        </Card>

        <Card title="Invite your supervisor (optional)">
          <p className="mb-4 text-sm text-gray-600">
            Share this code with your supervisor so they can view your focus
            feed.
          </p>
          <div className="flex items-center gap-3 rounded-lg bg-gray-100 px-4 py-3">
            <code className="flex-1 text-center font-mono text-lg font-bold tracking-widest text-gray-900">
              ― ― ― ― ― ― ― ―
            </code>
            <Button size="sm" variant="ghost">
              Copy
            </Button>
          </div>
        </Card>

        <Link href="/supervisee" className="block">
          <Button size="lg" className="w-full">
            Continue to dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
