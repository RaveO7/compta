import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFrais, lirePaliers } from "@/lib/frais";

// Par défaut : boutiques actives uniquement. `?toutes=1` inclut les archivées.
export async function GET(request: Request) {
  const toutes = new URL(request.url).searchParams.get("toutes") === "1";
  const boutiques = await prisma.boutique.findMany({
    where: toutes ? undefined : { archivee: false },
    orderBy: [{ archivee: "asc" }, { nom: "asc" }],
  });
  return NextResponse.json(boutiques);
}

export async function POST(request: Request) {
  const body = await request.json();
  const nom = (body.nom ?? "").trim();
  if (!nom) {
    return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });
  }
  const loyerMensuel = lireFrais(body.loyerMensuel);
  const commission = lireFrais(body.commission, 100);
  if (loyerMensuel === null || commission === null) {
    return NextResponse.json(
      { error: "Loyer ou commission invalide." },
      { status: 400 },
    );
  }
  const paliersLoyer = lirePaliers(body.paliersLoyer);
  const paliersCommission = lirePaliers(body.paliersCommission, 100);
  if (paliersLoyer === null || paliersCommission === null) {
    return NextResponse.json(
      { error: "Conditions invalides : seuil > 0 et différent pour chaque condition." },
      { status: 400 },
    );
  }
  const boutique = await prisma.boutique.create({
    data: {
      loyerMensuel,
      commission,
      paliersLoyer,
      paliersCommission,
      commissionParTranches: body.commissionParTranches === true,
      nom,
      contact: body.contact?.trim() || null,
      adresse: body.adresse?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(boutique, { status: 201 });
}
