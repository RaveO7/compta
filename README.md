# Ma Compta — Suivi des ventes & envois par boutique

Application web (Next.js) pour gérer la comptabilité de vos ventes d'articles
auprès de différentes boutiques : suivi des envois et des ventes mois par mois,
prix différents selon la boutique, et vue d'ensemble avec graphiques.

## Fonctionnalités

- **Vue d'ensemble** : CA total, CA du mois, graphique du chiffre d'affaires sur
  12 mois, répartition par boutique, top articles.
- **Suivi mensuel** : pour une boutique et un mois donnés, saisie rapide des
  quantités **envoyées** et **vendues**, calcul automatique du chiffre d'affaires
  et des invendus.
- **Boutiques** : ajout / modification / suppression.
- **Articles** : ajout / modification, prix par défaut **et prix spécifique par
  boutique**.

## Stack technique

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS v4
- Prisma 7 + SQLite (base de données locale dans un fichier `dev.db`)
- Recharts (graphiques)

## Démarrage

```bash
npm install          # installe les dépendances
npm run db:migrate   # crée / met à jour la base de données
npm run db:seed      # (optionnel) ajoute des données de démonstration
npm run dev          # lance le site sur http://localhost:3000
```

## Scripts utiles

| Commande            | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Serveur de développement                      |
| `npm run build`     | Build de production                           |
| `npm run start`     | Lance le build de production                  |
| `npm run db:seed`   | Remplit la base avec des données d'exemple    |
| `npm run db:studio` | Ouvre Prisma Studio (explorateur de la base)  |

## Données

Toutes les données sont stockées **en local** dans le fichier `dev.db`
(SQLite). Pensez à le sauvegarder régulièrement. Le modèle de données :

- **Boutique** — un point de vente.
- **Article** — un produit, avec un prix par défaut.
- **Prix** — un prix spécifique d'un article pour une boutique donnée.
- **Entree** — le suivi d'un article, pour une boutique, sur un mois
  (quantité envoyée, quantité vendue, prix unitaire appliqué).
