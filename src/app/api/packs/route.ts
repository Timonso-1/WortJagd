import { NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { packInput } from "@/lib/packs";

export const dynamic = "force-dynamic";

const { categoryPacks, users } = schema;

/** Eigene Pakete + öffentliche Pakete */
export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  const [mine, community] = await Promise.all([
    uid
      ? db.select().from(categoryPacks).where(eq(categoryPacks.ownerId, uid)).orderBy(desc(categoryPacks.updatedAt))
      : Promise.resolve([]),
    db
      .select({
        id: categoryPacks.id,
        name: categoryPacks.name,
        categories: categoryPacks.categories,
        isPublic: categoryPacks.isPublic,
        uses: categoryPacks.uses,
        ownerName: users.name,
      })
      .from(categoryPacks)
      .innerJoin(users, eq(users.id, categoryPacks.ownerId))
      .where(eq(categoryPacks.isPublic, true))
      .orderBy(desc(categoryPacks.uses))
      .limit(30),
  ]);
  return NextResponse.json({
    mine,
    community: community.map(({ ownerName, ...p }) => ({ ...p, owner: { name: ownerName } })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const parsed = packInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  const [{ n }] = await db.select({ n: count() }).from(categoryPacks).where(eq(categoryPacks.ownerId, uid));
  if (n >= 50) return NextResponse.json({ error: "Maximal 50 Pakete." }, { status: 400 });
  const [pack] = await db.insert(categoryPacks).values({ ...parsed.data, ownerId: uid }).returning();
  return NextResponse.json(pack, { status: 201 });
}
