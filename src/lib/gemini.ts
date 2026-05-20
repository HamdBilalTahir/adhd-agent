/* global process */
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
type AgentTone = 'gentle' | 'neutral' | 'firm';

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-3.1-pro-preview',
  apiKey: process.env.GEMINI_API_KEY,
  maxOutputTokens: 100,
});

const interventionSchema = z.object({
  message: z
    .string()
    .describe('The 1–2 sentence intervention message for the user'),
});

export interface InterventionContext {
  level: number;
  tabCount: number;
  activeTabTitle: string;
  currentTask: string | null;
}

const levelSystemInstruction: Record<number, string> = {
  2: 'The user is mildly distracted. Use a gentle, curious nudge — no alarm.',
  3: 'The user is significantly distracted. Be clear and warm but firm.',
  4: 'The user has ignored a previous reminder. Their supervisor has been notified. Be serious without being harsh.',
  5: 'The user has been unreachable for 20+ minutes and their supervisor has been notified. Be urgent and caring.',
};

const toneGuide: Record<AgentTone, string> = {
  gentle: 'Warm and encouraging — lead with empathy.',
  neutral: 'Calm and factual — no emotional framing.',
  firm: 'Direct and unambiguous — state what needs to happen.',
};

export async function generateIntervention(
  ctx: InterventionContext,
  options: { escalationSensitivity?: string; agentTone?: AgentTone } = {}
): Promise<string> {
  const tone = options.agentTone ?? 'neutral';
  const instruction =
    levelSystemInstruction[ctx.level] ?? levelSystemInstruction[5];
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const structured = model.withStructuredOutput(interventionSchema, {
    method: 'json_mode',
  });

  const result = await structured.invoke([
    new SystemMessage(
      `You are a warm, direct ADHD support agent. Help the user refocus without shaming them.
Write exactly 1–2 sentences. Never sound robotic or use filler phrases like "I notice" or "It seems".
Tone style: ${tone} — ${toneGuide[tone]}
Escalation context: ${instruction}`
    ),
    new HumanMessage(
      `Tab count: ${ctx.tabCount}
Active tab: "${ctx.activeTabTitle}"
Drift level: ${ctx.level}/5
Current task: ${ctx.currentTask ?? 'none set'}
Time of day: ${timeOfDay}

Write the intervention message.`
    ),
  ]);

  return (
    result.message.trim() ||
    "You've got a lot of tabs open — what's the one thing you should be focusing on right now?"
  );
}
