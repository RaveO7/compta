import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: [".env.local", ".env"], quiet: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function moisIlYA(n: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function alea(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Réinitialisation des données…");
  await prisma.entree.deleteMany();
  await prisma.prix.deleteMany();
  await prisma.article.deleteMany();
  await prisma.boutique.deleteMany();

  const boutiques = await Promise.all([
    prisma.boutique.create({
      data: { nom: "Boutique du Centre", contact: "Marie · 06 12 34 56 78", adresse: "12 rue de la Paix, Lyon" },
    }),
    prisma.boutique.create({
      data: { nom: "Concept Store Nord", contact: "Julien · contact@conceptnord.fr", adresse: "5 avenue Foch, Lille" },
    }),
    prisma.boutique.create({
      data: { nom: "Marché des Créateurs", contact: "Stand 14", adresse: "Place Bellecour, Lyon" },
    }),
  ]);

  const articles = await Promise.all([
    prisma.article.create({ data: { nom: "Bougie parfumée", reference: "BG-01", prixDefaut: 12.5 } }),
    prisma.article.create({ data: { nom: "Savon artisanal", reference: "SV-02", prixDefaut: 6.0 } }),
    prisma.article.create({ data: { nom: "Carnet relié", reference: "CR-03", prixDefaut: 9.9 } }),
    prisma.article.create({ data: { nom: "Mug céramique", reference: "MG-04", prixDefaut: 15.0 } }),
    prisma.article.create({ data: { nom: "Tote bag coton", reference: "TB-05", prixDefaut: 11.0 } }),
  ]);

  // Quelques prix spécifiques par boutique
  await prisma.prix.create({
    data: { articleId: articles[0].id, boutiqueId: boutiques[1].id, valeur: 14.0 },
  });
  await prisma.prix.create({
    data: { articleId: articles[3].id, boutiqueId: boutiques[2].id, valeur: 13.5 },
  });

  // Suivi des 6 derniers mois
  for (let m = 5; m >= 0; m--) {
    const mois = moisIlYA(m);
    for (const boutique of boutiques) {
      for (const article of articles) {
        if (Math.random() < 0.25) continue; // certains articles non envoyés
        const prixSpe = await prisma.prix.findUnique({
          where: {
            articleId_boutiqueId: {
              articleId: article.id,
              boutiqueId: boutique.id,
            },
          },
        });
        const prixUnitaire = prixSpe?.valeur ?? article.prixDefaut;
        const envoye = alea(5, 30);
        const vendu = alea(0, envoye);
        await prisma.entree.create({
          data: {
            boutiqueId: boutique.id,
            articleId: article.id,
            mois,
            envoye,
            vendu,
            prixUnitaire,
          },
        });
      }
    }
  }

  console.log("Données de démonstration créées ✓");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
