import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  formatMontant,
  formatMois,
  derniersMois,
  moisActuel,
} from "@/lib/format";
import {
  GraphiqueMensuel,
  GraphiqueBoutiques,
  GraphiqueFluxStock,
  GraphiqueStockArticles,
} from "@/components/DashboardCharts";
import { montantCommission } from "@/lib/frais";

export const dynamic = "force-dynamic";

function StatCard({
  titre,
  valeur,
  sousTitre,
  accent,
}: {
  titre: string;
  valeur: string;
  sousTitre?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {titre}
      </p>
      <p
        className={`text-3xl font-bold tabular-nums mt-2 ${accent ? "text-[var(--primary)]" : ""}`}
      >
        {valeur}
      </p>
      {sousTitre && (
        <p className="text-sm text-[var(--muted)] mt-1">{sousTitre}</p>
      )}
    </div>
  );
}

const SANS_CATEGORIE = "__aucune__";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const param = (await searchParams).categorie;
  const categorie = typeof param === "string" && param ? param : null;
  const filtreArticle: Prisma.ArticleWhereInput =
    categorie === null
      ? {}
      : { categorie: categorie === SANS_CATEGORIE ? null : categorie };

  const [entrees, nbBoutiques, nbArticles, categoriesDb, aSansCategorie] =
    await Promise.all([
      prisma.entree.findMany({
        where: { article: filtreArticle },
        include: { boutique: true, article: true },
      }),
      prisma.boutique.count({ where: { archivee: false } }),
      prisma.article.count({ where: filtreArticle }),
      prisma.article.findMany({
        where: { categorie: { not: null } },
        distinct: ["categorie"],
        select: { categorie: true },
        orderBy: { categorie: "asc" },
      }),
      prisma.article.count({ where: { categorie: null } }),
    ]);
  const categories = categoriesDb
    .map((c) => c.categorie)
    .filter((c): c is string => !!c);

  const moisCourant = moisActuel();

  // Totaux globaux
  let caTotal = 0;
  let venduTotal = 0;
  let envoyeTotal = 0;
  // Mois courant
  let caMois = 0;
  let venduMois = 0;
  let envoyeMois = 0;

  // Agrégations
  const parMoisMap = new Map<string, { ca: number; vendu: number; envoye: number }>();
  const parBoutiqueMap = new Map<
    string,
    { ca: number; vendu: number; frais: number; materiel: number }
  >();
  // Frais boutiques : commission sur chaque vente + loyer pour chaque mois où
  // la boutique a un suivi saisi. Avec un filtre de catégorie, le loyer (non
  // rattachable à une catégorie) n'est pas compté.
  let fraisTotal = 0;
  let fraisMois = 0;
  // Frais de fabrication (achat de matériel) des articles vendus
  let materielTotal = 0;
  let materielMois = 0;
  const moisAvecLoyer = new Set<string>();
  const parCategorieMap = new Map<string, { ca: number; vendu: number }>();
  const parArticleMap = new Map<
    string,
    { ca: number; vendu: number; envoye: number }
  >();

  for (const e of entrees) {
    const ca = e.vendu * e.prixUnitaire;
    let frais = montantCommission(ca, e.boutique);
    const cleLoyer = `${e.boutiqueId}|${e.mois}`;
    if (!categorie && !moisAvecLoyer.has(cleLoyer)) {
      moisAvecLoyer.add(cleLoyer);
      frais += e.boutique.loyerMensuel;
    }
    fraisTotal += frais;
    if (e.mois === moisCourant) fraisMois += frais;
    const materiel = e.vendu * e.article.coutUnitaire;
    materielTotal += materiel;
    if (e.mois === moisCourant) materielMois += materiel;
    caTotal += ca;
    venduTotal += e.vendu;
    envoyeTotal += e.envoye;

    if (e.mois === moisCourant) {
      caMois += ca;
      venduMois += e.vendu;
      envoyeMois += e.envoye;
    }

    const pm = parMoisMap.get(e.mois) ?? { ca: 0, vendu: 0, envoye: 0 };
    pm.ca += ca;
    pm.vendu += e.vendu;
    pm.envoye += e.envoye;
    parMoisMap.set(e.mois, pm);

    const pb = parBoutiqueMap.get(e.boutique.nom) ?? {
      ca: 0,
      vendu: 0,
      frais: 0,
      materiel: 0,
    };
    pb.ca += ca;
    pb.vendu += e.vendu;
    pb.frais += frais;
    pb.materiel += materiel;
    parBoutiqueMap.set(e.boutique.nom, pb);

    const nomCategorie = e.article.categorie ?? "Sans catégorie";
    const pc = parCategorieMap.get(nomCategorie) ?? { ca: 0, vendu: 0 };
    pc.ca += ca;
    pc.vendu += e.vendu;
    parCategorieMap.set(nomCategorie, pc);

    const pa = parArticleMap.get(e.article.nom) ?? { ca: 0, vendu: 0, envoye: 0 };
    pa.ca += ca;
    pa.vendu += e.vendu;
    pa.envoye += e.envoye;
    parArticleMap.set(e.article.nom, pa);
  }

  // Série des 12 derniers mois (chronologique)
  const serieMois = derniersMois(12)
    .reverse()
    .map((mois) => {
      const d = parMoisMap.get(mois) ?? { ca: 0, vendu: 0, envoye: 0 };
      return { mois, ...d };
    });

  const parBoutique = [...parBoutiqueMap.entries()]
    .map(([nom, v]) => ({ nom, ...v }))
    .sort((a, b) => b.ca - a.ca);

  const parCategorie = [...parCategorieMap.entries()]
    .map(([nom, v]) => ({ nom, ...v }))
    .sort((a, b) => b.ca - a.ca);

  const topArticles = [...parArticleMap.entries()]
    .map(([nom, v]) => ({ nom, ...v }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 5);

  // Stock restant par article (reste = envoyé - vendu), top par reste
  const stockArticles = [...parArticleMap.entries()]
    .map(([nom, v]) => ({
      nom,
      envoye: v.envoye,
      vendu: v.vendu,
      reste: Math.max(0, v.envoye - v.vendu),
    }))
    .sort((a, b) => b.reste - a.reste)
    .slice(0, 8);

  const resteTotal = Math.max(0, envoyeTotal - venduTotal);
  const tauxEcoulement =
    envoyeTotal > 0 ? Math.round((venduTotal / envoyeTotal) * 100) : 0;

  const aucuneDonnee = entrees.length === 0;
  const aDesCharges = fraisTotal > 0 || materielTotal > 0;

  const filtres = [
    { valeur: null, libelle: "Toutes" },
    ...categories.map((c) => ({ valeur: c, libelle: c })),
    ...(categories.length > 0 && aSansCategorie > 0
      ? [{ valeur: SANS_CATEGORIE, libelle: "Sans catégorie" }]
      : []),
  ];
  const libelleFiltre = filtres.find((f) => f.valeur === categorie)?.libelle;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Tableau de bord de vos ventes et envois.
          </p>
        </div>
        <Link href="/suivi" className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Saisir un suivi
        </Link>
      </div>

      {/* Filtre par catégorie d'article */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium text-[var(--muted)] mr-1">
            Catégorie :
          </span>
          {filtres.map((f) => (
            <Link
              key={f.libelle}
              href={
                f.valeur
                  ? `/?categorie=${encodeURIComponent(f.valeur)}`
                  : "/"
              }
              className={`btn btn-sm ${categorie === f.valeur ? "btn-primary" : "btn-secondary"}`}
            >
              {f.libelle}
            </Link>
          ))}
        </div>
      )}

      {/* Cartes statistiques */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          titre="CA total"
          valeur={formatMontant(caTotal)}
          sousTitre={`${venduTotal} articles vendus`}
          accent
        />
        <StatCard
          titre={`CA ${formatMois(moisCourant)}`}
          valeur={formatMontant(caMois)}
          sousTitre={`${venduMois} vendus · ${envoyeMois} envoyés`}
        />
        <StatCard
          titre="Boutiques"
          valeur={String(nbBoutiques)}
          sousTitre="Points de vente"
        />
        <StatCard
          titre={categorie ? `Articles · ${libelleFiltre ?? categorie}` : "Articles"}
          valeur={String(nbArticles)}
          sousTitre={`${envoyeTotal} envoyés au total`}
        />
      </div>

      {aDesCharges && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            titre="Frais boutiques"
            valeur={`− ${formatMontant(fraisTotal)}`}
            sousTitre={categorie ? "Commissions (hors loyers)" : "Loyers + commissions"}
          />
          <StatCard
            titre="Frais matériel"
            valeur={`− ${formatMontant(materielTotal)}`}
            sousTitre="Fabrication des articles vendus"
          />
          <StatCard
            titre="Net total"
            valeur={formatMontant(caTotal - fraisTotal - materielTotal)}
            sousTitre="CA − frais boutiques − matériel"
            accent
          />
          <StatCard
            titre={`Net ${formatMois(moisCourant)}`}
            valeur={formatMontant(caMois - fraisMois - materielMois)}
            sousTitre={`Frais : − ${formatMontant(fraisMois + materielMois)}`}
          />
        </div>
      )}

      {aucuneDonnee && categorie ? (
        <div className="card p-10 text-center">
          <p className="text-[var(--muted)]">
            Aucune vente ni envoi pour la catégorie « {libelleFiltre ?? categorie} ».
          </p>
          <Link href="/" className="btn btn-secondary mt-4">
            Voir toutes les catégories
          </Link>
        </div>
      ) : aucuneDonnee ? (
        <div className="card p-10 text-center">
          <h2 className="text-lg font-semibold">Bienvenue dans Ma Compta 👋</h2>
          <p className="text-[var(--muted)] mt-2 max-w-md mx-auto">
            Pour démarrer : créez vos boutiques, ajoutez vos articles (avec
            leurs prix), puis saisissez chaque mois ce que vous avez envoyé et
            vendu.
          </p>
          <div className="flex gap-2 justify-center mt-5 flex-wrap">
            <Link href="/boutiques" className="btn btn-secondary">
              1. Ajouter une boutique
            </Link>
            <Link href="/articles" className="btn btn-secondary">
              2. Ajouter un article
            </Link>
            <Link href="/suivi" className="btn btn-primary">
              3. Saisir un suivi
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Graphiques */}
          <div className="grid gap-4 lg:grid-cols-3 mb-6">
            <div className="card p-5 lg:col-span-2">
              <h2 className="font-semibold mb-1">Chiffre d&apos;affaires mensuel</h2>
              <p className="text-sm text-[var(--muted)] mb-4">
                12 derniers mois (barres : CA, ligne : quantités vendues)
              </p>
              <GraphiqueMensuel data={serieMois} />
            </div>
            <div className="card p-5">
              <h2 className="font-semibold mb-1">CA par boutique</h2>
              <p className="text-sm text-[var(--muted)] mb-4">Depuis le début</p>
              <GraphiqueBoutiques data={parBoutique} />
            </div>
          </div>

          {/* Répartition par catégorie (uniquement sans filtre) */}
          {!categorie && parCategorie.length > 1 && (
            <div className="card p-5 mb-6">
              <h2 className="font-semibold mb-1">CA par catégorie</h2>
              <p className="text-sm text-[var(--muted)] mb-4">
                Depuis le début — cliquez sur une catégorie en haut pour filtrer
              </p>
              <GraphiqueBoutiques data={parCategorie} />
            </div>
          )}

          {/* Stock & bilan */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-bold tracking-tight">Stock &amp; bilan</h2>
            <Link
              href="/stock"
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Voir le détail →
            </Link>
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              titre="Envoyé total"
              valeur={String(envoyeTotal)}
              sousTitre="Articles expédiés"
            />
            <StatCard
              titre="Vendu total"
              valeur={String(venduTotal)}
              sousTitre="Articles vendus"
            />
            <StatCard
              titre="Stock restant"
              valeur={String(resteTotal)}
              sousTitre="Envoyé non vendu"
            />
            <StatCard
              titre="Taux d'écoulement"
              valeur={`${tauxEcoulement} %`}
              sousTitre="Vendu / envoyé"
              accent
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <div className="card p-5">
              <h2 className="font-semibold mb-1">Flux mensuel envoyé / vendu</h2>
              <p className="text-sm text-[var(--muted)] mb-4">
                12 derniers mois (quantités)
              </p>
              <GraphiqueFluxStock data={serieMois} />
            </div>
            <div className="card p-5">
              <h2 className="font-semibold mb-1">Stock restant par article</h2>
              <p className="text-sm text-[var(--muted)] mb-4">
                Top 8 (vert : vendu, orange : reste)
              </p>
              <GraphiqueStockArticles data={stockArticles} />
            </div>
          </div>

          {/* Tableaux */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Top articles</h2>
              {topArticles.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Aucune vente.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topArticles.map((a, i) => (
                    <div key={a.nom} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm font-semibold text-[var(--muted)]">
                        {i + 1}
                      </span>
                      <span className="flex-1 font-medium truncate">
                        {a.nom}
                      </span>
                      <span className="text-sm text-[var(--muted)]">
                        {a.vendu} vendus
                      </span>
                      <span className="font-semibold tabular-nums w-24 text-right">
                        {formatMontant(a.ca)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="font-semibold mb-4">Détail par boutique</h2>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Boutique</th>
                      <th className="text-center">Vendus</th>
                      <th className="text-right">CA</th>
                      {aDesCharges && (
                        <>
                          <th className="text-right">Frais</th>
                          <th className="text-right">Net</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parBoutique.map((b) => (
                      <tr key={b.nom}>
                        <td className="font-medium">{b.nom}</td>
                        <td className="text-center tabular-nums">{b.vendu}</td>
                        <td className="text-right font-semibold tabular-nums">
                          {formatMontant(b.ca)}
                        </td>
                        {aDesCharges && (
                          <>
                            <td
                              className="text-right tabular-nums text-[var(--muted)]"
                              title={`Boutique : ${formatMontant(b.frais)} · Matériel : ${formatMontant(b.materiel)}`}
                            >
                              {b.frais + b.materiel > 0
                                ? `− ${formatMontant(b.frais + b.materiel)}`
                                : "—"}
                            </td>
                            <td className="text-right font-semibold tabular-nums">
                              {formatMontant(b.ca - b.frais - b.materiel)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
