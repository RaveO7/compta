import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aujourdhui, lireDate } from "@/lib/periode";
import {
  TYPES_SAISIE,
  lireCorps,
  lireEntier,
  type TypeSaisie,
} from "@/lib/stock-maison";

// Ajoute une fabrication (+) ou une sortie hors boutique (−) au stock maison.
// La quantité saisie est toujours positive ; le signe dépend du type.
export async function POST(request: Request) {
  const body = await lireCorps(request);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const articleId = lireEntier(body.articleId);
  const type = body.type as TypeSaisie;
  const quantite = lireEntier(body.quantite);
  const date = lireDate(body.date || aujourdhui());
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";

  if (articleId === null || articleId <= 0) {
    return NextResponse.json({ error: "Article requis." }, { status: 400 });
  }
  if (!TYPES_SAISIE.includes(type)) {
    return NextResponse.json({ error: "Type de mouvement invalide." }, { status: 400 });
  }
  if (quantite === null || quantite < 1 || quantite > 100000) {
    return NextResponse.json(
      { error: "La quantité doit être un nombre entier positif." },
      { status: 400 },
    );
  }
  if (!date) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }

  const mouvement = await prisma.mouvementMaison.create({
    data: {
      articleId,
      type,
      quantite: type === "sortie" ? -quantite : quantite,
      date,
      note: note || null,
    },
  });
  return NextResponse.json(mouvement, { status: 201 });
}
