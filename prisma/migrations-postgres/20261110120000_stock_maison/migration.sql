-- CreateTable
CREATE TABLE "MouvementMaison" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementMaison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MouvementMaison_articleId_idx" ON "MouvementMaison"("articleId");

-- CreateIndex
CREATE INDEX "MouvementMaison_date_idx" ON "MouvementMaison"("date");

-- AddForeignKey
ALTER TABLE "MouvementMaison" ADD CONSTRAINT "MouvementMaison_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

