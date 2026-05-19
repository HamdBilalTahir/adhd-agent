import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_ADDRESS ?? 'onboarding@resend.dev';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export interface SMSOptions {
  to: string;
  message: string;
}

export async function sendEmail({
  to,
  subject,
  body,
}: EmailOptions): Promise<void> {
  await resend.emails.send({ from: FROM, to, subject, html: body });
}

export async function sendSMS({ to, message }: SMSOptions): Promise<void> {
  // TODO: replace with Twilio — yarn add twilio
  // const twilio = (await import('twilio')).default;
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({ from: process.env.TWILIO_PHONE_NUMBER, to, body: message });
  console.log(`[notify:sms] → ${to} | ${message}`);
}
