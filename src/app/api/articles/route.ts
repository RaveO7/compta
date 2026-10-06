import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFrais } from "@/lib/frais";

export async function GET() {
  const articles = await prisma.article.findMany({
    orderBy: { nom: "asc" },
    include: { prix: true },
  });
  return NextResponse.json(articles);
}

export async function POST(request: Request) {
  const body = await request.json();
  const nom = (body.nom ?? "").trim();
  if (!nom) {
    return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });
  }
  const coutUnitaire = lireFrais(body.coutUnitaire);
  if (coutUnitaire === null) {
    return NextResponse.json(
      { error: "Le coût de fabrication doit être un montant positif." },
      { status: 400 },
    );
  }
  const article = await prisma.article.create({
    data: {
      nom,
      reference: body.reference?.trim() || null,
      categorie: body.categorie?.trim() || null,
      prixDefaut: Number(body.prixDefaut) || 0,
      coutUnitaire,
    },
  });
  return NextResponse.json(article, { status: 201 });
}
