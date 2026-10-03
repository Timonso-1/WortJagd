import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LayoutGrid, LogIn, LogOut, Trophy } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wortjagd – Stadt, Land, Fluss online",
  description: "Stadt, Land, Fluss mit Freunden in Echtzeit spielen.",
};

export const viewport: Viewport = { themeColor: "#121735" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  const user = session?.user;
  return (
    <html lang="de">
      <body className="min-h-dvh font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-rim/70 bg-night/80 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
            <Link href="/" className="mr-4 rounded-lg" aria-label="Wortjagd Startseite">
              <Logo />
            </Link>
            <Link href="/packs" className="btn-quiet px-3 py-2 text-sm">
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Kategorien</span>
            </Link>
            <Link href="/leaderboard" className="btn-quiet px-3 py-2 text-sm">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Bestenliste</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  <span className="hidden items-center gap-2 text-sm text-haze sm:flex">
                    <Avatar name={user.name ?? "?"} image={user.image} seed={user.id} size={28} />
                    {user.name}
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button className="icon-btn" title="Abmelden" aria-label="Abmelden">
                      <LogOut className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn-secondary px-3 py-2 text-sm">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Anmelden
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
