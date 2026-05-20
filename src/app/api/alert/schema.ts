import { z } from 'zod';

export const alertPostSchema = z.object({
  userId: z.string().min(1),
  driftLevel: z.number().int().min(0).max(5),
  currentApp: z.string(),
  minutesOffTask: z.number().min(0),
});

export type AlertPostBody = z.infer<typeof alertPostSchema>;
