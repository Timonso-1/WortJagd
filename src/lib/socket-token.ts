import { SignJWT, jwtVerify } from "jose";

export interface SocketIdentity {
  uid: string;
  name: string;
  image: string | null;
}

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET fehlt");
  return new TextEncoder().encode(`socket:${secret}`);
}

export async function signSocketToken(id: SocketIdentity): Promise<string> {
  return new SignJWT({ name: id.name, image: id.image })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id.uid)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key());
}

export async function verifySocketToken(token: string): Promise<SocketIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub) return null;
    return {
      uid: payload.sub,
      name: String(payload.name ?? "Spieler"),
      image: (payload.image as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
