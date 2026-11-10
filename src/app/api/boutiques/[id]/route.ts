import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFrais, lirePaliers } from "@/lib/frais";
import { formatMois } from "@/lib/format";
import { lirePeriode, moisDe } from "@/lib/periode";

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

  if ("dateDebut" in body || "dateFin" in body) {
    const boutiqueId = Number(id);
    const [actuelle, saisies, envois] = await Promise.all([
      prisma.boutique.findUnique({
        where: { id: boutiqueId },
        select: { dateDebut: true, dateFin: true },
      }),
      prisma.entree.aggregate({
        where: { boutiqueId },
        _min: { mois: true },
        _max: { mois: true },
      }),
      prisma.fraisEnvoi.aggregate({
        where: { boutiqueId },
        _min: { mois: true },
        _max: { mois: true },
      }),
    ]);
    if (!actuelle)
      return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
    const periode = lirePeriode(body, actuelle);
    if ("erreur" in periode)
      return NextResponse.json({ error: periode.erreur }, { status: 400 });

    // Les ventes / envois déjà saisis doivent rester dans la période
    const nomMois = (m: string) => formatMois(m).toLowerCase();
    const premier = [saisies._min.mois, envois._min.mois]
      .filter((m): m is string => !!m)
      .sort()[0];
    const dernier = [saisies._max.mois, envois._max.mois]
      .filter((m): m is string => !!m)
      .sort()
      .pop();
    if (premier && premier < moisDe(periode.dateDebut))
      return NextResponse.json(
        {
          error: `Le suivi contient des saisies dès ${nomMois(premier)} : la date d'ouverture doit être en ${nomMois(premier)} ou avant.`,
        },
        { status: 400 },
      );
    if (dernier && periode.dateFin && dernier > moisDe(periode.dateFin))
      return NextResponse.json(
        {
          error: `Le suivi contient des saisies jusqu'en ${nomMois(dernier)} : la date de fermeture doit être en ${nomMois(dernier)} ou après.`,
        },
        { status: 400 },
      );
    data.dateDebut = periode.dateDebut;
    data.dateFin = periode.dateFin;
  }

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
