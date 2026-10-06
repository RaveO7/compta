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
  if ("contact" in body) data.contact = body.contact?.trim() || null;
  if ("adresse" in body) data.adresse = body.adresse?.trim() || null;
  if ("notes" in body) data.notes = body.notes?.trim() || null;

  const boutique = await prisma.boutique.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json(boutique);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.boutique.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
