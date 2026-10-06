export default function PageHeader({
  titre,
  sousTitre,
  action,
}: {
  titre: string;
  sousTitre?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titre}</h1>
        {sousTitre && (
          <p className="text-sm text-[var(--muted)] mt-1">{sousTitre}</p>
        )}
      </div>
      {action}
    </div>
  );
}
