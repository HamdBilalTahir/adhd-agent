import { z } from 'zod';

export const intervenePostSchema = z.object({
  userId: z.string().min(1),
  driftLevel: z.number().int().min(0).max(5),
  tabCount: z.number().int().min(0),
  activeTabTitle: z.string(),
  currentTask: z.string().nullable().optional(),
});

export type IntervenePostBody = z.infer<typeof intervenePostSchema>;
