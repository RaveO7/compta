// Frais d'une boutique : loyer fixe mensuel et/ou commission (% du CA), cumulables.
export type FraisBoutique = { loyerMensuel: number; commission: number };

export function montantCommission(ca: number, b: FraisBoutique): number {
  return (ca * (b.commission || 0)) / 100;
}

export function aDesFrais(b: FraisBoutique): boolean {
  return (b.loyerMensuel || 0) > 0 || (b.commission || 0) > 0;
}

// Ex : "Loyer 50,00 € / mois + 30 % des ventes"
export function libelleFrais(
  b: FraisBoutique,
  formatMontant: (v: number) => string,
): string {
  const parts: string[] = [];
  if (b.loyerMensuel > 0) parts.push(`Loyer ${formatMontant(b.loyerMensuel)} / mois`);
  if (b.commission > 0)
    parts.push(`${b.commission.toLocaleString("fr-FR")} % des ventes`);
  return parts.length ? parts.join(" + ") : "Aucun frais";
}

// Valide une saisie (nombre ≥ 0 ; commission ≤ 100). Renvoie null si invalide.
export function lireFrais(
  valeur: unknown,
  max = Infinity,
): number | null {
  if (valeur === "" || valeur === null || valeur === undefined) return 0;
  const n = typeof valeur === "number" ? valeur : Number(String(valeur).replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}
