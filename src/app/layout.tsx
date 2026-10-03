import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wortjagd – Stadt, Land, Fluss online",
  description: "Stadt, Land, Fluss mit Freunden in Echtzeit spielen.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  return (
    <html lang="de">
      <body className="grid-paper min-h-dvh font-sans antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <Link href="/" className="font-display text-2xl font-bold text-accent">
              Wortjagd
            </Link>
            <div className="flex gap-3 text-sm text-ink-soft">
              <Link href="/packs" className="hover:text-ink">Kategorien</Link>
              <Link href="/leaderboard" className="hover:text-ink">Bestenliste</Link>
            </div>
            <div className="ml-auto text-sm">
              {session?.user ? (
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                  className="flex items-center gap-3"
                >
                  <span className="text-ink-soft">{session.user.name}</span>
                  <button className="btn-ghost px-3 py-1 text-sm">Abmelden</button>
                </form>
              ) : (
                <Link href="/login" className="btn-ghost px-3 py-1 text-sm">Anmelden</Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
