'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function SupervisorOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      const snap = await getDocs(
        query(collection(db, 'userProfiles'), where('userId', '==', user.uid))
      );
      if (snap.empty) {
        await addDoc(collection(db, 'userProfiles'), {
          userId: user.uid,
          email: user.email ?? '',
          firstName: '',
          lastName: '',
          roles: ['supervisor'],
          createdAt: new Date().toISOString(),
          claimed: true,
        });
      } else {
        await updateDoc(snap.docs[0].ref, { roles: ['supervisor'] });
      }

      router.replace('/supervisor');
    });

    return unsubscribe;
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4">
        <a
          href="/onboarding"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </a>
        <p className="text-sm text-gray-500">Setting up your account…</p>
      </div>
    </div>
  );
}
