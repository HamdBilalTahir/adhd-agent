import { z } from 'zod';

export const signupPostSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  supervisorEmail: z.string().email(),
});

export type SignupPostBody = z.infer<typeof signupPostSchema>;
