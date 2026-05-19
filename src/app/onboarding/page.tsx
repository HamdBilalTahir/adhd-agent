import { RoleSelector } from '@/components/onboarding/RoleSelector';

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          Welcome to ADHD Agent
        </h1>
        <p className="mb-8 text-center text-gray-500">
          How would you like to use the app?
        </p>
        <RoleSelector />
      </div>
    </div>
  );
}
