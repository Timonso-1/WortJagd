import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { DatabaseZap, Trophy } from "lucide-react";
import { db, schema } from "@/db";
import { Avatar } from "@/components/ui/Avatar";
import { Tile } from "@/components/ui/Tile";

export const dynamic = "force-dynamic";

const { gamePlayers, users } = schema;

async function load() {
  return db
    .select({
      userId: gamePlayers.userId,
      name: users.name,
      image: users.image,
      total: sql<number>`sum(${gamePlayers.score})::int`,
      games: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${gamePlayers.rank} = 1)::int`,
      avg: sql<number>`round(avg(${gamePlayers.score}))::int`,
    })
    .from(gamePlayers)
    .innerJoin(users, eq(users.id, gamePlayers.userId))
    .where(isNotNull(gamePlayers.userId))
    .groupBy(gamePlayers.userId, users.name, users.image)
    .orderBy(desc(sql`sum(${gamePlayers.score})`))
    .limit(50);
}

export default async function LeaderboardPage() {
  let rows: Awaited<ReturnType<typeof load>> = [];
  let failed = false;
  try {
    rows = await load();
  } catch {
    failed = true;
  }

  const podium = rows.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-tile" />
        <h1 className="font-display text-3xl font-extrabold">Bestenliste</h1>
      </div>
      {failed ? (
        <div className="panel flex items-center gap-3 p-6 text-stop">
          <DatabaseZap className="h-5 w-5" /> Die Datenbank ist gerade nicht erreichbar.
        </div>
      ) : rows.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Trophy className="h-10 w-10 text-dim" />
          <p className="text-haze">Noch keine Ergebnisse.</p>
          <p className="text-sm text-dim">Melde dich an und spiel eine Partie zu Ende, dann stehst du hier.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {podium.map((r, i) => (
              <div key={r.userId} className="panel flex items-center gap-4 p-5">
                <Tile size="sm">{i + 1}</Tile>
                <Avatar name={r.name ?? "?"} image={r.image} seed={r.userId ?? undefined} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.name ?? "?"}</p>
                  <p className="font-display text-xl font-bold tabular-nums text-tile">{r.total}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="panel overflow-x-auto p-2">
            <table className="w-full text-left text-sm">
              <thead className="text-dim">
                <tr>
                  <th className="px-4 py-3 font-medium">Platz</th>
                  <th className="px-4 py-3 font-medium">Spieler</th>
                  <th className="px-4 py-3 text-right font-medium">Punkte</th>
                  <th className="px-4 py-3 text-right font-medium">Spiele</th>
                  <th className="px-4 py-3 text-right font-medium">Siege</th>
                  <th className="px-4 py-3 text-right font-medium">Schnitt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.userId} className="border-t border-rim/60">
                    <td className="px-4 py-3 font-display font-bold text-haze">{i + 1}.</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={r.name ?? "?"} image={r.image} seed={r.userId ?? undefined} size={28} />
                        <span className="font-medium">{r.name ?? "?"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-base font-bold tabular-nums">{r.total}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-haze">{r.games}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-haze">{r.wins}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-haze">{r.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
