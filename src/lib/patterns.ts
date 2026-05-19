import type { WithId, UserEvent, Intervention } from '@/types';

export function detectDrift(
  events: WithId<UserEvent>[],
  lastIntervention?: Intervention | null
): { level: number } {
  const latestEvent = events[0];
  const tabCount = (latestEvent?.metadata?.tabCount as number | undefined) ?? 0;

  let level = 0;
  if (tabCount > 20) {
    level = 3;
  } else if (tabCount > 15) {
    level = 2;
  } else if (tabCount > 10) {
    level = 1;
  }

  if (level === 3 && lastIntervention && !lastIntervention.respondedAt) {
    const unansweredMs =
      Date.now() - new Date(lastIntervention.createdAt).getTime();
    level = unansweredMs >= 20 * 60 * 1000 ? 5 : 4;
  }

  return { level };
}
