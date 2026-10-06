export default function EmptyState({
  titre,
  description,
  action,
}: {
  titre: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <div>
        <p className="font-semibold">{titre}</p>
        {description && (
          <p className="text-sm text-[var(--muted)] mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
