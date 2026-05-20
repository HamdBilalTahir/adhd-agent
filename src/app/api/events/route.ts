/* global process */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { detectDrift } from '@/lib/patterns';
import { createIntervention } from '@/lib/intervention';
import { sendEmail } from '@/lib/notify';
import type { UserEvent, Intervention, WithId } from '@/types';
import { eventsPostSchema } from './schema';

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
    const parsed = eventsPostSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.error('[api/events] 400 invalid body:', parsed.error.flatten());
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const [{ uid }, { uid: supervisorUid, isNew: supervisorIsNew }] =
      await Promise.all([
        getOrCreateProfile(body.userEmail, { roles: ['supervisee'] }),
        getOrCreateProfile(body.supervisorEmail, { roles: ['supervisor'] }),
      ]);

    // Link supervisorId — non-critical, don't let it block the response
    adminDb
      .collection('userProfiles')
      .where('userId', '==', uid)
      .limit(1)
      .get()
      .then((snap) => {
        if (!snap.empty)
          snap.docs[0].ref.set(
            { supervisorId: supervisorUid },
            { merge: true }
          );
      })
      .catch((err) =>
        console.warn('[api/events] supervisor link failed:', err)
      );

    if (supervisorIsNew) sendClaimEmail(body.supervisorEmail);

    if (body.responded) {
      adminDb
        .collection('activityLogs')
        .add({
          userId: uid,
          endpoint: '/api/events',
          type: 'heartbeat',
          source: 'extension',
          payload: { responded: true, response: body.response },
          durationMs: Date.now() - start,
          createdAt: new Date().toISOString(),
        })
        .catch((err) =>
          console.warn('[api/events] activityLog write failed:', err)
        );
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

    // Write heartbeat — non-critical
    adminDb
      .collection('events')
      .add(event)
      .catch((err) => console.warn('[api/events] event write failed:', err));

    // Drift detection — if it fails, skip intervention rather than 500
    let level = 0;
    try {
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
        (d) =>
          ({ id: d.id, ...(d.data() as UserEvent) }) satisfies WithId<UserEvent>
      );
      const lastIntervention = lastInterventionSnap.empty
        ? null
        : (lastInterventionSnap.docs[0].data() as Intervention);

      level = detectDrift(recentEvents, lastIntervention).level;
    } catch (err) {
      console.warn(
        '[api/events] drift detection failed, skipping intervention:',
        err
      );
      return NextResponse.json({ intervene: false });
    }

    // Activity log — non-critical
    adminDb
      .collection('activityLogs')
      .add({
        userId: uid,
        endpoint: '/api/events',
        type: 'heartbeat',
        source: 'extension',
        payload: {
          tabCount: body.tabCount,
          activeTabTitle: body.activeTabTitle,
        },
        result: { level, intervene: level >= 2 },
        durationMs: Date.now() - start,
        createdAt: now,
      })
      .catch((err) =>
        console.warn('[api/events] activityLog write failed:', err)
      );

    if (level < 2) {
      return NextResponse.json({ intervene: false });
    }

    // Intervention — if Gemini fails, return no-intervene rather than 500
    try {
      const { message, level: interventionLevel } = await createIntervention({
        userId: uid,
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
      console.warn('[api/events] intervention failed, skipping:', err);
      return NextResponse.json({ intervene: false });
    }
  } catch (err) {
    console.error('[api/events]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
