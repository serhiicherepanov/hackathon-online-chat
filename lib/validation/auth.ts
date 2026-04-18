import { z } from "zod";

export const registerBody = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(256),
});

export const signInBody = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});
