import { adminDb } from '@/lib/firebase-admin';
import { generateIntervention } from '@/lib/claude';
import { triggerAlert } from '@/lib/alert';
import type { Intervention, InterventionLevel } from '@/types';

export interface InterventionInput {
  userId: string;
  level: number;
  tabCount: number;
  activeTabTitle: string;
  currentTask: string | null;
}

function levelToInterventionLevel(level: number): InterventionLevel {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

export async function createIntervention(
  input: InterventionInput
): Promise<{ id: string; message: string; level: InterventionLevel }> {
  const message = await generateIntervention(
    {
      level: input.level,
      tabCount: input.tabCount,
      activeTabTitle: input.activeTabTitle,
      currentTask: input.currentTask,
    },
    { escalationSensitivity: 'medium', agentTone: 'neutral' }
  );

  const interventionLevel = levelToInterventionLevel(input.level);

  const intervention: Intervention = {
    userId: input.userId,
    level: interventionLevel,
    message,
    createdAt: new Date().toISOString(),
  };

  const ref = await adminDb.collection('interventions').add(intervention);

  if (input.level >= 4) {
    await triggerAlert({ userId: input.userId, message, level: input.level });
  }

  return { id: ref.id, message, level: interventionLevel };
}
