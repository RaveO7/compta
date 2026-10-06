import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Bilan des envois / ventes par article, mois par mois, avec totaux et reste.
// ?boutiqueId=X  -> une boutique précise. Sinon -> toutes les boutiques cumulées.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boutiqueIdParam = searchParams.get("boutiqueId");
  const boutiqueId = boutiqueIdParam ? Number(boutiqueIdParam) : null;

  const entrees = await prisma.entree.findMany({
    where: boutiqueId ? { boutiqueId } : undefined,
    include: { article: true },
  });

  // Ensemble des mois présents
  const moisSet = new Set<string>();
  for (const e of entrees) moisSet.add(e.mois);
  const mois = [...moisSet].sort();

  type Ligne = {
    articleId: number;
    nom: string;
    reference: string | null;
    parMois: Record<string, { envoye: number; vendu: number }>;
    totalEnvoye: number;
    totalVendu: number;
    reste: number;
    ca: number;
  };

  const map = new Map<number, Ligne>();

  for (const e of entrees) {
    let ligne = map.get(e.articleId);
    if (!ligne) {
      ligne = {
        articleId: e.articleId,
        nom: e.article.nom,
        reference: e.article.reference,
        parMois: {},
        totalEnvoye: 0,
        totalVendu: 0,
        reste: 0,
        ca: 0,
      };
      map.set(e.articleId, ligne);
    }
    const cellule = ligne.parMois[e.mois] ?? { envoye: 0, vendu: 0 };
    cellule.envoye += e.envoye;
    cellule.vendu += e.vendu;
    ligne.parMois[e.mois] = cellule;
    ligne.totalEnvoye += e.envoye;
    ligne.totalVendu += e.vendu;
    ligne.ca += e.vendu * e.prixUnitaire;
  }

  const lignes = [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom));
  for (const l of lignes) l.reste = l.totalEnvoye - l.totalVendu;

  // Totaux par mois + total général
  const totauxParMois: Record<string, { envoye: number; vendu: number }> = {};
  for (const m of mois) totauxParMois[m] = { envoye: 0, vendu: 0 };
  let totalEnvoye = 0;
  let totalVendu = 0;
  let totalCa = 0;
  for (const l of lignes) {
    for (const m of mois) {
      const c = l.parMois[m];
      if (c) {
        totauxParMois[m].envoye += c.envoye;
        totauxParMois[m].vendu += c.vendu;
      }
    }
    totalEnvoye += l.totalEnvoye;
    totalVendu += l.totalVendu;
    totalCa += l.ca;
  }

  return NextResponse.json({
    mois,
    lignes,
    totauxParMois,
    totalGeneral: {
      envoye: totalEnvoye,
      vendu: totalVendu,
      reste: totalEnvoye - totalVendu,
      ca: totalCa,
    },
  });
}
