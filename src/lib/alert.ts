import { adminDb } from '@/lib/firebase-admin';
import { sendEmail, sendSMS } from '@/lib/notify';
import type { UserSettings } from '@/types';

interface AlertOptions {
  superviseeId: string;
  message: string;
  level: number;
  settings: UserSettings;
}

export async function triggerAlert({
  superviseeId,
  message,
  level,
  settings,
}: AlertOptions): Promise<void> {
  const severity = level >= 5 ? 'high' : 'medium';

  await adminDb.collection('alerts').add({
    superviseeId,
    message,
    level,
    severity,
    sentAt: new Date().toISOString(),
  });

  const subject = `ADHD Agent — escalation level ${level}`;

  await Promise.all([
    settings.notifyEmail && settings.supervisorEmail
      ? sendEmail({ to: settings.supervisorEmail, subject, body: message })
      : Promise.resolve(),
    settings.notifySMS && settings.supervisorPhone
      ? sendSMS({ to: settings.supervisorPhone, message })
      : Promise.resolve(),
  ]);
}
