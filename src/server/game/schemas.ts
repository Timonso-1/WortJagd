import { z } from "zod";

const category = z.string().trim().min(1).max(30);
const letter = z.string().regex(/^[A-Z]$/);

export const settingsPatch = z
  .object({
    rounds: z.number().int().min(1).max(26),
    roundTime: z.number().int().min(20).max(600),
    categories: z.array(category).min(1).max(20),
    excludedLetters: z.array(letter).max(20),
    allowStop: z.boolean(),
    stopGrace: z.number().int().min(0).max(60),
    isPublic: z.boolean(),
    maxPlayers: z.number().int().min(2).max(30),
  })
  .partial()
  .strict();

export const nickname = z.string().trim().min(1).max(20);
export const roomCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5}$/);

export const joinPayload = z.object({ code: roomCode, nickname });
export const createPayload = z.object({ nickname, settings: settingsPatch.optional() });
export const answersPayload = z.array(z.string().max(60)).max(20);
export const votePayload = z.object({ target: z.string().min(1), category: z.number().int().min(0).max(19) });
export const targetPayload = z.object({ target: z.string().min(1) });
export const chatPayload = z.object({ text: z.string().min(1).max(300) });
