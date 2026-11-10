import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supprime = await prisma.mouvementMaison
    .delete({ where: { id: Number(id) } })
    .catch(() => null);
  if (!supprime) {
    return NextResponse.json({ error: "Mouvement introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
