import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statutBoutique } from "@/lib/periode";

// Stock restant (envoyé - vendu) par article ET par boutique.
// Permet une vue d'ensemble en un coup d'œil : articles en lignes, boutiques en colonnes.
export async function GET() {
  const [entrees, boutiques] = await Promise.all([
    prisma.entree.findMany({ include: { article: true } }),
    prisma.boutique.findMany({ orderBy: { nom: "asc" } }),
  ]);

  type Ligne = {
    articleId: number;
    nom: string;
    reference: string | null;
    parBoutique: Record<number, number>;
    total: number;
  };

  const map = new Map<number, Ligne>();

  for (const e of entrees) {
    let ligne = map.get(e.articleId);
    if (!ligne) {
      ligne = {
        articleId: e.articleId,
        nom: e.article.nom,
        reference: e.article.reference,
        parBoutique: {},
        total: 0,
      };
      map.set(e.articleId, ligne);
    }
    const reste = e.envoye - e.vendu;
    ligne.parBoutique[e.boutiqueId] =
      (ligne.parBoutique[e.boutiqueId] ?? 0) + reste;
    ligne.total += reste;
  }

  const lignes = [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom));

  // Totaux de reste par boutique (pied de tableau)
  let totauxParBoutique: Record<number, number> = {};
  for (const b of boutiques) totauxParBoutique[b.id] = 0;
  let totalGeneral = 0;
  for (const l of lignes) {
    for (const b of boutiques) {
      totauxParBoutique[b.id] += l.parBoutique[b.id] ?? 0;
    }
    totalGeneral += l.total;
  }

  // Les boutiques fermées n'apparaissent que s'il y reste du stock
  const fermees = new Set(
    boutiques.filter((b) => statutBoutique(b) === "fermee").map((b) => b.id),
  );
  const visibles = boutiques.filter(
    (b) => !fermees.has(b.id) || totauxParBoutique[b.id] !== 0,
  );
  totauxParBoutique = Object.fromEntries(
    visibles.map((b) => [b.id, totauxParBoutique[b.id]]),
  );

  return NextResponse.json({
    boutiques: visibles.map((b) => ({
      id: b.id,
      nom: b.nom,
      fermee: fermees.has(b.id),
    })),
    lignes,
    totauxParBoutique,
    totalGeneral,
  });
}
