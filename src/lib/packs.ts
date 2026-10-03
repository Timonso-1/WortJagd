import { z } from "zod";

export const packInput = z.object({
  name: z.string().trim().min(1).max(40),
  categories: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
  isPublic: z.boolean().default(false),
});
