import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const article = await prisma.article.create({
    data: {
      nom,
      reference: body.reference?.trim() || null,
      categorie: body.categorie?.trim() || null,
      prixDefaut: Number(body.prixDefaut) || 0,
    },
  });
  return NextResponse.json(article, { status: 201 });
}
