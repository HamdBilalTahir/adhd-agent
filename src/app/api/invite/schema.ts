import { z } from 'zod';

export const invitePostSchema = z.object({
  supervisorId: z.string().min(1),
});

export const invitePatchSchema = z.object({
  code: z.string().min(1),
  superviseeId: z.string().min(1),
});

export type InvitePostBody = z.infer<typeof invitePostSchema>;
export type InvitePatchBody = z.infer<typeof invitePatchSchema>;
