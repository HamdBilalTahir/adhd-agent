import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { detectDrift } from '@/lib/patterns';
import { createIntervention } from '@/lib/intervention';
import type { UserEvent, Intervention, WithId } from '@/types';

interface PostBody {
  userId: string;
  tabCount: number;
  activeTabTitle: string;
  activeTabUrl: string;
  timestamp?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: PostBody = await req.json();

    if (!body.userId || body.tabCount === undefined) {
      return NextResponse.json(
        { error: 'userId and tabCount are required' },
        { status: 400 }
      );
    }

    const now = body.timestamp ?? new Date().toISOString();

    const event: UserEvent = {
      type: 'tab_switch',
      source: 'extension',
      metadata: {
        tabCount: body.tabCount,
        activeTabTitle: body.activeTabTitle,
        activeTabUrl: body.activeTabUrl,
      },
      timestamp: now,
    };

    await adminDb
      .collection('users')
      .doc(body.userId)
      .collection('events')
      .add(event);

    await adminDb.doc(`users/${body.userId}/status/current`).set(
      {
        online: true,
        lastSeen: now,
        tabCount: body.tabCount,
        currentApp: body.activeTabTitle ?? null,
      },
      { merge: true }
    );

    const [eventsSnap, lastInterventionSnap] = await Promise.all([
      adminDb
        .collection('users')
        .doc(body.userId)
        .collection('events')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get(),
      adminDb
        .collection('interventions')
        .where('userId', '==', body.userId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get(),
    ]);

    const recentEvents = eventsSnap.docs.map(
      (d) =>
        ({ id: d.id, ...(d.data() as UserEvent) }) satisfies WithId<UserEvent>
    );

    const lastIntervention = lastInterventionSnap.empty
      ? null
      : (lastInterventionSnap.docs[0].data() as Intervention);

    const { level } = detectDrift(recentEvents, lastIntervention);

    if (level < 2) {
      return NextResponse.json({ intervene: false });
    }

    const { message, level: interventionLevel } = await createIntervention({
      userId: body.userId,
      level,
      tabCount: body.tabCount,
      activeTabTitle: body.activeTabTitle ?? '',
      currentTask: null,
    });

    return NextResponse.json({
      intervene: true,
      message,
      level: interventionLevel,
    });
  } catch (err) {
    console.error('[api/events]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
