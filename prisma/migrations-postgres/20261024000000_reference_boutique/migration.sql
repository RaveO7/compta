-- CreateTable
CREATE TABLE "ReferenceBoutique" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "boutiqueId" INTEGER NOT NULL,
    "valeur" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceBoutique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceBoutique_valeur_idx" ON "ReferenceBoutique"("valeur");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceBoutique_articleId_boutiqueId_key" ON "ReferenceBoutique"("articleId", "boutiqueId");

-- AddForeignKey
ALTER TABLE "ReferenceBoutique" ADD CONSTRAINT "ReferenceBoutique_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceBoutique" ADD CONSTRAINT "ReferenceBoutique_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
