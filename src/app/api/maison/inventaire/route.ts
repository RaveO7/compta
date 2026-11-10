import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aujourdhui, lireDate } from "@/lib/periode";
import { stockDe, stockParArticle } from "@/lib/stock-maison";

// Inventaire : pour chaque article compté, enregistre l'écart entre la quantité
// réellement présente à la maison et le stock calculé. Le stock calculé est
// relu ici (et non envoyé par la page) pour rester juste même si la page est
// ouverte depuis longtemps.
// body : { date?: "YYYY-MM-DD", comptes: [{ articleId, quantite }] }
export async function POST(request: Request) {
  const body = await request.json();
  const date = lireDate(body.date || aujourdhui());
  if (!date) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  if (!Array.isArray(body.comptes) || body.comptes.length === 0) {
    return NextResponse.json(
      { error: "Aucune quantité comptée." },
      { status: 400 },
    );
  }

  const comptes = new Map<number, number>();
  for (const c of body.comptes) {
    const articleId = Number(c?.articleId);
    const quantite = Number(c?.quantite);
    if (
      !Number.isInteger(articleId) ||
      !Number.isInteger(quantite) ||
      quantite < 0 ||
      quantite > 100000
    ) {
      return NextResponse.json(
        { error: "Les quantités comptées doivent être des nombres entiers positifs." },
        { status: 400 },
      );
    }
    comptes.set(articleId, quantite);
  }

  const ids = [...comptes.keys()];
  const [articles, stocks] = await Promise.all([
    prisma.article.findMany({ where: { id: { in: ids } }, select: { id: true } }),
    stockParArticle(ids),
  ]);

  const data = articles.flatMap((a) => {
    const compte = comptes.get(a.id)!;
    const calcule = stockDe(stocks, a.id).maison;
    const ecart = compte - calcule;
    if (ecart === 0) return [];
    return [
      {
        articleId: a.id,
        type: "inventaire",
        quantite: ecart,
        date,
        note: `Compté ${compte}, calculé ${calcule}`,
      },
    ];
  });

  if (data.length > 0) await prisma.mouvementMaison.createMany({ data });
  return NextResponse.json({ ok: true, corriges: data.length });
}
