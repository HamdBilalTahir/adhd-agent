import { NextRequest, NextResponse } from 'next/server';
import { triggerAlert } from '@/lib/alert';

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

    await triggerAlert({
      userId: body.userId,
      message: `${body.userId} has been off task for ${body.minutesOffTask} minutes on "${body.currentApp}" (drift level ${body.driftLevel}/5).`,
      level: body.driftLevel,
    });

    return NextResponse.json({ alerted: true });
  } catch (err) {
    console.error('[api/alert]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
