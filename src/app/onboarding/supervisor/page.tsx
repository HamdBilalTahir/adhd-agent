import { InviteInput } from '@/components/onboarding/InviteInput';

export default function SupervisorOnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Join as supervisor
          </h1>
          <p className="mt-2 text-gray-500">
            Enter the invite code from the person you&apos;re supporting.
          </p>
        </div>
        <InviteInput />
      </div>
    </div>
  );
}
