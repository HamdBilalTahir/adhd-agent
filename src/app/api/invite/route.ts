import { NextRequest, NextResponse } from 'next/server';
import { createInviteCode, redeemInviteCode } from '@/lib/invite';

export async function POST(req: NextRequest) {
  try {
    const { supervisorId }: { supervisorId: string } = await req.json();
    if (!supervisorId) {
      return NextResponse.json(
        { error: 'supervisorId is required' },
        { status: 400 }
      );
    }
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
    const { code, superviseeId }: { code: string; superviseeId: string } =
      await req.json();
    if (!code || !superviseeId) {
      return NextResponse.json(
        { error: 'code and superviseeId are required' },
        { status: 400 }
      );
    }
    const supervisorId = await redeemInviteCode(code, superviseeId);
    if (!supervisorId) {
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
