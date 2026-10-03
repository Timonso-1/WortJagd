import { z } from "zod";
import { AVATAR_COLORS, AVATAR_ICONS } from "../../lib/avatars";
import { REACTIONS } from "./types";

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
    blitz: z.boolean(),
    doubleFinal: z.boolean(),
    bonusCategory: z.boolean(),
    jokers: z.boolean(),
  })
  .partial()
  .strict();

export const nickname = z.string().trim().min(1).max(20);
export const roomCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5}$/);

export const avatar = z.object({
  color: z.enum(AVATAR_COLORS),
  icon: z.enum(AVATAR_ICONS),
});

export const joinPayload = z.object({ code: roomCode, nickname, avatar: avatar.nullish() });
export const createPayload = z.object({ nickname, avatar: avatar.nullish(), settings: settingsPatch.optional() });
export const answersPayload = z.array(z.string().max(60)).max(21);
const categoryIndex = z.number().int().min(0).max(20);
export const votePayload = z.object({ target: z.string().min(1), category: categoryIndex });
export const reactPayload = z.object({ target: z.string().min(1), category: categoryIndex, emoji: z.enum(REACTIONS) });
export const jokerPayload = z.object({ category: categoryIndex.nullable() });
export const targetPayload = z.object({ target: z.string().min(1) });
export const chatPayload = z.object({ text: z.string().min(1).max(300) });
