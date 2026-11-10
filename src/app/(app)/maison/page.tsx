"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { correspond, formatMontant, formatNombre } from "@/lib/format";
import { aujourdhui } from "@/lib/periode";

type TypeMouvement = "fabrication" | "sortie" | "inventaire";
type TypeSaisie = Exclude<TypeMouvement, "inventaire">;

type Ligne = {
  articleId: number;
  nom: string;
  reference: string | null;
  categorie: string | null;
  prixDefaut: number;
  fabrique: number;
  sorties: number;
  inventaire: number;
  envoye: number;
  vendu: number;
  maison: number;
  enBoutique: number;
};
type Mouvement = {
  id: number;
  articleId: number;
  nom: string;
  date: string;
  type: TypeMouvement;
  quantite: number;
  note: string | null;
};
type Donnees = { lignes: Ligne[]; mouvements: Mouvement[] };

const TYPES: Record<TypeMouvement, { libelle: string; badge: string }> = {
  fabrication: { libelle: "Fabrication", badge: "badge-success" },
  sortie: { libelle: "Sortie", badge: "badge-warning" },
  inventaire: { libelle: "Inventaire", badge: "badge-primary" },
};

const SANS_CATEGORIE = "__aucune__";

// +3, −2, 0
function signe(n: number): string {
  if (n > 0) return `+${formatNombre(n)}`;
  if (n < 0) return `−${formatNombre(-n)}`;
  return "0";
}

function couleurStock(n: number): string {
  if (n < 0) return "text-[var(--danger)]";
  if (n === 0) return "text-[var(--muted)]";
  return "";
}

// Sorties et corrections d'inventaire cumulées (hors envois en boutique)
function ajustement(l: Ligne): number {
  return l.inventaire - l.sorties;
}

function somme(liste: Ligne[], f: (l: Ligne) => number): number {
  return liste.reduce((s, l) => s + f(l), 0);
}

// Les dates arrivent à minuit UTC ("2026-11-10T00:00:00.000Z")
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

function formulaireVide(type: TypeSaisie = "fabrication", articleId = "") {
  return { type, articleId, quantite: "", date: aujourdhui(), note: "" };
}

async function messageErreur(r: Response): Promise<string> {
  const corps = await r.json().catch(() => null);
  return corps?.error ?? "Erreur lors de l'enregistrement.";
}

function recuperer(): Promise<Donnees> {
  return fetch("/api/maison").then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
  );
}

