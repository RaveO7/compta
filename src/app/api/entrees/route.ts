import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Renvoie, pour un mois et une boutique donnés, la liste de tous les articles
// avec la saisie (envoyé / vendu / prix) existante le cas échéant.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mois = searchParams.get("mois");
  const boutiqueId = Number(searchParams.get("boutiqueId"));

  if (!mois || !boutiqueId) {
    return NextResponse.json(
      { error: "mois et boutiqueId sont requis." },
      { status: 400 },
    );
  }

  const [articles, prixBoutique, entrees] = await Promise.all([
    prisma.article.findMany({ orderBy: { nom: "asc" } }),
    prisma.prix.findMany({ where: { boutiqueId } }),
    prisma.entree.findMany({ where: { boutiqueId, mois } }),
  ]);

  const prixMap = new Map(prixBoutique.map((p) => [p.articleId, p.valeur]));
  const entreeMap = new Map(entrees.map((e) => [e.articleId, e]));

  const lignes = articles.map((article) => {
    const entree = entreeMap.get(article.id);
    const prixEffectif = prixMap.get(article.id) ?? article.prixDefaut;
    return {
      articleId: article.id,
      nom: article.nom,
      reference: article.reference,
      prixEffectif,
      envoye: entree?.envoye ?? 0,
      vendu: entree?.vendu ?? 0,
      prixUnitaire: entree?.prixUnitaire ?? prixEffectif,
      saisi: Boolean(entree),
    };
  });

  return NextResponse.json(lignes);
}

// Crée / met à jour / supprime une ligne de suivi mensuel.
export async function POST(request: Request) {
  const body = await request.json();
  const boutiqueId = Number(body.boutiqueId);
  const articleId = Number(body.articleId);
  const mois = String(body.mois ?? "");
  const envoye = Math.max(0, Math.round(Number(body.envoye) || 0));
  const vendu = Math.max(0, Math.round(Number(body.vendu) || 0));

  if (!boutiqueId || !articleId || !/^\d{4}-\d{2}$/.test(mois)) {
    return NextResponse.json(
      { error: "boutiqueId, articleId et mois (YYYY-MM) sont requis." },
      { status: 400 },
    );
  }

  // Prix unitaire : valeur fournie, sinon prix boutique, sinon prix par défaut
  let prixUnitaire = Number(body.prixUnitaire);
  if (Number.isNaN(prixUnitaire)) {
    const prix = await prisma.prix.findUnique({
      where: { articleId_boutiqueId: { articleId, boutiqueId } },
    });
    if (prix) {
      prixUnitaire = prix.valeur;
    } else {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
      });
      prixUnitaire = article?.prixDefaut ?? 0;
    }
  }

  // Rien à enregistrer : on supprime l'éventuelle ligne existante
  if (envoye === 0 && vendu === 0) {
    await prisma.entree
      .delete({ where: { boutiqueId_articleId_mois: { boutiqueId, articleId, mois } } })
      .catch(() => null);
    return NextResponse.json({ ok: true, supprime: true });
  }

  const entree = await prisma.entree.upsert({
    where: { boutiqueId_articleId_mois: { boutiqueId, articleId, mois } },
    update: { envoye, vendu, prixUnitaire },
    create: { boutiqueId, articleId, mois, envoye, vendu, prixUnitaire },
  });
  return NextResponse.json(entree);
}
