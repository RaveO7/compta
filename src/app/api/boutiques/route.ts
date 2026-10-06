import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const boutique = await prisma.boutique.create({
    data: {
      nom,
      contact: body.contact?.trim() || null,
      adresse: body.adresse?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(boutique, { status: 201 });
}
