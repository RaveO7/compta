import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFrais, lirePaliers } from "@/lib/frais";

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
  if (typeof body.archivee === "boolean") data.archivee = body.archivee;
  if ("loyerMensuel" in body) {
    const v = lireFrais(body.loyerMensuel);
    if (v === null)
      return NextResponse.json({ error: "Loyer invalide." }, { status: 400 });
    data.loyerMensuel = v;
  }
  if ("commission" in body) {
    const v = lireFrais(body.commission, 100);
    if (v === null)
      return NextResponse.json(
        { error: "La commission doit être entre 0 et 100 %." },
        { status: 400 },
      );
    data.commission = v;
  }
  for (const [champ, max] of [
    ["paliersLoyer", Infinity],
    ["paliersCommission", 100],
  ] as const) {
    if (!(champ in body)) continue;
    const v = lirePaliers(body[champ], max);
    if (v === null)
      return NextResponse.json(
        { error: "Conditions invalides : seuil > 0 et différent pour chaque condition." },
        { status: 400 },
      );
    data[champ] = v;
  }
  if (typeof body.commissionParTranches === "boolean")
    data.commissionParTranches = body.commissionParTranches;

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
