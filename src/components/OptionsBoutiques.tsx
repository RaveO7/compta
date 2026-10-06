type Boutique = { id: number; nom: string; archivee: boolean };

// Options d'un <select> de boutiques : les actives d'abord, puis les archivées
// regroupées à part (consultables, mais hors du suivi courant).
export default function OptionsBoutiques({
  boutiques,
}: {
  boutiques: Boutique[];
}) {
  const actives = boutiques.filter((b) => !b.archivee);
  const archivees = boutiques.filter((b) => b.archivee);
  return (
    <>
      {actives.map((b) => (
        <option key={b.id} value={b.id}>
          {b.nom}
        </option>
      ))}
      {archivees.length > 0 && (
        <optgroup label="Archivées">
          {archivees.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nom}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}
