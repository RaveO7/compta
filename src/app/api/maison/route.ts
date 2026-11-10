import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stockDe, stockParArticle } from "@/lib/stock-maison";

// Stock à la maison de chaque article (fabriqué − envoyé en boutique ± sorties
// et inventaires), avec le reste en boutique, plus les derniers mouvements.
export async function GET() {
  const [articles, stocks, mouvements] = await Promise.all([
    prisma.article.findMany({ orderBy: { nom: "asc" } }),
    stockParArticle(),
    prisma.mouvementMaison.findMany({
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 100,
      include: { article: { select: { nom: true } } },
    }),
  ]);

  const lignes = articles.map((a) => ({
    articleId: a.id,
    nom: a.nom,
    reference: a.reference,
    categorie: a.categorie,
    prixDefaut: a.prixDefaut,
    ...stockDe(stocks, a.id),
  }));

  return NextResponse.json({
    lignes,
    mouvements: mouvements.map((m) => ({
      id: m.id,
      articleId: m.articleId,
      nom: m.article.nom,
      date: m.date,
      type: m.type,
      quantite: m.quantite,
      note: m.note,
    })),
  });
}
