import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { settingsGetSchema, settingsPutSchema } from './schema';

export async function GET(req: NextRequest) {
  const parsed = settingsGetSchema.safeParse({
    userId: req.nextUrl.searchParams.get('userId'),
  });
  if (!parsed.success) {
    console.error(
      '[api/settings GET] 400 invalid params:',
      parsed.error.flatten()
    );
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { userId } = parsed.data;
  try {
    const snap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snap.empty) {
      console.error(
        '[api/settings GET] 404 profile not found for userId:',
        userId
      );
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json(snap.docs[0].data());
  } catch (err) {
    console.error('[api/settings GET]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const parsed = settingsPutSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.error(
        '[api/settings PUT] 400 invalid body:',
        parsed.error.flatten()
      );
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { userId, ...fields } = parsed.data;

    const snap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snap.empty) {
      console.error(
        '[api/settings PUT] 404 profile not found for userId:',
        userId
      );
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await snap.docs[0].ref.set(fields, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/settings PUT]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
