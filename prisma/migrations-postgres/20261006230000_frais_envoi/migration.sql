-- CreateTable
CREATE TABLE "FraisEnvoi" (
    "id" SERIAL NOT NULL,
    "boutiqueId" INTEGER NOT NULL,
    "mois" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraisEnvoi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FraisEnvoi_boutiqueId_mois_key" ON "FraisEnvoi"("boutiqueId", "mois");

-- AddForeignKey
ALTER TABLE "FraisEnvoi" ADD CONSTRAINT "FraisEnvoi_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
