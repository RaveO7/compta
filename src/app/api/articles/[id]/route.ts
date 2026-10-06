import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.nom === "string") data.nom = body.nom.trim();
  if ("reference" in body) data.reference = body.reference?.trim() || null;
  if ("prixDefaut" in body) data.prixDefaut = Number(body.prixDefaut) || 0;

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
