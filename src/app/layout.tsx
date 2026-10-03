import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LayoutGrid, LogIn, LogOut, Trophy } from "lucide-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wortjagd – Stadt, Land, Fluss online",
  description: "Stadt, Land, Fluss mit Freunden in Echtzeit spielen.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  const user = session?.user;
  return (
    <html lang="de" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Theme vor dem ersten Rendern setzen, damit nichts aufblitzt */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("wj.theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-rim bg-night/80 backdrop-blur-md">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
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
              <HeaderControls />
              {user ? (
                <>
                  <Link href="/profile" className="btn-quiet px-2 py-1.5 text-sm" title="Mein Profil">
                    <Avatar name={user.name ?? "?"} image={user.image} seed={user.id} size={28} />
                    <span className="hidden sm:inline">{user.name}</span>
                  </Link>
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
