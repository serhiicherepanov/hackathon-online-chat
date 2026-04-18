import { z } from "zod";

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
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(256, "Password must be 256 characters or less."),
});

export const signInBody = z.object({
  login: z.string().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});
