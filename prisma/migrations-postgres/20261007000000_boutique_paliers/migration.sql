-- AlterTable
ALTER TABLE "Boutique" ADD COLUMN "paliersLoyer" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "paliersCommission" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "commissionParTranches" BOOLEAN NOT NULL DEFAULT false;
