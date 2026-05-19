import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { detectDrift } from '@/lib/patterns';
import { createIntervention } from '@/lib/intervention';
import { sendEmail } from '@/lib/notify';
import type { UserEvent, Intervention, WithId } from '@/types';

interface PostBody {
  userEmail: string;
  supervisorEmail: string;
  tabCount: number;
  activeTabTitle: string;
  activeTabUrl: string;
  timestamp?: number;
  responded?: boolean;
  response?: string;
}

async function getOrCreateProfile(
  email: string,
  extra: Record<string, unknown> = {}
): Promise<{ uid: string; isNew: boolean }> {
  try {
    const existing = await adminAuth.getUserByEmail(email);

    const snap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', existing.uid)
      .limit(1)
      .get();

    if (snap.empty) {
      await adminDb.collection('userProfiles').add({
        userId: existing.uid,
        email,
        firstName: '',
        lastName: '',
        roles: [],
        createdAt: new Date().toISOString(),
        claimed: false,
        ...extra,
      });
    } else if (Object.keys(extra).length) {
      await snap.docs[0].ref.set(extra, { merge: true });
    }

    return { uid: existing.uid, isNew: false };
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;

    const newUser = await adminAuth.createUser({ email });
    await adminDb.collection('userProfiles').add({
      userId: newUser.uid,
      email,
      firstName: '',
      lastName: '',
      roles: [],
      createdAt: new Date().toISOString(),
      claimed: false,
      ...extra,
    });

    return { uid: newUser.uid, isNew: true };
  }
}

async function sendClaimEmail(email: string): Promise<void> {
  try {
    const link = await adminAuth.generatePasswordResetLink(email, {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    });
    await sendEmail({
      to: email,
      subject: 'Your ADHD Agent account is ready',
      body: `<p>Someone has set you as their supervisor on ADHD Agent.</p>
             <p><a href="${link}">Click here to set your password and access your dashboard.</a></p>
             <p>This link expires in 1 hour.</p>`,
    });
  } catch (err) {
    console.error('[events] claim email failed:', err);
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body: PostBody = await req.json();

    if (!body.userEmail || !body.supervisorEmail) {
      return NextResponse.json(
        { error: 'userEmail and supervisorEmail are required' },
        { status: 400 }
      );
    }

    const [{ uid }, { uid: supervisorUid, isNew: supervisorIsNew }] =
      await Promise.all([
        getOrCreateProfile(body.userEmail, { roles: ['supervisee'] }),
        getOrCreateProfile(body.supervisorEmail, { roles: ['supervisor'] }),
      ]);

    // Link supervisorId on supervisee profile
    const superviseeSnap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', uid)
      .limit(1)
      .get();
    if (!superviseeSnap.empty) {
      await superviseeSnap.docs[0].ref.set(
        { supervisorId: supervisorUid },
        { merge: true }
      );
    }

    if (supervisorIsNew) sendClaimEmail(body.supervisorEmail);

    if (body.responded) {
      await adminDb.collection('activityLogs').add({
        userId: uid,
        endpoint: '/api/events',
        type: 'heartbeat',
        source: 'extension',
        payload: { responded: true, response: body.response },
        durationMs: Date.now() - start,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ intervene: false });
    }

    const now = body.timestamp
      ? new Date(body.timestamp).toISOString()
      : new Date().toISOString();

    const event: UserEvent = {
      userId: uid,
      type: 'heartbeat',
      source: 'extension',
      metadata: {
        tabCount: body.tabCount,
        activeTabTitle: body.activeTabTitle,
        activeTabUrl: body.activeTabUrl,
        online: true,
      },
      createdAt: now,
    };

    await adminDb.collection('events').add(event);

    const [eventsSnap, lastInterventionSnap] = await Promise.all([
      adminDb
        .collection('events')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get(),
      adminDb
        .collection('interventions')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get(),
    ]);

    const recentEvents = eventsSnap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as UserEvent) }) satisfies WithId<UserEvent>
    );

    const lastIntervention = lastInterventionSnap.empty
      ? null
      : (lastInterventionSnap.docs[0].data() as Intervention);

    const { level } = detectDrift(recentEvents, lastIntervention);

    await adminDb.collection('activityLogs').add({
      userId: uid,
      endpoint: '/api/events',
      type: 'heartbeat',
      source: 'extension',
      payload: { tabCount: body.tabCount, activeTabTitle: body.activeTabTitle },
      result: { level, intervene: level >= 2 },
      durationMs: Date.now() - start,
      createdAt: now,
    });

    if (level < 2) {
      return NextResponse.json({ intervene: false });
    }

    const { message, level: interventionLevel } = await createIntervention({
      userId: uid,
      level,
      tabCount: body.tabCount,
      activeTabTitle: body.activeTabTitle ?? '',
      currentTask: null,
    });

    return NextResponse.json({ intervene: true, message, level: interventionLevel });
  } catch (err) {
    console.error('[api/events]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
