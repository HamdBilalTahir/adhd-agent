import { NextRequest, NextResponse } from 'next/server';
import { createInviteCode, redeemInviteCode } from '@/lib/invite';
import { invitePostSchema, invitePatchSchema } from './schema';

export async function POST(req: NextRequest) {
  try {
    const parsed = invitePostSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.error(
        '[api/invite POST] 400 invalid body:',
        parsed.error.flatten()
      );
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { supervisorId } = parsed.data;
    const code = await createInviteCode(supervisorId);
    return NextResponse.json({ code }, { status: 201 });
  } catch (err) {
    console.error('[api/invite POST]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const parsed = invitePatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.error(
        '[api/invite PATCH] 400 invalid body:',
        parsed.error.flatten()
      );
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { code, superviseeId } = parsed.data;
    const supervisorId = await redeemInviteCode(code, superviseeId);
    if (!supervisorId) {
      console.error('[api/invite PATCH] 400 invalid or expired code:', code);
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }
    return NextResponse.json({ supervisorId });
  } catch (err) {
    console.error('[api/invite PATCH]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
