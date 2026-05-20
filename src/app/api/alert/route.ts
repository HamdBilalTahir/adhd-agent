import { NextRequest, NextResponse } from 'next/server';
import { triggerAlert } from '@/lib/alert';
import { alertPostSchema } from './schema';

export async function POST(req: NextRequest) {
  try {
    const parsed = alertPostSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.error('[api/alert] 400 invalid body:', parsed.error.flatten());
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { userId, driftLevel, currentApp, minutesOffTask } = parsed.data;

    await triggerAlert({
      userId,
      message: `${userId} has been off task for ${minutesOffTask} minutes on "${currentApp}" (drift level ${driftLevel}/5).`,
      level: driftLevel,
    });

    return NextResponse.json({ alerted: true });
  } catch (err) {
    console.error('[api/alert]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
