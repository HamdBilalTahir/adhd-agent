'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { EventFeed } from '@/components/dashboard/EventFeed';
import type { UserProfile, UserEvent, WithId } from '@/types';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function DriftBadge({
  tabCount,
  createdAt,
}: {
  tabCount: number;
  createdAt: string;
}) {
  const age = Date.now() - new Date(createdAt).getTime();
  const offline = age > 5 * 60 * 1000;

  if (offline) {
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
        Offline
      </span>
    );
  }
  if (tabCount > 15) {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
        Drifting
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
      On track
    </span>
  );
}

export default function SuperviseeDetailPage() {
  const { superviseeId } = useParams<{ superviseeId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [latestEvent, setLatestEvent] = useState<UserEvent | null>(null);
  const [events, setEvents] = useState<WithId<UserEvent>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!superviseeId) return;

    // Load profile once
    getDocs(
      query(collection(db, 'userProfiles'), where('userId', '==', superviseeId))
    ).then((snap) => {
      if (!snap.empty) setProfile(snap.docs[0].data() as UserProfile);
    });

    // Live events feed
    const unsubEvents = onSnapshot(
      query(
        collection(db, 'events'),
        where('userId', '==', superviseeId),
        orderBy('createdAt', 'desc'),
        limit(20)
      ),
      (snap) => {
        const rows = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...(d.data() as UserEvent),
            }) satisfies WithId<UserEvent>
        );
        setEvents(rows);
        setLatestEvent(rows[0] ?? null);
        setLoading(false);
      }
    );

    return unsubEvents;
  }, [superviseeId]);

  const name = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
      profile.email
    : superviseeId;

  const tabCount = (latestEvent?.metadata?.tabCount as number | undefined) ?? 0;
  const activeTab =
    (latestEvent?.metadata?.activeTabTitle as string | undefined) ?? '—';

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/supervisor"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
        {latestEvent && (
          <DriftBadge tabCount={tabCount} createdAt={latestEvent.createdAt} />
        )}
      </div>

      <Card title="Focus status">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          </div>
        ) : latestEvent ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Last seen
              </dt>
              <dd className="mt-0.5 text-gray-900">
                {timeAgo(latestEvent.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Open tabs
              </dt>
              <dd className="mt-0.5 text-gray-900">{tabCount}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Active tab
              </dt>
              <dd className="mt-0.5 truncate text-gray-900">{activeTab}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-400">
            No data yet — waiting for extension heartbeat.
          </p>
        )}
      </Card>

      <EventFeed events={events} />
    </div>
  );
}
