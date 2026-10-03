import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { packInput } from "@/lib/packs";

export const dynamic = "force-dynamic";

const { categoryPacks } = schema;
type Ctx = { params: Promise<{ id: string }> };

async function ownerFilter(id: string) {
  const session = await auth();
  const uid = session?.user?.id;
  return uid ? and(eq(categoryPacks.id, id), eq(categoryPacks.ownerId, uid)) : null;
}

export async function PUT(req: Request, { params }: Ctx) {
  const where = await ownerFilter((await params).id);
  if (!where) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const parsed = packInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  const [pack] = await db.update(categoryPacks).set(parsed.data).where(where).returning();
  if (!pack) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  return NextResponse.json(pack);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const where = await ownerFilter((await params).id);
  if (!where) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const rows = await db.delete(categoryPacks).where(where).returning({ id: categoryPacks.id });
  if (rows.length === 0) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** Nutzung zählen (beim Laden in einen Raum) */
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await db
    .update(categoryPacks)
    .set({ uses: sql`${categoryPacks.uses} + 1` })
    .where(eq(categoryPacks.id, id));
  return NextResponse.json({ ok: true });
}
