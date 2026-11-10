-- Période d'activité des boutiques : date d'ouverture (obligatoire) et date de
-- fermeture (facultative). Remplace le booléen "archivee".

ALTER TABLE "Boutique" ADD COLUMN "dateDebut" DATE;
ALTER TABLE "Boutique" ADD COLUMN "dateFin" DATE;

-- Ouverture : jour de création, ou le 1er du premier mois saisi s'il est
-- antérieur (historique rétroactif). Toutes les saisies restent dans la période.
-- LEAST ignore les NULL (boutique sans aucune saisie).
UPDATE "Boutique" b
SET "dateDebut" = LEAST(
  b."createdAt"::date,
  (SELECT MIN(TO_DATE(e."mois", 'YYYY-MM')) FROM "Entree" e WHERE e."boutiqueId" = b."id"),
  (SELECT MIN(TO_DATE(f."mois", 'YYYY-MM')) FROM "FraisEnvoi" f WHERE f."boutiqueId" = b."id")
);

-- Boutiques archivées → fermées : fin du dernier mois saisi, à défaut le jour
-- de la dernière modification (≈ date d'archivage).
UPDATE "Boutique" b
SET "dateFin" = COALESCE(
  (
    TO_DATE(
      GREATEST(
        (SELECT MAX(e."mois") FROM "Entree" e WHERE e."boutiqueId" = b."id"),
        (SELECT MAX(f."mois") FROM "FraisEnvoi" f WHERE f."boutiqueId" = b."id")
      ),
      'YYYY-MM'
    ) + INTERVAL '1 month' - INTERVAL '1 day'
  )::date,
  b."updatedAt"::date
)
WHERE b."archivee" = true;

ALTER TABLE "Boutique" ALTER COLUMN "dateDebut" SET NOT NULL;
ALTER TABLE "Boutique" ALTER COLUMN "dateDebut" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Boutique" DROP COLUMN "archivee";
