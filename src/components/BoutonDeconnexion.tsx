import { deconnexion } from "@/lib/actions-auth";

export default function BoutonDeconnexion({
  className = "",
}: {
  className?: string;
}) {
  return (
    <form action={deconnexion}>
      <button type="submit" className={`btn btn-ghost btn-sm ${className}`}>
        Se déconnecter
      </button>
    </form>
  );
}
