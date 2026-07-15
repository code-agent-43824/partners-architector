import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  displayName: z.string().min(1).max(200).optional(),
  registrationCode: z.string().min(1).max(200).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

/** Minimal per-user preferences (D7); grows as настройки пользователя expand. */
export const updatePreferencesSchema = z.object({
  guidedMode: z.boolean(),
});
export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;
