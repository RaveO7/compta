-- AlterTable
ALTER TABLE "Article" ADD COLUMN "categorie" TEXT;

-- CreateIndex
CREATE INDEX "Article_categorie_idx" ON "Article"("categorie");
