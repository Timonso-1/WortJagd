import { redirect } from "next/navigation";
import { BarChart3, Library, UserRound } from "lucide-react";
import { auth, enabledProviders, signIn } from "@/auth";
import { LogoMark } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

function ProviderIcon({ id }: { id: string }) {
  if (id === "github")
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    );
  if (id === "discord")
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.85a13.7 13.7 0 0 0-.63 1.29 18.4 18.4 0 0 0-5.5 0 12.6 12.6 0 0 0-.64-1.29 19.7 19.7 0 0 0-4.93 1.52C.6 9.05-.24 13.6.18 18.1a19.9 19.9 0 0 0 6.04 3.05c.49-.66.92-1.36 1.3-2.1a12.9 12.9 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.1 0l.5.39c-.65.39-1.33.71-2.05.98.38.74.81 1.44 1.3 2.1a19.8 19.8 0 0 0 6.05-3.05c.5-5.22-.84-9.73-3.56-13.73ZM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.17 1.1 2.15 2.42 0 1.34-.95 2.42-2.15 2.42Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.17 1.1 2.15 2.42 0 1.34-.94 2.42-2.15 2.42Z" />
      </svg>
    );
  return <UserRound className="h-5 w-5" />;
}

const BRAND: Record<string, string> = {
  github: "bg-[#24292f] hover:bg-[#32383f] text-white",
  discord: "bg-[#5865f2] hover:bg-[#6c78f5] text-white",
};

export default async function LoginPage() {
  const session = await auth().catch(() => null);
  if (session?.user) redirect("/");
  return (
    <div className="panel mx-auto max-w-md p-8">
      <LogoMark size={48} />
      <h1 className="mt-4 font-display text-3xl font-extrabold">Anmelden</h1>
      <p className="mt-2 text-haze">Spielen geht auch ohne Konto. Mit Konto bekommst du zusätzlich:</p>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-center gap-3"><BarChart3 className="h-4 w-4 text-tile" /> Deine Ergebnisse in der Bestenliste</li>
        <li className="flex items-center gap-3"><Library className="h-4 w-4 text-tile" /> Eigene Kategorie-Pakete zum Wiederverwenden</li>
      </ul>

      <div className="mt-8 space-y-3">
        {enabledProviders.length === 0 && (
          <p className="rounded-lg border border-stop/40 bg-stop/10 px-3 py-2 text-sm text-stop">
            Kein Anmeldedienst eingerichtet. Trage AUTH_GITHUB_ID oder AUTH_DISCORD_ID in die .env ein.
          </p>
        )}
        {enabledProviders.map((p) => (
          <form
            key={p.id}
            action={async () => {
              "use server";
              await signIn(p.id, { redirectTo: "/" });
            }}
          >
            <button className={`btn w-full py-3 ${BRAND[p.id] ?? "btn-secondary"}`}>
              <ProviderIcon id={p.id} />
              Weiter mit {p.name}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
