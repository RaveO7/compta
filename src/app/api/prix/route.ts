import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Définit (ou met à jour) le prix d'un article pour une boutique
export async function PUT(request: Request) {
  const body = await request.json();
  const articleId = Number(body.articleId);
  const boutiqueId = Number(body.boutiqueId);
  const valeur = Number(body.valeur);

  if (!articleId || !boutiqueId || Number.isNaN(valeur)) {
    return NextResponse.json(
      { error: "articleId, boutiqueId et valeur sont requis." },
      { status: 400 },
    );
  }

  const prix = await prisma.prix.upsert({
    where: { articleId_boutiqueId: { articleId, boutiqueId } },
    update: { valeur },
    create: { articleId, boutiqueId, valeur },
  });
  return NextResponse.json(prix);
}

// Supprime le prix spécifique (retour au prix par défaut)
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = Number(searchParams.get("articleId"));
  const boutiqueId = Number(searchParams.get("boutiqueId"));
  if (!articleId || !boutiqueId) {
    return NextResponse.json(
      { error: "articleId et boutiqueId sont requis." },
      { status: 400 },
    );
  }
  await prisma.prix
    .delete({ where: { articleId_boutiqueId: { articleId, boutiqueId } } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
