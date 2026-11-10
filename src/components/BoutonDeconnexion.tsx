import { deconnexion } from "@/lib/actions-auth";

export default function BoutonDeconnexion({
  className = "",
}: {
  className?: string;
}) {
  return (
    <form action={deconnexion}>
      <button
        type="submit"
        className={`btn btn-ghost btn-sm ${className}`}
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        <span className="group-data-[replie=true]/sidebar:hidden">Se déconnecter</span>
      </button>
    </form>
  );
}
