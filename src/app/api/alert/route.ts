import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/notify';
import type { UserEvent, UserStatus, User } from '@/types';

const DEDUP_WINDOW_MS = 30 * 60 * 1000;

interface AlertBody {
  userId: string;
  driftLevel: number;
  currentApp: string;
  minutesOffTask: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: AlertBody = await req.json();

    if (!body.userId || body.driftLevel === undefined) {
      return NextResponse.json(
        { error: 'userId and driftLevel are required' },
        { status: 400 }
      );
    }

    // TODO: look up supervisor email from Firestore relationship once supervisor accounts exist
    // For now, skip the email send if no supervisor is linked
    const supervisorEmail: string | null = null;

    // Dedup: skip if supervisor was alerted within the last 30 minutes
    const statusSnap = await adminDb
      .doc(`users/${body.userId}/status/current`)
      .get();
    const status = statusSnap.data() as Partial<UserStatus> | undefined;

    if (status?.supervisorAlertedAt) {
      const elapsed =
        Date.now() - new Date(status.supervisorAlertedAt).getTime();
      if (elapsed < DEDUP_WINDOW_MS) {
        return NextResponse.json({ alerted: false, reason: 'cooldown' });
      }
    }

    const now = new Date().toISOString();

    // Fetch user name for subject line
    const userSnap = await adminDb.doc(`users/${body.userId}`).get();
    const user = userSnap.data() as Partial<User> | undefined;
    const userName = user?.name ?? body.userId;

    // Write supervisor_alerted event
    const event: UserEvent = {
      type: 'supervisor_alerted',
      source: 'daemon',
      metadata: {
        driftLevel: body.driftLevel,
        currentApp: body.currentApp,
        minutesOffTask: body.minutesOffTask,
      },
      timestamp: now,
    };
    await adminDb
      .collection('users')
      .doc(body.userId)
      .collection('events')
      .add(event);

    // Update status
    await adminDb
      .doc(`users/${body.userId}/status/current`)
      .set(
        { supervisorAlerted: true, supervisorAlertedAt: now },
        { merge: true }
      );

    // Send email
    const checkInUrl = `${process.env.NEXT_PUBLIC_APP_URL}/supervisor`;
    const subject = `${userName} has been off task for ${body.minutesOffTask} minutes`;
    const html = `
      <p><strong>${userName}</strong> has been off task for <strong>${body.minutesOffTask} minutes</strong>.</p>
      <ul>
        <li><strong>Current app:</strong> ${body.currentApp ?? 'Unknown'}</li>
        <li><strong>Drift level:</strong> ${body.driftLevel}/5</li>
        <li><strong>Time:</strong> ${new Date(now).toLocaleString()}</li>
      </ul>
      <p><a href="${checkInUrl}">Check in on ${userName} →</a></p>
    `.trim();

    if (supervisorEmail) {
      await sendEmail({ to: supervisorEmail, subject, body: html });
    }

    return NextResponse.json({ alerted: true });
  } catch (err) {
    console.error('[api/alert]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
