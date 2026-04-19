import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(256, "Password must be 256 characters or less.");

export const registerBody = z.object({
  email: z.string().email("Enter a valid email address."),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters.")
    .max(32, "Username must be 32 characters or less.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username may only contain letters, numbers, and underscores.",
    ),
  password: passwordSchema,
});

export const signInBody = z.object({
  login: z.string().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

export const passwordResetRequestBody = z.object({
  email: z.string().email("Enter a valid email address."),
});

export const passwordResetConfirmBody = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: passwordSchema,
});

export const passwordChangeBody = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordSchema,
});

export const profileUpdateBody = z
  .object({
    displayName: z
      .union([z.string().trim().max(80), z.null()])
      .optional(),
    avatarUrl: z
      .union([z.string().trim().url().max(2048), z.null()])
      .optional(),
  })
  .refine((value) => value.displayName !== undefined || value.avatarUrl !== undefined, {
    message: "At least one profile field is required.",
  });

export const deleteAccountBody = z.object({
  username: z.string().min(1, "Enter your username to confirm."),
  confirmation: z.string().min(1, "Enter the confirmation phrase."),
});
