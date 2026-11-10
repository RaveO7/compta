import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFrais } from "@/lib/frais";
import { formatMois } from "@/lib/format";
import { moisDansPeriode } from "@/lib/periode";

function lireCle(boutiqueId: unknown, mois: unknown) {
  const id = Number(boutiqueId);
  const m = String(mois ?? "");
  return id && /^\d{4}-\d{2}$/.test(m) ? { boutiqueId: id, mois: m } : null;
}

// Frais d'envoi d'une boutique pour un mois (0 si aucun envoi)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cle = lireCle(searchParams.get("boutiqueId"), searchParams.get("mois"));
  if (!cle) {
    return NextResponse.json(
      { error: "boutiqueId et mois (YYYY-MM) sont requis." },
      { status: 400 },
    );
  }
  const frais = await prisma.fraisEnvoi.findUnique({
    where: { boutiqueId_mois: cle },
  });
  return NextResponse.json({ montant: frais?.montant ?? 0 });
}

// Enregistre le montant ; 0 ou vide supprime le frais du mois
export async function PUT(request: Request) {
  const body = await request.json();
  const cle = lireCle(body.boutiqueId, body.mois);
  const montant = lireFrais(body.montant);
  if (!cle || montant === null) {
    return NextResponse.json(
      { error: "boutiqueId, mois (YYYY-MM) et un montant positif sont requis." },
      { status: 400 },
    );
  }
  if (montant === 0) {
    await prisma.fraisEnvoi
      .delete({ where: { boutiqueId_mois: cle } })
      .catch(() => null);
    return NextResponse.json({ montant: 0 });
  }
  // Pas de saisie hors de la période d'ouverture de la boutique
  const boutique = await prisma.boutique.findUnique({
    where: { id: cle.boutiqueId },
    select: { dateDebut: true, dateFin: true },
  });
  if (!boutique) {
    return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
  }
  if (!moisDansPeriode(cle.mois, boutique)) {
    return NextResponse.json(
      {
        error: `${formatMois(cle.mois)} est en dehors de la période d'ouverture de la boutique.`,
      },
      { status: 400 },
    );
  }

  const frais = await prisma.fraisEnvoi.upsert({
    where: { boutiqueId_mois: cle },
    update: { montant },
    create: { ...cle, montant },
  });
  return NextResponse.json({ montant: frais.montant });
}
