import { z } from 'zod';

export const profileGetSchema = z.object({
  email: z.string().email(),
});
