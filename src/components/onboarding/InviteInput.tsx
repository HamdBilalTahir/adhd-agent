'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function InviteInput() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/invite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // TODO: replace 'TODO_USER_ID' with the authenticated user's ID
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          superviseeId: 'TODO_USER_ID',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Invalid code');
        return;
      }

      router.push('/supervisee');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="invite-code"
        label="Invite code"
        placeholder="e.g. ABC12345"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={error}
        maxLength={8}
        autoCapitalize="characters"
      />
      <Button type="submit" disabled={loading || code.trim().length < 6}>
        {loading ? 'Verifying…' : 'Join'}
      </Button>
    </form>
  );
}
