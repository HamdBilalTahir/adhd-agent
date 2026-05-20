import { NextRequest, NextResponse } from 'next/server';
import { createIntervention } from '@/lib/intervention';
import { intervenePostSchema } from './schema';

export async function POST(req: NextRequest) {
  try {
    const parsed = intervenePostSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.error(
        '[api/intervene] 400 invalid body:',
        parsed.error.flatten()
      );
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { userId, driftLevel, tabCount, activeTabTitle, currentTask } =
      parsed.data;

    const result = await createIntervention({
      userId,
      level: driftLevel,
      tabCount: tabCount ?? 0,
      activeTabTitle: activeTabTitle ?? '',
      currentTask: currentTask ?? null,
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
