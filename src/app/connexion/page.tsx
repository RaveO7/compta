import { connexionGoogle } from "@/lib/actions-auth";

export const metadata = { title: "Connexion — Ma Compta" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl = "/", error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-xl font-bold text-white">
          €
        </div>
        <h1 className="text-xl font-bold">Ma Compta</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Connectez-vous pour accéder à vos données.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-[var(--border)] p-3 text-sm text-red-600">
            {error === "AccessDenied"
              ? "Ce compte Google n'est pas autorisé."
              : "La connexion a échoué. Réessayez."}
          </p>
        )}

        <form action={connexionGoogle.bind(null, callbackUrl)} className="mt-6">
          <button type="submit" className="btn btn-primary w-full">
            Se connecter avec Google
          </button>
        </form>
      </div>
    </div>
  );
}
