'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        router.replace('/login');
        return;
      }

      const snap = await getDocs(
        query(collection(db, 'userProfiles'), where('userId', '==', fbUser.uid))
      );
      if (snap.empty) {
        router.replace('/onboarding');
        return;
      }

      const userData = snap.docs[0].data() as UserProfile;
      if (!userData.roles?.length) {
        router.replace('/onboarding');
        return;
      }

      if (userData.roles.includes('supervisee')) {
        router.replace('/supervisee');
      } else {
        router.replace('/supervisor');
      }
    });

    return unsubscribe;
  }, [router]);

  return null;
}
