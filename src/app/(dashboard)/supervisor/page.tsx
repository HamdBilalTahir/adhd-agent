'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import type { UserProfile, UserEvent } from '@/types';

interface SuperviseeRow {
  uid: string;
  name: string;
  email: string;
  latestEvent: UserEvent | null;
}

const statusConfig = {
  on_track: { label: 'On track', color: 'bg-green-100 text-green-700' },
  drifting: { label: 'Drifting', color: 'bg-amber-100 text-amber-700' },
  offline: { label: 'Offline', color: 'bg-gray-100 text-gray-500' },
} as const;

function getStatusKey(e: UserEvent | null): keyof typeof statusConfig {
  if (!e) return 'offline';
  const tabCount = (e.metadata?.tabCount as number | undefined) ?? 0;
  const age = Date.now() - new Date(e.createdAt).getTime();
  if (age > 5 * 60 * 1000) return 'offline';
  if (tabCount > 15) return 'drifting';
  return 'on_track';
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function SupervisorPage() {
  const [supervisees, setSupervisees] = useState<SuperviseeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const q = query(
        collection(db, 'userProfiles'),
        where('supervisorId', '==', user.uid)
      );

      const unsubQuery = onSnapshot(q, async (snap) => {
        const rows = await Promise.all(
          snap.docs.map(async (profileDoc) => {
            const profile = profileDoc.data() as UserProfile;

            const eventSnap = await getDocs(
              query(
                collection(db, 'events'),
                where('userId', '==', profile.userId),
                orderBy('createdAt', 'desc'),
                limit(1)
              )
            );

            const latestEvent = eventSnap.empty
              ? null
              : (eventSnap.docs[0].data() as UserEvent);

            return {
              uid: profile.userId,
              name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email,
              email: profile.email,
              latestEvent,
            };
          })
        );

        setSupervisees(rows);
        setLoading(false);
      });

      return unsubQuery;
    });

    return unsubAuth;
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Live feed</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : supervisees.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">
            No supervisees yet. When someone adds your email in the ADHD Agent
            extension, they&apos;ll appear here automatically.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {supervisees.map((s) => {
            const key = getStatusKey(s.latestEvent);
            const config = statusConfig[key];
            return (
              <Link key={s.uid} href={`/supervisor/${s.uid}`}>
                <Card className="flex cursor-pointer items-center justify-between transition-shadow hover:shadow-md">
                  <div>
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">
                      {s.latestEvent
                        ? `Last active ${timeAgo(s.latestEvent.createdAt)}`
                        : s.email}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
