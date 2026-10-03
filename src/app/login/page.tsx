import { redirect } from "next/navigation";
import { auth, enabledProviders, signIn } from "@/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth().catch(() => null);
  if (session?.user) redirect("/");
  return (
    <div className="card mx-auto max-w-sm space-y-4">
      <h1 className="font-display text-3xl">Anmelden</h1>
      <p className="text-sm text-ink-soft">
        Optional. Als Gast kannst du sofort spielen. Mit Konto werden Ergebnisse in der Bestenliste
        gespeichert und du kannst Kategorie-Pakete anlegen.
      </p>
      {enabledProviders.length === 0 && (
        <p className="text-sm text-bad">Kein Login-Anbieter konfiguriert (AUTH_GITHUB_ID / AUTH_DISCORD_ID).</p>
      )}
      {enabledProviders.map((p) => (
        <form
          key={p.id}
          action={async () => {
            "use server";
            await signIn(p.id, { redirectTo: "/" });
          }}
        >
          <button className="btn-primary w-full">Mit {p.name} anmelden</button>
        </form>
      ))}
    </div>
  );
}
