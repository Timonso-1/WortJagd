import { boolean, index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());

// ---------- Auth.js ----------

export const users = pgTable("user", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------- Spiel ----------

export const categoryPacks = pgTable(
  "category_pack",
  {
    id: id(),
    name: text("name").notNull(),
    categories: text("categories").array().notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    uses: integer("uses").notNull().default(0),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("pack_public_uses_idx").on(t.isPublic, t.uses), index("pack_owner_idx").on(t.ownerId)],
);

export const games = pgTable("game", {
  id: id(),
  roomCode: text("room_code").notNull(),
  categories: text("categories").array().notNull(),
  letters: text("letters").array().notNull(),
  rounds: integer("rounds").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gamePlayers = pgTable(
  "game_player",
  {
    id: id(),
    gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    nickname: text("nickname").notNull(),
    score: integer("score").notNull(),
    rank: integer("rank").notNull(),
  },
  (t) => [index("gp_user_idx").on(t.userId)],
);

/** Jede Antwort jeder Runde, für Spielverlauf und Profilstatistiken */
export const gameAnswers = pgTable(
  "game_answer",
  {
    id: id(),
    gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    playerKey: text("player_key").notNull(),
    nickname: text("nickname").notNull(),
    roundIndex: integer("round_index").notNull(),
    letter: text("letter").notNull(),
    modifier: text("modifier"),
    category: text("category").notNull(),
    word: text("word").notNull(),
    points: integer("points").notNull(),
    valid: boolean("valid").notNull(),
    joker: boolean("joker").notNull().default(false),
  },
  (t) => [index("ga_game_idx").on(t.gameId), index("ga_user_idx").on(t.userId)],
);
