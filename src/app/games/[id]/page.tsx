import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { CalendarDays, Sparkles, Zap } from "lucide-react";
import { db, schema } from "@/db";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";

export const dynamic = "force-dynamic";

const { games, gamePlayers, gameAnswers, users } = schema;

async function loadGame(id: string) {
  const [game] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  if (!game) return null;
  const players = await db
    .select({
      userId: gamePlayers.userId,
      nickname: gamePlayers.nickname,
      score: gamePlayers.score,
      rank: gamePlayers.rank,
      image: users.image,
    })
    .from(gamePlayers)
    .leftJoin(users, eq(users.id, gamePlayers.userId))
    .where(eq(gamePlayers.gameId, id))
    .orderBy(asc(gamePlayers.rank));
  const answers = await db
    .select()
    .from(gameAnswers)
    .where(eq(gameAnswers.gameId, id))
    .orderBy(asc(gameAnswers.roundIndex));
  return { game, players, answers };
}

function pointStyle(pts: number) {
  if (pts >= 20) return "bg-tile text-tile-ink";
  if (pts >= 10) return "bg-go/20 text-go";
  if (pts > 0) return "bg-sky/20 text-sky";
  return "bg-white/5 text-dim";
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof loadGame>>;
  try {
    data = await loadGame(id);
  } catch {
    return <div className="panel p-6 text-stop">Die Datenbank ist gerade nicht erreichbar.</div>;
  }
  if (!data) notFound();
  const { game, players, answers } = data;

  // Runden -> Kategorien -> Antworten pro Spieler
  const rounds = new Map<number, { letter: string; modifier: string | null; categories: string[]; byKey: Map<string, typeof answers> }>();
  for (const a of answers) {
    let r = rounds.get(a.roundIndex);
    if (!r) {
      r = { letter: a.letter, modifier: a.modifier, categories: [], byKey: new Map() };
      rounds.set(a.roundIndex, r);
    }
    if (!r.categories.includes(a.category)) r.categories.push(a.category);
    const list = r.byKey.get(a.category) ?? [];
    list.push(a);
    r.byKey.set(a.category, list);
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <h1 className="font-display text-3xl font-semibold">Spielverlauf</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-haze">
          <CalendarDays className="h-4 w-4" />
          {game.finishedAt.toLocaleString("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" })}, Raum {game.roomCode}
        </p>
        <ol className="mt-5 flex flex-wrap gap-3">
          {players.map((p) => {
            const inner = (
              <>
                <span className={`font-display text-lg font-semibold ${p.rank === 1 ? "text-tile" : "text-haze"}`}>{p.rank}.</span>
                <Avatar name={p.nickname} image={p.image} seed={p.userId ?? p.nickname} size={30} />
                <span className="font-medium">{p.nickname}</span>
                <span className="font-display font-semibold tabular-nums">{p.score}</span>
              </>
            );
            return (
              <li key={p.nickname}>
                {p.userId ? (
                  <Link href={`/profile/${p.userId}`} className="well flex items-center gap-2.5 px-3 py-2 hover:border-rim-2">{inner}</Link>
                ) : (
                  <span className="well flex items-center gap-2.5 px-3 py-2">{inner}</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {rounds.size === 0 && (
        <p className="panel p-6 text-haze">Für diese Partie wurden keine einzelnen Antworten gespeichert.</p>
      )}

      {[...rounds.entries()].map(([index, r]) => (
        <section key={index} className="panel p-6" aria-label={`Runde ${index + 1}`}>
          <div className="mb-4 flex items-center gap-4">
            <Tile size="sm">{r.letter}</Tile>
            <h2 className="font-display text-xl font-semibold">Runde {index + 1}</h2>
            {r.modifier === "blitz" && (
              <span className="chip border-sky/40 text-sky"><Zap className="h-3.5 w-3.5" /> Blitzrunde</span>
            )}
            {r.modifier === "double" && (
              <span className="chip border-tile/40 text-tile"><Sparkles className="h-3.5 w-3.5" /> Doppelte Punkte</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="text-left text-dim">
                  <th className="pb-2 pr-3 font-medium">Kategorie</th>
                  {players.map((p) => (
                    <th key={p.nickname} className="pb-2 pr-3 font-medium">{p.nickname}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.categories.map((c) => {
                  const list = r.byKey.get(c) ?? [];
                  return (
                    <tr key={c} className="border-t border-rim/60 align-top">
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2 text-haze">
                          <CategoryIcon name={c} className="h-4 w-4 text-dim" /> {c}
                        </span>
                      </td>
                      {players.map((p) => {
                        const a = list.find((x) => x.nickname === p.nickname);
                        return (
                          <td key={p.nickname} className="py-2.5 pr-3">
                            <span className="flex items-center gap-2">
                              <span className={a?.valid ? "font-medium" : "text-dim line-through"}>{a?.word || "–"}</span>
                              {a && (
                                <span className={`rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${pointStyle(a.points)}`}>
                                  {a.points}
                                </span>
                              )}
                              {a?.joker && <Sparkles className="h-3.5 w-3.5 text-tile" aria-label="Joker" />}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
