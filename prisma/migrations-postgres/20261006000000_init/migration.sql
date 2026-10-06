-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Boutique" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "adresse" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Boutique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "reference" TEXT,
    "prixDefaut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prix" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "boutiqueId" INTEGER NOT NULL,
    "valeur" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entree" (
    "id" SERIAL NOT NULL,
    "boutiqueId" INTEGER NOT NULL,
    "articleId" INTEGER NOT NULL,
    "mois" TEXT NOT NULL,
    "envoye" INTEGER NOT NULL DEFAULT 0,
    "vendu" INTEGER NOT NULL DEFAULT 0,
    "prixUnitaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entree_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prix_articleId_boutiqueId_key" ON "Prix"("articleId", "boutiqueId");

-- CreateIndex
CREATE INDEX "Entree_mois_idx" ON "Entree"("mois");

-- CreateIndex
CREATE UNIQUE INDEX "Entree_boutiqueId_articleId_mois_key" ON "Entree"("boutiqueId", "articleId", "mois");

-- AddForeignKey
ALTER TABLE "Prix" ADD CONSTRAINT "Prix_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prix" ADD CONSTRAINT "Prix_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entree" ADD CONSTRAINT "Entree_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entree" ADD CONSTRAINT "Entree_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

