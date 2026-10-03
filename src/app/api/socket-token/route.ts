import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { signSocketToken } from "@/lib/socket-token";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ token: null });
  const token = await signSocketToken({
    uid: session.user.id,
    name: session.user.name ?? "Spieler",
    image: session.user.image ?? null,
  });
  return NextResponse.json({ token, name: session.user.name });
}
