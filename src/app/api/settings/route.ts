import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { UserProfile } from '@/types';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId query param is required' }, { status: 400 });
  }
  try {
    const snap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json(snap.docs[0].data());
  } catch (err) {
    console.error('[api/settings GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: { userId: string } & Partial<UserProfile> = await req.json();
    if (!body.userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    const { userId, ...fields } = body;

    const snap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await snap.docs[0].ref.set(fields, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/settings PUT]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
