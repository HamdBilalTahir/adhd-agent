/* global process */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/notify';
import { signupPostSchema } from './schema';

async function getOrCreateAuthUser(
  email: string
): Promise<{ uid: string; isNew: boolean }> {
  try {
    const user = await adminAuth.getUserByEmail(email);
    return { uid: user.uid, isNew: false };
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    const newUser = await adminAuth.createUser({ email });
    return { uid: newUser.uid, isNew: true };
  }
}

async function getOrCreateProfile(
  uid: string,
  fields: Record<string, unknown>
): Promise<{ docId: string; isNew: boolean }> {
  const snap = await adminDb
    .collection('userProfiles')
    .where('userId', '==', uid)
    .limit(1)
    .get();

  if (!snap.empty) {
    await snap.docs[0].ref.set(fields, { merge: true });
    return { docId: snap.docs[0].id, isNew: false };
  }

  const ref = await adminDb.collection('userProfiles').add({
    userId: uid,
    createdAt: new Date().toISOString(),
    claimed: false,
    ...fields,
  });
  return { docId: ref.id, isNew: true };
}

export async function POST(req: NextRequest) {
  try {
    const parsed = signupPostSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.error('[api/signup] 400 invalid body:', parsed.error.flatten());
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { firstName, lastName, email, supervisorEmail } = parsed.data;

    const [
      { uid: superviseeUid },
      { uid: supervisorUid, isNew: supervisorIsNew },
    ] = await Promise.all([
      getOrCreateAuthUser(email),
      getOrCreateAuthUser(supervisorEmail),
    ]);

    // Create both profiles
    await Promise.all([
      getOrCreateProfile(superviseeUid, {
        firstName,
        lastName,
        email,
        roles: ['supervisee'],
        supervisorId: supervisorUid,
        claimed: true,
      }),
      getOrCreateProfile(supervisorUid, {
        firstName: '',
        lastName: '',
        email: supervisorEmail,
        roles: ['supervisor'],
        claimed: !supervisorIsNew,
      }),
    ]);

    // Add supervisee to supervisor's superviseeIds array
    const supervisorSnap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', supervisorUid)
      .limit(1)
      .get();

    if (!supervisorSnap.empty) {
      const existing = (supervisorSnap.docs[0].data().superviseeIds ??
        []) as string[];
      if (!existing.includes(superviseeUid)) {
        await supervisorSnap.docs[0].ref.set(
          { superviseeIds: [...existing, superviseeUid] },
          { merge: true }
        );
      }
    }

    // Send supervisor notification email
    const supervisorEmailBody = `<p><strong>${firstName} ${lastName}</strong> has added you as their supervisor on ADHD Agent.</p>
      <p>You'll receive alerts when they go off-task.</p>
      ${supervisorIsNew ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/login">Click here to access your dashboard.</a></p>` : ''}`;

    // Send claim email to new supervisors
    if (supervisorIsNew) {
      try {
        const link = await adminAuth.generatePasswordResetLink(
          supervisorEmail,
          {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
          }
        );
        await sendEmail({
          to: supervisorEmail,
          subject: `${firstName} ${lastName} added you as their supervisor`,
          body: supervisorEmailBody.replace(
            `${process.env.NEXT_PUBLIC_APP_URL}/login`,
            link
          ),
        });
      } catch (err) {
        console.error('[signup] supervisor email failed:', err);
      }
    } else {
      sendEmail({
        to: supervisorEmail,
        subject: `${firstName} ${lastName} added you as their supervisor`,
        body: supervisorEmailBody,
      }).catch((err) =>
        console.error('[signup] supervisor notify failed:', err)
      );
    }

    // Send welcome email to supervisee with magic link to web app
    try {
      const link = await adminAuth.generatePasswordResetLink(email, {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      });
      await sendEmail({
        to: email,
        subject: 'Welcome to ADHD Agent',
        body: `<p>Hi ${firstName}, your ADHD Agent account is active.</p>
               <p><a href="${link}">Click here to set a password and access your full dashboard.</a></p>`,
      });
    } catch (err) {
      console.error('[signup] supervisee welcome email failed:', err);
    }

    await adminDb.collection('activityLogs').add({
      userId: superviseeUid,
      endpoint: '/api/signup',
      type: 'user_signup',
      source: 'extension',
      payload: { email, supervisorEmail },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, userId: superviseeUid });
  } catch (err) {
    console.error('[api/signup]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
