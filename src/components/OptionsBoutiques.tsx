import { Fragment } from "react";
import { statutBoutique, type Periode } from "@/lib/periode";

type Boutique = Periode & { id: number; nom: string };

// Options d'un <select> de boutiques : les ouvertes d'abord, puis celles à
// venir et les fermées regroupées à part (consultables pour l'historique).
export default function OptionsBoutiques({
  boutiques,
}: {
  boutiques: Boutique[];
}) {
  const groupes = [
    { statut: "ouverte", libelle: null },
    { statut: "aVenir", libelle: "À venir" },
    { statut: "fermee", libelle: "Fermées" },
  ] as const;
  return (
    <>
      {groupes.map(({ statut, libelle }) => {
        const liste = boutiques.filter((b) => statutBoutique(b) === statut);
        if (liste.length === 0) return null;
        const options = liste.map((b) => (
          <option key={b.id} value={b.id}>
            {b.nom}
          </option>
        ));
        return libelle ? (
          <optgroup key={statut} label={libelle}>
            {options}
          </optgroup>
        ) : (
          <Fragment key={statut}>{options}</Fragment>
        );
      })}
    </>
  );
}
