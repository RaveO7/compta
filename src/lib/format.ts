export const DEVISE = "EUR";

export function formatMontant(valeur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: DEVISE,
    minimumFractionDigits: 2,
  }).format(valeur || 0);
}

export function formatNombre(valeur: number): string {
  return new Intl.NumberFormat("fr-FR").format(valeur || 0);
}

const NOMS_MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// "2026-06" -> "Juin 2026"
export function formatMois(mois: string): string {
  const [annee, m] = mois.split("-");
  const index = parseInt(m, 10) - 1;
  if (Number.isNaN(index) || !NOMS_MOIS[index]) return mois;
  return `${NOMS_MOIS[index]} ${annee}`;
}

// "2026-06" court -> "Juin 26"
export function formatMoisCourt(mois: string): string {
  const [annee, m] = mois.split("-");
  const index = parseInt(m, 10) - 1;
  if (Number.isNaN(index) || !NOMS_MOIS[index]) return mois;
  return `${NOMS_MOIS[index].slice(0, 4)} ${annee.slice(2)}`;
}

export function moisActuel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Liste des N derniers mois (du plus récent au plus ancien), format "YYYY-MM"
export function derniersMois(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}
