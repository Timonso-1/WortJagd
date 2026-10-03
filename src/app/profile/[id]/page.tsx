import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { CalendarDays, ChevronRight, Crown, Gamepad2, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import { db, schema } from "@/db";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";

export const dynamic = "force-dynamic";

const { users, games, gamePlayers, gameAnswers } = schema;

async function loadProfile(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return null;

  const [totals] = await db
    .select({
      games: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${gamePlayers.rank} = 1)::int`,
      points: sql<number>`coalesce(sum(${gamePlayers.score}), 0)::int`,
      avg: sql<number>`coalesce(round(avg(${gamePlayers.score})), 0)::int`,
      best: sql<number>`coalesce(max(${gamePlayers.score}), 0)::int`,
    })
    .from(gamePlayers)
    .where(eq(gamePlayers.userId, id));

  const letters = await db
    .select({
      letter: gameAnswers.letter,
      rounds: sql<number>`count(distinct (${gameAnswers.gameId}, ${gameAnswers.roundIndex}))::int`,
      points: sql<number>`sum(${gameAnswers.points})::int`,
    })
    .from(gameAnswers)
    .where(eq(gameAnswers.userId, id))
    .groupBy(gameAnswers.letter);

  const categories = await db
    .select({
      category: gameAnswers.category,
      answers: sql<number>`count(*)::int`,
      avg: sql<number>`round(avg(${gameAnswers.points}), 1)::float`,
    })
    .from(gameAnswers)
    .where(eq(gameAnswers.userId, id))
    .groupBy(gameAnswers.category)
    .having(sql`count(*) >= 2`)
    .orderBy(desc(sql`avg(${gameAnswers.points})`))
    .limit(5);

  const bestWords = await db
    .selectDistinctOn([gameAnswers.word], {
      word: gameAnswers.word,
      category: gameAnswers.category,
      points: gameAnswers.points,
      letter: gameAnswers.letter,
    })
    .from(gameAnswers)
    .where(and(eq(gameAnswers.userId, id), gte(gameAnswers.points, 20)))
    .orderBy(gameAnswers.word, desc(gameAnswers.points))
    .limit(12);

  const recent = await db
    .select({
      id: games.id,
      finishedAt: games.finishedAt,
      rounds: games.rounds,
      letters: games.letters,
      score: gamePlayers.score,
      rank: gamePlayers.rank,
      players: sql<number>`(select count(*)::int from ${gamePlayers} gp2 where gp2.game_id = ${games.id})`,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(eq(gamePlayers.userId, id))
    .orderBy(desc(games.finishedAt))
    .limit(15);

  const letterStats = letters
    .filter((l) => l.rounds > 0)
    .map((l) => ({ ...l, avg: Math.round(l.points / l.rounds) }))
    .sort((a, b) => b.avg - a.avg);

  return { user, totals, letterStats, categories, bestWords, recent };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof loadProfile>>;
  try {
    data = await loadProfile(id);
  } catch {
    return <div className="panel p-6 text-stop">Die Datenbank ist gerade nicht erreichbar.</div>;
  }
  if (!data) notFound();
  const { user, totals, letterStats, categories, bestWords, recent } = data;
  const winRate = totals.games ? Math.round((totals.wins / totals.games) * 100) : 0;
  const best = letterStats[0];
  const worst = letterStats.length > 1 ? letterStats.at(-1) : undefined;

  const stats = [
    { icon: Gamepad2, label: "Spiele", value: totals.games },
    { icon: Crown, label: "Siege", value: `${totals.wins} (${winRate} %)` },
    { icon: Trophy, label: "Punkte gesamt", value: totals.points },
    { icon: TrendingUp, label: "Schnitt pro Spiel", value: totals.avg },
    { icon: Target, label: "Bestes Spiel", value: totals.best },
  ];

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-center gap-5 p-6">
        <Avatar name={user.name ?? "?"} image={user.image} seed={user.id} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl font-semibold">{user.name ?? "Unbekannt"}</h1>
          <p className="flex items-center gap-1.5 text-sm text-haze">
            <CalendarDays className="h-4 w-4" /> Dabei seit {user.createdAt.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "Europe/Berlin" })}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="panel p-4">
            <Icon className="h-5 w-5 text-tile" />
            <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-sm text-haze">{label}</p>
          </div>
        ))}
      </section>

      {totals.games === 0 ? (
        <div className="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Gamepad2 className="h-10 w-10 text-dim" />
          <p className="text-haze">Noch keine abgeschlossene Partie.</p>
          <Link href="/" className="btn-primary mt-2">Raum erstellen</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="panel p-6">
              <h2 className="mb-4 font-display text-xl font-semibold">Buchstaben</h2>
              {best ? (
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <Tile size="md">{best.letter}</Tile>
                    <div>
                      <p className="font-semibold">Stärkster Buchstabe</p>
                      <p className="text-sm text-haze">{best.avg} Punkte pro Runde</p>
                    </div>
                  </div>
                  {worst && (
                    <div className="flex items-center gap-3">
                      <Tile size="md" className="opacity-50 grayscale">{worst.letter}</Tile>
                      <div>
                        <p className="font-semibold">Angstgegner</p>
                        <p className="text-sm text-haze">{worst.avg} Punkte pro Runde</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-dim">Noch keine Daten.</p>
              )}
              {letterStats.length > 2 && (
                <div className="mt-6 flex h-24 items-end gap-1">
                  {[...letterStats].sort((a, b) => a.letter.localeCompare(b.letter)).map((l) => (
                    <div key={l.letter} className="flex flex-1 flex-col items-center gap-1" title={`${l.letter}: ${l.avg} Punkte pro Runde`}>
                      <span className="w-full rounded-t bg-tile/80" style={{ height: `${Math.max(6, (l.avg / (best?.avg || 1)) * 72)}px` }} />
                      <span className="text-[0.65rem] font-semibold text-dim">{l.letter}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel p-6">
              <h2 className="mb-4 font-display text-xl font-semibold">Stärkste Kategorien</h2>
              {categories.length === 0 ? (
                <p className="text-sm text-dim">Noch zu wenige Antworten.</p>
              ) : (
                <ul className="space-y-3">
                  {categories.map((c) => (
                    <li key={c.category} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-night-2">
                        <CategoryIcon name={c.category} className="h-4 w-4 text-tile" />
                      </span>
                      <span className="flex-1 font-medium">{c.category}</span>
                      <span className="text-sm text-haze tabular-nums">{c.avg} Ø</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {bestWords.length > 0 && (
            <section className="panel p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
                <Sparkles className="h-5 w-5 text-tile" /> Glanztreffer
              </h2>
              <p className="-mt-2 mb-4 text-sm text-haze">Wörter, mit denen du die volle Punktzahl geholt hast.</p>
              <ul className="flex flex-wrap gap-2">
                {bestWords.map((w) => (
                  <li key={w.word} className="chip py-1.5">
                    <CategoryIcon name={w.category} className="h-4 w-4 text-tile" />
                    <span className="font-semibold">{w.word}</span>
                    <span className="text-xs text-dim">{w.category}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel p-6">
            <h2 className="mb-4 font-display text-xl font-semibold">Letzte Partien</h2>
            <ul className="space-y-2">
              {recent.map((g) => (
                <li key={g.id}>
                  <Link href={`/games/${g.id}`} className="well flex items-center gap-4 px-4 py-3 transition hover:border-rim-2">
                    <span className={`font-display text-xl font-semibold ${g.rank === 1 ? "text-tile" : "text-haze"}`}>{g.rank}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {g.score} Punkte, Platz {g.rank} von {g.players}
                      </p>
                      <p className="truncate text-sm text-dim">
                        {g.finishedAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}, {g.rounds} Runden: {g.letters.join(" ")}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-dim" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
