'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createSession } from '@/lib/session';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const googleProvider = new GoogleAuthProvider();
const MAGIC_EMAIL_KEY = 'adhd_magic_email';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState('');

  // Complete email link sign-in when user lands back on this page via the link
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    const saved = localStorage.getItem(MAGIC_EMAIL_KEY);
    const address = saved ?? window.prompt('Please enter your email to confirm') ?? '';
    if (!address) return;

    signInWithEmailLink(auth, address, window.location.href)
      .then(async ({ user }) => {
        localStorage.removeItem(MAGIC_EMAIL_KEY);
        await createSession(user.uid, user.email ?? address);
        router.push('/');
      })
      .catch((err: unknown) => {
        setMagicError(err instanceof Error ? err.message : 'Link sign-in failed');
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await createSession(user.uid, user.email ?? email);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await createSession(user.uid, user.email ?? '');
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicError('');
    setMagicLoading(true);
    try {
      await sendSignInLinkToEmail(auth, magicEmail, {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        handleCodeInApp: true,
      });
      localStorage.setItem(MAGIC_EMAIL_KEY, magicEmail);
      setMagicSent(true);
    } catch (err: unknown) {
      setMagicError(err instanceof Error ? err.message : 'Failed to send link');
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mb-6 text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>

        {/* Email + password */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Log in'}
          </Button>
        </form>

        <Divider />

        {/* Google */}
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          disabled={loading}
          onClick={handleGoogle}
        >
          Continue with Google
        </Button>

        <Divider />

        {/* Magic link */}
        {magicSent ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-sm font-medium text-green-800">Check your inbox</p>
            <p className="mt-1 text-xs text-green-600">
              We sent a sign-in link to <strong>{magicEmail}</strong>. Click it to log in — no password needed.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleMagicLink}>
            <Input
              id="magicEmail"
              label="Email link — no password"
              type="email"
              placeholder="you@example.com"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              required
            />
            {magicError && <p className="text-sm text-red-500">{magicError}</p>}
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={magicLoading}
            >
              {magicLoading ? 'Sending…' : 'Send sign-in link'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-gray-50 px-2 text-xs text-gray-400">or</span>
      </div>
    </div>
  );
}
