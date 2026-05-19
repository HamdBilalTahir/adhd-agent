import { NextRequest, NextResponse } from 'next/server';
import { createIntervention } from '@/lib/intervention';

interface InterventionBody {
  userId: string;
  driftLevel: number;
  tabCount: number;
  activeTabTitle: string;
  currentTask?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body: InterventionBody = await req.json();

    if (!body.userId || body.driftLevel === undefined) {
      return NextResponse.json(
        { error: 'userId and driftLevel are required' },
        { status: 400 }
      );
    }

    const result = await createIntervention({
      userId: body.userId,
      level: body.driftLevel,
      tabCount: body.tabCount ?? 0,
      activeTabTitle: body.activeTabTitle ?? '',
      currentTask: body.currentTask ?? null,
    });

    return NextResponse.json({ intervene: true, ...result }, { status: 201 });
  } catch (err) {
    console.error('[api/intervene]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
