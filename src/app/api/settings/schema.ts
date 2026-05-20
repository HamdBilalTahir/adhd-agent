import { z } from 'zod';

export const settingsGetSchema = z.object({
  userId: z.string().min(1),
});

export const settingsPutSchema = z
  .object({
    userId: z.string().min(1),
  })
  .passthrough();

export type SettingsPutBody = z.infer<typeof settingsPutSchema>;
