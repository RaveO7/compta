import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFrais } from "@/lib/frais";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.nom === "string") data.nom = body.nom.trim();
  if ("reference" in body) data.reference = body.reference?.trim() || null;
  if ("categorie" in body) data.categorie = body.categorie?.trim() || null;
  if ("prixDefaut" in body) data.prixDefaut = Number(body.prixDefaut) || 0;
  if ("coutUnitaire" in body) {
    const cout = lireFrais(body.coutUnitaire);
    if (cout === null) {
      return NextResponse.json(
        { error: "Le coût de fabrication doit être un montant positif." },
        { status: 400 },
      );
    }
    data.coutUnitaire = cout;
  }

  const article = await prisma.article.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json(article);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.article.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