export default function MaisonPage() {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("");
  const [masquerVides, setMasquerVides] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Modal fabrication / sortie
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(formulaireVide());
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  // Mode inventaire : les quantités comptées se saisissent dans le tableau
  const [inventaire, setInventaire] = useState(false);
  const [comptes, setComptes] = useState<Record<number, string>>({});
  const [dateInventaire, setDateInventaire] = useState(aujourdhui());
  const [erreurInventaire, setErreurInventaire] = useState<string | null>(null);

  useEffect(() => {
    recuperer()
      .then(setDonnees)
      .catch(() => setErreurChargement(true));
  }, []);

  async function charger() {
    try {
      setDonnees(await recuperer());
    } catch {
      setErreurChargement(true);
    }
  }

  const lignes = donnees?.lignes ?? [];
  const mouvements = donnees?.mouvements ?? [];

  const categories = [
    ...new Set(lignes.flatMap((l) => (l.categorie ? [l.categorie] : []))),
  ].sort((a, b) => a.localeCompare(b, "fr"));
  const aSansCategorie = lignes.some((l) => !l.categorie);
  // Si la catégorie filtrée n'existe plus, on affiche tout
  const filtreActif =
    categories.includes(filtre) || (filtre === SANS_CATEGORIE && aSansCategorie)
      ? filtre
      : "";

  const visibles = lignes.filter((l) => {
    const categorieOk =
      filtreActif === ""
        ? true
        : filtreActif === SANS_CATEGORIE
          ? !l.categorie
          : l.categorie === filtreActif;
    // En inventaire, tous les articles restent visibles pour pouvoir être comptés
    const stockOk =
      inventaire || !masquerVides || l.maison !== 0 || l.enBoutique !== 0;
    return categorieOk && stockOk && correspond(recherche, [l.nom, l.reference]);
  });

  const totalMaison = somme(lignes, (l) => l.maison);
  const totalBoutique = somme(lignes, (l) => l.enBoutique);
  const valeurMaison = somme(lignes, (l) => Math.max(0, l.maison) * l.prixDefaut);
  const nbArticlesMaison = lignes.filter((l) => l.maison > 0).length;
  const negatifs = lignes.filter((l) => l.maison < 0);

  const comptesSaisis = Object.entries(comptes).filter(
    ([, v]) => v.trim() !== "",
  );

  function ouvrirMouvement(type: TypeSaisie, articleId?: number) {
    setForm(formulaireVide(type, articleId ? String(articleId) : ""));
    setErreur(null);
    setOpen(true);
  }

  async function enregistrerMouvement(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur(null);
    const r = await fetch("/api/maison/mouvements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        articleId: Number(form.articleId),
        quantite: Number(form.quantite),
        date: form.date,
        note: form.note,
      }),
    });
    setEnregistrement(false);
    if (!r.ok) {
      setErreur(await messageErreur(r));
      return;
    }
    setOpen(false);
    setMessage(null);
    await charger();
  }

  async function supprimerMouvement(m: Mouvement) {
    if (
      !confirm(
        `Supprimer ce mouvement (${TYPES[m.type].libelle.toLowerCase()} ${signe(m.quantite)} × ${m.nom}) ? Le stock à la maison sera recalculé.`,
      )
    )
      return;
    await fetch(`/api/maison/mouvements/${m.id}`, { method: "DELETE" });
    setMessage(null);
    await charger();
  }

  function demarrerInventaire() {
    setComptes({});
    setDateInventaire(aujourdhui());
    setErreurInventaire(null);
    setMessage(null);
    setInventaire(true);
  }

  async function enregistrerInventaire() {
    const liste = comptesSaisis.map(([id, v]) => ({
      articleId: Number(id),
      quantite: Number(v),
    }));
    if (liste.some((c) => !Number.isInteger(c.quantite) || c.quantite < 0)) {
      setErreurInventaire(
        "Les quantités comptées doivent être des nombres entiers positifs.",
      );
      return;
    }
    setEnregistrement(true);
    setErreurInventaire(null);
    const r = await fetch("/api/maison/inventaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateInventaire, comptes: liste }),
    });
    setEnregistrement(false);
    if (!r.ok) {
      setErreurInventaire(await messageErreur(r));
      return;
    }
    const { corriges } = (await r.json()) as { corriges: number };
    setInventaire(false);
    setComptes({});
    setMessage(
      corriges === 0
        ? "Inventaire enregistré : tout correspondait, aucune correction."
        : `Inventaire enregistré : ${corriges} article${corriges > 1 ? "s" : ""} corrigé${corriges > 1 ? "s" : ""}.`,
    );
    await charger();
  }

  const ligneForm = lignes.find((l) => String(l.articleId) === form.articleId);
  const quantiteForm = parseInt(form.quantite, 10) || 0;
  const apresForm = ligneForm
    ? ligneForm.maison + (form.type === "sortie" ? -quantiteForm : quantiteForm)
    : null;

  return (
    <div>
      <PageHeader
        titre="Stock à la maison"
        sousTitre="Ce qui vous reste chez vous : vos fabrications, moins les envois en boutique saisis dans le suivi mensuel, corrigé par vos sorties et inventaires."
        action={
          lignes.length > 0 &&
          !inventaire && (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-secondary" onClick={demarrerInventaire}>
                Faire l&apos;inventaire
              </button>
              <button
                className="btn btn-primary"
                onClick={() => ouvrirMouvement("fabrication")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Ajouter une fabrication
              </button>
            </div>
          )
        }
      />

      {erreurChargement ? (
        <EmptyState
          titre="Impossible de charger le stock"
          description="Le stock à la maison n'a pas pu être lu. Réessayez dans un instant."
          action={
            <button
              className="btn btn-secondary"
              onClick={() => {
                setErreurChargement(false);
                charger();
              }}
            >
              Réessayer
            </button>
          }
        />
      ) : !donnees ? (
        <p className="text-[var(--muted)]">Chargement…</p>
      ) : lignes.length === 0 ? (
        <EmptyState
          titre="Aucun article"
          description="Ajoutez vos produits pour suivre ce qu'il vous reste à la maison."
          action={
            <a className="btn btn-primary" href="/articles">
              Ajouter un article
            </a>
          }
        />
      ) : (
        <>
          {/* Cartes de synthèse (tous les articles, quel que soit le filtre) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="card p-4">
              <p className="text-xs text-[var(--muted)] font-medium uppercase">
                À la maison
              </p>
              <p
                className={`text-2xl font-bold tabular-nums mt-1 ${totalMaison < 0 ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}
              >
                {formatNombre(totalMaison)}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                pièce{Math.abs(totalMaison) > 1 ? "s" : ""}, {nbArticlesMaison}{" "}
                article{nbArticlesMaison > 1 ? "s" : ""} en stock
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-[var(--muted)] font-medium uppercase">
                En boutique
              </p>
              <p className="text-2xl font-bold tabular-nums mt-1 text-[var(--warning)]">
                {formatNombre(totalBoutique)}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                envoyé − vendu, toutes boutiques
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-[var(--muted)] font-medium uppercase">
                Stock total
              </p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {formatNombre(totalMaison + totalBoutique)}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                maison + boutiques
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-[var(--muted)] font-medium uppercase">
                Valeur à la maison
              </p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {formatMontant(valeurMaison)}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                au prix de vente par défaut
              </p>
            </div>
          </div>

          {/* Aide au démarrage, ou alerte si des envois dépassent le stock */}
          {!inventaire && mouvements.length === 0 ? (
            <div className="rounded-2xl p-4 mb-5 bg-[var(--info-soft)] flex flex-wrap items-center gap-3">
              <p className="text-sm flex-1 min-w-[240px]">
                <span className="font-semibold text-[var(--info)]">
                  Pour démarrer, faites un inventaire.
                </span>{" "}
                Comptez ce que vous avez chez vous et saisissez-le : c&apos;est
                votre point de départ. Ajoutez ensuite vos fabrications au fil
                de l&apos;eau ; les envois saisis dans le suivi mensuel sont
                déduits automatiquement.
              </p>
              <button className="btn btn-primary btn-sm" onClick={demarrerInventaire}>
                Faire l&apos;inventaire
              </button>
            </div>
          ) : (
            !inventaire &&
            negatifs.length > 0 && (
              <div className="rounded-2xl p-4 mb-5 bg-[var(--danger-soft)] flex flex-wrap items-center gap-3">
                <p className="text-sm flex-1 min-w-[240px]">
                  <span className="font-semibold text-[var(--danger)]">
                    {negatifs.length} article{negatifs.length > 1 ? "s ont" : " a"}{" "}
                    un stock négatif à la maison
                  </span>{" "}
                  ({negatifs.slice(0, 3).map((l) => l.nom).join(", ")}
                  {negatifs.length > 3 ? "…" : ""}) : plus d&apos;envois en
                  boutique que de fabrications enregistrées. Ajoutez les
                  fabrications manquantes ou faites un inventaire.
                </p>
                <button className="btn btn-secondary btn-sm" onClick={demarrerInventaire}>
                  Faire l&apos;inventaire
                </button>
              </div>
            )
          )}

          {/* Barre du mode inventaire */}
          {inventaire && (
            <div className="rounded-2xl p-4 mb-5 bg-[var(--primary-soft)] flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[240px]">
                <p className="font-semibold text-[var(--primary)]">
                  Inventaire en cours
                </p>
                <p className="text-sm mt-1">
                  Saisissez dans la colonne « Compté » les quantités réellement
                  présentes chez vous. Les articles laissés vides ne changent
                  pas. L&apos;écart avec le stock calculé est enregistré comme
                  correction.
                </p>
                {erreurInventaire && (
                  <p className="text-sm text-[var(--danger)] mt-2">
                    {erreurInventaire}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="date-inventaire">
                  Date
                </label>
                <input
                  id="date-inventaire"
                  type="date"
                  className="input"
                  value={dateInventaire}
                  onChange={(e) => setDateInventaire(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => setInventaire(false)}
                  disabled={enregistrement}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={enregistrerInventaire}
                  disabled={
                    enregistrement || comptesSaisis.length === 0 || !dateInventaire
                  }
                >
                  {enregistrement
                    ? "Enregistrement…"
                    : `Enregistrer (${comptesSaisis.length} article${comptesSaisis.length > 1 ? "s" : ""})`}
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className="mb-4">
              <span className="badge badge-success">✓ {message}</span>
            </p>
          )}

          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-[220px] max-w-md">
              <input
                type="search"
                className="input"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un article ou une référence…"
                aria-label="Rechercher un article ou une référence"
              />
            </div>
            {!inventaire && (
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={masquerVides}
                  onChange={(e) => setMasquerVides(e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Masquer les articles sans stock
              </label>
            )}
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                className={`btn btn-sm ${filtreActif === "" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFiltre("")}
              >
                Toutes
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  className={`btn btn-sm ${filtreActif === c ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFiltre(c)}
                >
                  {c}
                </button>
              ))}
              {aSansCategorie && (
                <button
                  className={`btn btn-sm ${filtreActif === SANS_CATEGORIE ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFiltre(SANS_CATEGORIE)}
                >
                  Sans catégorie
                </button>
              )}
            </div>
          )}

          {/* Stock par article */}
          <div className="card table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-[var(--surface-2)] z-10">
                    Article
                  </th>
                  <th className="text-center" title="Pièces fabriquées ou achetées">
                    Fabriqué
                  </th>
                  <th className="text-center" title="Total envoyé en boutique (suivi mensuel)">
                    Envoyé
                  </th>
                  <th
                    className="text-center"
                    title="Sorties hors boutique (vente directe, don, casse…) et corrections d'inventaire"
                  >
                    Ajust.
                  </th>
                  <th className="text-center !text-[var(--primary)]">
                    À la maison
                  </th>
                  {inventaire && (
                    <>
                      <th className="text-center">Compté</th>
                      <th className="text-center">Écart</th>
                    </>
                  )}
                  <th className="text-center" title="Envoyé − vendu, toutes boutiques">
                    En boutique
                  </th>
                  <th className="text-center">Total</th>
                  {!inventaire && <th></th>}
                </tr>
              </thead>
              <tbody>
                {visibles.map((l) => {
                  const saisie = comptes[l.articleId] ?? "";
                  const compte = saisie.trim() === "" ? null : Number(saisie);
                  const ecart =
                    compte !== null && Number.isFinite(compte)
                      ? compte - l.maison
                      : null;
                  return (
                    <tr key={l.articleId}>
                      <td className="font-medium sticky left-0 bg-[var(--surface)] z-10">
                        {l.nom}
                        {l.reference && (
                          <span className="block text-xs text-[var(--muted)]">
                            {l.reference}
                          </span>
                        )}
                      </td>
                      <td className="text-center tabular-nums">
                        {l.fabrique || <span className="text-[var(--muted)]">—</span>}
                      </td>
                      <td className="text-center tabular-nums">
                        {l.envoye ? (
                          `−${formatNombre(l.envoye)}`
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="text-center tabular-nums">
                        {ajustement(l) ? (
                          signe(ajustement(l))
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td
                        className={`text-center tabular-nums font-bold text-base bg-[var(--primary-soft)] ${couleurStock(l.maison)}`}
                      >
                        {formatNombre(l.maison)}
                      </td>
                      {inventaire && (
                        <>
                          <td className="text-center">
                            <input
                              className="input w-24 text-center tabular-nums"
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={saisie}
                              placeholder={String(Math.max(0, l.maison))}
                              onChange={(e) =>
                                setComptes({
                                  ...comptes,
                                  [l.articleId]: e.target.value,
                                })
                              }
                              aria-label={`Quantité comptée de ${l.nom}`}
                            />
                          </td>
                          <td
                            className={`text-center tabular-nums font-semibold ${ecart === null || ecart === 0 ? "text-[var(--muted)]" : ecart > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                          >
                            {ecart === null ? "—" : signe(ecart)}
                          </td>
                        </>
                      )}
                      <td className="text-center tabular-nums">
                        {l.enBoutique ? (
                          formatNombre(l.enBoutique)
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="text-center tabular-nums font-semibold">
                        {formatNombre(l.maison + l.enBoutique)}
                      </td>
                      {!inventaire && (
                        <td>
                          <div className="flex gap-2 justify-end">
                            <button
                              className="btn btn-secondary btn-sm whitespace-nowrap"
                              onClick={() => ouvrirMouvement("fabrication", l.articleId)}
                              title="Ajouter des pièces fabriquées"
                            >
                              + Fabriqué
                            </button>
                            <button
                              className="btn btn-ghost btn-sm whitespace-nowrap"
                              onClick={() => ouvrirMouvement("sortie", l.articleId)}
                              title="Vente directe, don, casse… (hors boutique)"
                            >
                              − Sortie
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {visibles.length > 0 && (
                <tfoot>
                  <tr className="font-bold bg-[var(--surface-2)]">
                    <td className="sticky left-0 bg-[var(--surface-2)] z-10 px-4 py-3">
                      Total
                    </td>
                    <td className="text-center tabular-nums">
                      {formatNombre(somme(visibles, (l) => l.fabrique))}
                    </td>
                    <td className="text-center tabular-nums">
                      −{formatNombre(somme(visibles, (l) => l.envoye))}
                    </td>
                    <td className="text-center tabular-nums">
                      {signe(somme(visibles, ajustement))}
                    </td>
                    <td className="text-center tabular-nums text-base text-[var(--primary)]">
                      {formatNombre(somme(visibles, (l) => l.maison))}
                    </td>
                    {inventaire && <td colSpan={2}></td>}
                    <td className="text-center tabular-nums">
                      {formatNombre(somme(visibles, (l) => l.enBoutique))}
                    </td>
                    <td className="text-center tabular-nums">
                      {formatNombre(
                        somme(visibles, (l) => l.maison + l.enBoutique),
                      )}
                    </td>
                    {!inventaire && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
            {visibles.length === 0 && (
              <p className="p-4 text-sm text-[var(--muted)]">
                Aucun article ne correspond à la recherche.
              </p>
            )}
          </div>

          <p className="text-xs text-[var(--muted)] mt-3">
            À la maison = fabriqué − envoyé en boutique ± ajustements (sorties
            hors boutique et corrections d&apos;inventaire). Les envois
            proviennent du suivi mensuel.
          </p>

          {/* Historique des mouvements saisis ici */}
          {mouvements.length > 0 && (
            <div className="mt-8">
              <h2 className="font-semibold mb-1">Derniers mouvements</h2>
              <p className="text-sm text-[var(--muted)] mb-3">
                Fabrications, sorties et inventaires (les 100 plus récents).
                Supprimer un mouvement recalcule le stock.
              </p>
              <div className="card table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Article</th>
                      <th>Type</th>
                      <th className="text-center">Quantité</th>
                      <th>Note</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mouvements.map((m) => (
                      <tr key={m.id}>
                        <td className="tabular-nums whitespace-nowrap">
                          {formatDate(m.date)}
                        </td>
                        <td className="font-medium">{m.nom}</td>
                        <td>
                          <span className={`badge ${TYPES[m.type]?.badge ?? "badge-muted"}`}>
                            {TYPES[m.type]?.libelle ?? m.type}
                          </span>
                        </td>
                        <td
                          className={`text-center tabular-nums font-semibold ${m.quantite > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                        >
                          {signe(m.quantite)}
                        </td>
                        <td className="text-sm text-[var(--muted)]">
                          {m.note || "—"}
                        </td>
                        <td>
                          <div className="flex justify-end">
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => supprimerMouvement(m)}
                            >
                              Suppr.
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal fabrication / sortie */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.type === "sortie" ? "Sortie du stock" : "Fabrication"}
      >
        <form onSubmit={enregistrerMouvement} className="flex flex-col gap-4">
          <div>
            <label className="label">Type</label>
            <div className="flex flex-wrap gap-2">
              {(["fabrication", "sortie"] as const).map((t) => {
                const actif = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`chip ${actif ? "chip-actif" : ""}`}
                    aria-pressed={actif}
                    onClick={() => setForm({ ...form, type: t })}
                  >
                    {t === "fabrication"
                      ? "+ Fabrication (entre dans le stock)"
                      : "− Sortie (vente directe, don, casse…)"}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="mouvement-article">
              Article *
            </label>
            <select
              id="mouvement-article"
              className="select"
              value={form.articleId}
              onChange={(e) => setForm({ ...form, articleId: e.target.value })}
            >
              <option value="">Choisir un article…</option>
              {lignes.map((l) => (
                <option key={l.articleId} value={l.articleId}>
                  {l.nom}
                  {l.reference ? ` (${l.reference})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="mouvement-quantite">
                Quantité *
              </label>
              <input
                id="mouvement-quantite"
                className="input"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.quantite}
                autoFocus
                onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label" htmlFor="mouvement-date">
                Date
              </label>
              <input
                id="mouvement-date"
                className="input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="mouvement-note">
              Note
            </label>
            <input
              id="mouvement-note"
              className="input"
              value={form.note}
              maxLength={200}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={
                form.type === "sortie"
                  ? "Ex : vendu sur un marché, offert, abîmé…"
                  : "Ex : nouvelle série, réimpression…"
              }
            />
          </div>
          {ligneForm && apresForm !== null && (
            <p className="text-sm text-[var(--muted)]">
              Stock à la maison :{" "}
              <span className="tabular-nums font-semibold text-[var(--foreground)]">
                {formatNombre(ligneForm.maison)}
              </span>{" "}
              →{" "}
              <span
                className={`tabular-nums font-semibold ${apresForm < 0 ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}
              >
                {formatNombre(apresForm)}
              </span>
            </p>
          )}
          {erreur && <p className="text-sm text-[var(--danger)]">{erreur}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setOpen(false)}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                enregistrement ||
                !form.articleId ||
                !(quantiteForm >= 1) ||
                !form.date
              }
            >
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
