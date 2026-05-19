import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { UserSettings } from '@/types';

const SETTINGS_PATH = (userId: string) =>
  `users/${userId}/settings/preferences`;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json(
      { error: 'userId query param is required' },
      { status: 400 }
    );
  }
  try {
    const snap = await adminDb.doc(SETTINGS_PATH(userId)).get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(snap.data());
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
    const body: { userId: string } & Partial<UserSettings> = await req.json();
    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    const { userId, ...settings } = body;
    await adminDb.doc(SETTINGS_PATH(userId)).set(settings, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/settings PUT]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
