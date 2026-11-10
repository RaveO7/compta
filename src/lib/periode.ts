// Période d'activité d'une boutique : de sa date d'ouverture à sa date de
// fermeture (facultative), incluses. Les jours sont au format "YYYY-MM-DD",
// les mois au format "YYYY-MM" comme le suivi mensuel : l'ordre alphabétique
// de ces chaînes est aussi l'ordre chronologique.
//
// Côté serveur, Prisma renvoie des Date (@db.Date, à minuit UTC) ; côté
// client, l'API renvoie des chaînes ISO. Les fonctions acceptent les deux.

type DateBrute = string | Date;

export type Periode = {
  dateDebut: DateBrute;
  dateFin: DateBrute | null;
};

export type StatutBoutique = "aVenir" | "ouverte" | "fermee";

// "YYYY-MM-DD" d'une date stockée à minuit UTC (ou d'une chaîne ISO)
export function jour(d: DateBrute): string {
  return (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
}

export function moisDe(d: DateBrute): string {
  return jour(d).slice(0, 7);
}

// Date du jour, heure locale
export function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Saisie "YYYY-MM-DD" → Date à minuit UTC (attendue par @db.Date), null si invalide
export function lireDate(valeur: unknown): Date | null {
  if (typeof valeur !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valeur))
    return null;
  const d = new Date(`${valeur}T00:00:00Z`);
  // Rejette les dates inexistantes (ex. 2026-02-30, que Date décale au 2 mars)
  return Number.isNaN(d.getTime()) || jour(d) !== valeur ? null : d;
}

// À venir (ouvre plus tard), ouverte, ou fermée (date de fin passée)
export function statutBoutique(
  p: Periode,
  reference = aujourdhui(),
): StatutBoutique {
  if (jour(p.dateDebut) > reference) return "aVenir";
  if (p.dateFin && jour(p.dateFin) < reference) return "fermee";
  return "ouverte";
}

// Premier et dernier mois de suivi possibles (null : pas de fin)
export function bornesMois(p: Periode): { min: string; max: string | null } {
  return { min: moisDe(p.dateDebut), max: p.dateFin ? moisDe(p.dateFin) : null };
}

export function moisDansPeriode(mois: string, p: Periode): boolean {
  const { min, max } = bornesMois(p);
  return mois >= min && (max === null || mois <= max);
}

// Ramène un mois dans la période (le plus proche des deux bornes)
export function bornerMois(mois: string, p: Periode): string {
  const { min, max } = bornesMois(p);
  if (mois < min) return min;
  if (max !== null && mois > max) return max;
  return mois;
}

// "2026-11-01" → "1er novembre 2026"
export function formatJour(d: DateBrute): string {
  return lireDate(jour(d))!
    .toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/^1 /, "1er ");
}

// Ex. "Ouverte depuis le 10 novembre 2026", "Ouvre le 1er décembre 2026",
// "Du 1er mars 2025 au 10 octobre 2026"
export function libellePeriode(p: Periode, reference = aujourdhui()): string {
  const debut = formatJour(p.dateDebut);
  const fin = p.dateFin ? formatJour(p.dateFin) : null;
  switch (statutBoutique(p, reference)) {
    case "aVenir":
      return fin ? `Ouvre le ${debut}, ferme le ${fin}` : `Ouvre le ${debut}`;
    case "fermee":
      return `Du ${debut} au ${fin}`;
    default:
      return fin
        ? `Ouverte depuis le ${debut}, ferme le ${fin}`
        : `Ouverte depuis le ${debut}`;
  }
}

// Valide la période saisie (création ou modification). En modification,
// `actuelle` fournit les valeurs en base des champs absents de la requête.
// Ouverture absente à la création : aujourd'hui. Fermeture vide : aucune.
export function lirePeriode(
  body: Record<string, unknown>,
  actuelle?: { dateDebut: Date; dateFin: Date | null },
): { dateDebut: Date; dateFin: Date | null } | { erreur: string } {
  let dateDebut = actuelle?.dateDebut ?? lireDate(aujourdhui())!;
  if ("dateDebut" in body) {
    const d = lireDate(body.dateDebut);
    if (!d) return { erreur: "Date d'ouverture invalide." };
    dateDebut = d;
  }

  let dateFin = actuelle?.dateFin ?? null;
  if ("dateFin" in body) {
    if (body.dateFin === "" || body.dateFin === null) {
      dateFin = null;
    } else {
      const d = lireDate(body.dateFin);
      if (!d) return { erreur: "Date de fermeture invalide." };
      dateFin = d;
    }
  }

  if (dateFin && dateFin < dateDebut)
    return {
      erreur: "La date de fermeture doit être après la date d'ouverture.",
    };
  return { dateDebut, dateFin };
}
