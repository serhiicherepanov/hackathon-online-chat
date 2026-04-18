import { z } from "zod";

export const createRoomBody = z.object({
  name: z.string().min(2).max(64),
  description: z.string().max(512).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
});
