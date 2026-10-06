-- CreateTable
CREATE TABLE "Boutique" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "adresse" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "reference" TEXT,
    "prixDefaut" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Prix" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "boutiqueId" INTEGER NOT NULL,
    "valeur" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prix_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prix_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entree" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "boutiqueId" INTEGER NOT NULL,
    "articleId" INTEGER NOT NULL,
    "mois" TEXT NOT NULL,
    "envoye" INTEGER NOT NULL DEFAULT 0,
    "vendu" INTEGER NOT NULL DEFAULT 0,
    "prixUnitaire" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Entree_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Entree_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Prix_articleId_boutiqueId_key" ON "Prix"("articleId", "boutiqueId");

-- CreateIndex
CREATE INDEX "Entree_mois_idx" ON "Entree"("mois");

-- CreateIndex
CREATE UNIQUE INDEX "Entree_boutiqueId_articleId_mois_key" ON "Entree"("boutiqueId", "articleId", "mois");
