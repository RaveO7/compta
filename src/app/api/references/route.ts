import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Définit (ou met à jour) la référence d'un article chez une boutique.
// Une référence vide supprime celle de la boutique.
export async function PUT(request: Request) {
  const body = await request.json();
  const articleId = Number(body.articleId);
  const boutiqueId = Number(body.boutiqueId);
  const valeur = String(body.valeur ?? "").trim();

  if (!articleId || !boutiqueId) {
    return NextResponse.json(
      { error: "articleId et boutiqueId sont requis." },
      { status: 400 },
    );
  }

  if (!valeur) {
    await prisma.referenceBoutique
      .delete({ where: { articleId_boutiqueId: { articleId, boutiqueId } } })
      .catch(() => null);
    return NextResponse.json({ ok: true, supprime: true });
  }

  const reference = await prisma.referenceBoutique.upsert({
    where: { articleId_boutiqueId: { articleId, boutiqueId } },
    update: { valeur },
    create: { articleId, boutiqueId, valeur },
  });
  return NextResponse.json(reference);
}
