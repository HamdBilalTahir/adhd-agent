import { adminDb } from '@/lib/firebase-admin';
import { sendEmail, sendSMS } from '@/lib/notify';
import type { UserProfile } from '@/types';

interface AlertOptions {
  userId: string;
  message: string;
  level: number;
}

export async function triggerAlert({ userId, message, level }: AlertOptions): Promise<void> {
  // Look up supervisee profile to find supervisor
  const profileSnap = await adminDb
    .collection('userProfiles')
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (profileSnap.empty) return;

  const profile = profileSnap.docs[0].data() as UserProfile;
  const supervisorId = profile.supervisorId;
  if (!supervisorId) return;

  // Look up supervisor profile for contact info
  const supervisorSnap = await adminDb
    .collection('userProfiles')
    .where('userId', '==', supervisorId)
    .limit(1)
    .get();

  if (supervisorSnap.empty) return;
  const supervisor = supervisorSnap.docs[0].data() as UserProfile;

  const severity = level >= 5 ? 'high' : 'medium';

  await adminDb.collection('alerts').add({
    userId,
    supervisorId,
    message,
    level,
    severity,
    channel: 'email',
    sentAt: new Date().toISOString(),
  });

  const subject = `ADHD Agent — escalation level ${level}`;

  await Promise.all([
    profile.notifyEmail !== false && supervisor.email
      ? sendEmail({ to: supervisor.email, subject, body: message })
      : Promise.resolve(),
    profile.notifySMS && profile.supervisorPhone
      ? sendSMS({ to: profile.supervisorPhone, message })
      : Promise.resolve(),
  ]);
}
