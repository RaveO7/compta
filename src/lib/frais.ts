// Frais d'une boutique : loyer fixe mensuel et/ou commission (% du CA), cumulables.
// Chacun peut avoir des conditions (paliers) selon le CA mensuel de la boutique :
// ex. commission 0 % de base, puis 10 % sur la part des ventes du mois au-delà de 100 €.
export type Palier = { seuil: number; valeur: number };

export type FraisBoutique = {
  loyerMensuel: number;
  commission: number;
  paliersLoyer?: unknown;
  paliersCommission?: unknown;
};

// Paliers valides, triés par seuil croissant (tolère une valeur JSON brute)
export function paliers(v: unknown): Palier[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (p): p is Palier =>
        !!p &&
        typeof p.seuil === "number" &&
        typeof p.valeur === "number" &&
        Number.isFinite(p.seuil) &&
        Number.isFinite(p.valeur),
    )
    .sort((a, b) => a.seuil - b.seuil);
}

// Valeur du palier le plus haut atteint (la valeur de base s'applique dès 0 €)
function valeurAtteinte(ca: number, base: number, liste: Palier[]): number {
  let v = base || 0;
  for (const p of liste) if (ca >= p.seuil) v = p.valeur;
  return v;
}

// Loyer dû pour un mois, selon le CA de la boutique ce mois-là
export function montantLoyer(caMensuel: number, b: FraisBoutique): number {
  return valeurAtteinte(caMensuel, b.loyerMensuel, paliers(b.paliersLoyer));
}

// Commission due pour un mois, calculée par tranches sur le CA de la boutique :
// [0 ; seuil1[ au taux de base, [seuil1 ; seuil2[ au taux 1…
// Ex. 0 % de base, 10 % dès 100 € : sur 150 € de ventes → 10 % de 50 € = 5 €.
export function montantCommission(caMensuel: number, b: FraisBoutique): number {
  const liste = paliers(b.paliersCommission);
  const bornes = [{ seuil: 0, valeur: b.commission || 0 }, ...liste];
  let total = 0;
  bornes.forEach((p, i) => {
    const fin = i + 1 < bornes.length ? bornes[i + 1].seuil : Infinity;
    const part = Math.min(caMensuel, fin) - p.seuil;
    if (part > 0) total += (part * p.valeur) / 100;
  });
  return total;
}

export function aDesFrais(b: FraisBoutique): boolean {
  return (
    (b.loyerMensuel || 0) > 0 ||
    (b.commission || 0) > 0 ||
    paliers(b.paliersLoyer).some((p) => p.valeur > 0) ||
    paliers(b.paliersCommission).some((p) => p.valeur > 0)
  );
}

// Ex : "Loyer 50,00 € / mois, 0,00 € dès 500,00 € de ventes + 5 %, 10 % dès 100,00 € de ventes"
export function libelleFrais(
  b: FraisBoutique,
  formatMontant: (v: number) => string,
): string {
  const pct = (v: number) => `${v.toLocaleString("fr-FR")} %`;
  const parts: string[] = [];

  const pl = paliers(b.paliersLoyer);
  if (b.loyerMensuel > 0 || pl.some((p) => p.valeur > 0)) {
    parts.push(
      [
        `Loyer ${formatMontant(b.loyerMensuel)} / mois`,
        ...pl.map(
          (p) => `${formatMontant(p.valeur)} dès ${formatMontant(p.seuil)} de ventes`,
        ),
      ].join(", "),
    );
  }

  const pc = paliers(b.paliersCommission);
  if (b.commission > 0 || pc.some((p) => p.valeur > 0)) {
    const morceaux = [
      ...(b.commission > 0 || pc.length === 0
        ? [`${pct(b.commission)} des ventes`]
        : []),
      ...pc.map(
        (p) => `${pct(p.valeur)} au-delà de ${formatMontant(p.seuil)} de ventes`,
      ),
    ];
    parts.push(`Commission ${morceaux.join(", ")}`);
  }
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

// Valide une liste de paliers saisis. Les lignes entièrement vides sont ignorées.
// Renvoie null si un seuil est absent/nul/en double ou une valeur invalide.
export function lirePaliers(valeur: unknown, max = Infinity): Palier[] | null {
  if (valeur === null || valeur === undefined || valeur === "") return [];
  if (!Array.isArray(valeur)) return null;
  const res: Palier[] = [];
  for (const p of valeur) {
    if (!p || typeof p !== "object") return null;
    const { seuil: s, valeur: v } = p as Record<string, unknown>;
    if ((s === "" || s == null) && (v === "" || v == null)) continue;
    const seuil = lireFrais(s);
    const val = lireFrais(v, max);
    if (seuil === null || seuil <= 0 || val === null) return null;
    if (res.some((r) => r.seuil === seuil)) return null;
    res.push({ seuil, valeur: val });
  }
  return res.sort((a, b) => a.seuil - b.seuil);
}
