import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const { gamePlayers, users } = schema;

async function load() {
  return db
    .select({
      userId: gamePlayers.userId,
      name: users.name,
      total: sql<number>`sum(${gamePlayers.score})::int`,
      games: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${gamePlayers.rank} = 1)::int`,
      avg: sql<number>`round(avg(${gamePlayers.score}))::int`,
    })
    .from(gamePlayers)
    .innerJoin(users, eq(users.id, gamePlayers.userId))
    .where(isNotNull(gamePlayers.userId))
    .groupBy(gamePlayers.userId, users.name)
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

  return (
    <div className="card">
      <h1 className="mb-4 font-display text-3xl">Bestenliste</h1>
      {failed ? (
        <p className="text-bad">Datenbank nicht erreichbar.</p>
      ) : rows.length === 0 ? (
        <p className="text-ink-soft">Noch keine Spiele von angemeldeten Spielern.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-soft">
              <tr>
                <th className="py-2">#</th>
                <th>Spieler</th>
                <th className="text-right">Punkte</th>
                <th className="text-right">Spiele</th>
                <th className="text-right">Siege</th>
                <th className="text-right">Ø Punkte</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-t border-line">
                  <td className="py-2 font-semibold">{i + 1}</td>
                  <td>{r.name ?? "?"}</td>
                  <td className="text-right font-semibold">{r.total}</td>
                  <td className="text-right">{r.games}</td>
                  <td className="text-right">{r.wins}</td>
                  <td className="text-right">{r.avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
