import { z } from 'zod';

export const eventsPostSchema = z.object({
  userEmail: z.string().email(),
  supervisorEmail: z.string().email(),
  tabCount: z.number().int().min(0),
  activeTabTitle: z.string(),
  activeTabUrl: z.string(),
  timestamp: z.number().optional(),
  responded: z.boolean().optional(),
  response: z.string().optional(),
});

export type EventsPostBody = z.infer<typeof eventsPostSchema>;
