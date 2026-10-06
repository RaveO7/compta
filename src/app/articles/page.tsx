"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { formatMontant } from "@/lib/format";

type Prix = { id: number; boutiqueId: number; valeur: number };
type Article = {
  id: number;
  nom: string;
  reference: string | null;
  categorie: string | null;
  prixDefaut: number;
  coutUnitaire: number;
  prix: Prix[];
};
type Boutique = { id: number; nom: string };

const vide = {
  nom: "",
  reference: "",
  categorie: "",
  prixDefaut: "",
  coutUnitaire: "",
};

// Catégories proposées par défaut (complétées par celles déjà utilisées)
const CATEGORIES_SUGGEREES = ["Print", "Lino", "Stickers"];
const SANS_CATEGORIE = "__aucune__";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [chargement, setChargement] = useState(true);

  const [open, setOpen] = useState(false);
  const [edition, setEdition] = useState<Article | null>(null);
  const [form, setForm] = useState(vide);
  const [enregistrement, setEnregistrement] = useState(false);

  // Modal des prix par boutique
  const [prixOpen, setPrixOpen] = useState(false);
  const [articlePrix, setArticlePrix] = useState<Article | null>(null);
  const [prixForm, setPrixForm] = useState<Record<number, string>>({});

  // Filtre par catégorie ("" = toutes)
  const [filtre, setFiltre] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of articles) if (a.categorie) set.add(a.categorie);
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [articles]);

  // Catégories créées via « + » mais pas encore enregistrées sur un article
  const [categoriesAjoutees, setCategoriesAjoutees] = useState<string[]>([]);
  const [ajoutCategorie, setAjoutCategorie] = useState(false);
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");

  const suggestions = useMemo(
    () =>
      [
        ...new Set([
          ...categories,
          ...CATEGORIES_SUGGEREES,
          ...categoriesAjoutees,
        ]),
      ].sort((a, b) => a.localeCompare(b, "fr")),
    [categories, categoriesAjoutees],
  );

  function validerNouvelleCategorie() {
    const nom = nouvelleCategorie.trim();
    if (!nom) return;
    // Réutilise une catégorie existante si seule la casse diffère
    const existante = suggestions.find(
      (c) => c.toLocaleLowerCase("fr") === nom.toLocaleLowerCase("fr"),
    );
    if (!existante) setCategoriesAjoutees([...categoriesAjoutees, nom]);
    setForm({ ...form, categorie: existante ?? nom });
    setNouvelleCategorie("");
    setAjoutCategorie(false);
  }

  function annulerNouvelleCategorie() {
    setNouvelleCategorie("");
    setAjoutCategorie(false);
  }

  const aSansCategorie = articles.some((a) => !a.categorie);

  // Si la catégorie filtrée n'existe plus (article modifié/supprimé), on affiche tout
  const filtreActif =
    categories.includes(filtre) || (filtre === SANS_CATEGORIE && aSansCategorie)
      ? filtre
      : "";

  const articlesFiltres = articles.filter((a) =>
    filtreActif === ""
      ? true
      : filtreActif === SANS_CATEGORIE
        ? !a.categorie
        : a.categorie === filtreActif,
  );

  async function charger() {
    setChargement(true);
    const [a, b] = await Promise.all([
      fetch("/api/articles").then((r) => r.json()),
      fetch("/api/boutiques").then((r) => r.json()),
    ]);
    setArticles(a);
    setBoutiques(b);
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  function ouvrirAjout() {
    annulerNouvelleCategorie();
    setEdition(null);
    setForm(vide);
    setOpen(true);
  }

  function ouvrirEdition(a: Article) {
    annulerNouvelleCategorie();
    setEdition(a);
    setForm({
      nom: a.nom,
      reference: a.reference ?? "",
      categorie: a.categorie ?? "",
      prixDefaut: String(a.prixDefaut),
      coutUnitaire: a.coutUnitaire > 0 ? String(a.coutUnitaire) : "",
    });
    setOpen(true);
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setEnregistrement(true);
    const payload = {
      nom: form.nom,
      reference: form.reference,
      categorie: form.categorie,
      prixDefaut: parseFloat(form.prixDefaut) || 0,
      coutUnitaire: parseFloat(form.coutUnitaire) || 0,
    };
    if (edition) {
      await fetch(`/api/articles/${edition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setEnregistrement(false);
    setOpen(false);
    await charger();
  }

  async function supprimer(a: Article) {
    if (
      !confirm(
        `Supprimer l'article « ${a.nom} » ? Tout son suivi mensuel sera également supprimé.`,
      )
    )
      return;
    await fetch(`/api/articles/${a.id}`, { method: "DELETE" });
    await charger();
  }

  function ouvrirPrix(a: Article) {
    setArticlePrix(a);
    const init: Record<number, string> = {};
    for (const boutique of boutiques) {
      const p = a.prix.find((x) => x.boutiqueId === boutique.id);
      init[boutique.id] = p ? String(p.valeur) : "";
    }
    setPrixForm(init);
    setPrixOpen(true);
  }

  async function enregistrerPrix() {
    if (!articlePrix) return;
    setEnregistrement(true);
    await Promise.all(
      boutiques.map((boutique) => {
        const valStr = prixForm[boutique.id]?.trim();
        if (valStr === "" || valStr === undefined) {
          // pas de prix spécifique -> on retire l'éventuel prix
          return fetch(
            `/api/prix?articleId=${articlePrix.id}&boutiqueId=${boutique.id}`,
            { method: "DELETE" },
          );
        }
        return fetch("/api/prix", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: articlePrix.id,
            boutiqueId: boutique.id,
            valeur: parseFloat(valStr) || 0,
          }),
        });
      }),
    );
    setEnregistrement(false);
    setPrixOpen(false);
    await charger();
  }

  return (
    <div>
      <PageHeader
        titre="Articles"
        sousTitre="Vos produits, leurs prix (un prix par défaut, ajustable par boutique) et leurs frais de fabrication."
        action={
          <button className="btn btn-primary" onClick={ouvrirAjout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nouvel article
          </button>
        }
      />

      {chargement ? (
        <p className="text-[var(--muted)]">Chargement…</p>
      ) : articles.length === 0 ? (
        <EmptyState
          titre="Aucun article"
          description="Ajoutez vos produits pour pouvoir suivre vos ventes."
          action={
            <button className="btn btn-primary" onClick={ouvrirAjout}>
              Ajouter un article
            </button>
          }
        />
      ) : (
        <>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                className={`btn btn-sm ${filtreActif === "" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFiltre("")}
              >
                Toutes ({articles.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  className={`btn btn-sm ${filtreActif === c ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFiltre(c)}
                >
                  {c} ({articles.filter((a) => a.categorie === c).length})
                </button>
              ))}
              {aSansCategorie && (
                <button
                  className={`btn btn-sm ${filtreActif === SANS_CATEGORIE ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFiltre(SANS_CATEGORIE)}
                >
                  Sans catégorie ({articles.filter((a) => !a.categorie).length})
                </button>
              )}
            </div>
          )}
          <div className="card table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Catégorie</th>
                  <th>Référence</th>
                  <th className="text-right">Prix par défaut</th>
                  <th className="text-right">Frais / unité</th>
                  <th className="text-right">Marge / unité</th>
                  <th>Prix spécifiques</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {articlesFiltres.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.nom}</td>
                    <td>
                      {a.categorie ? (
                        <span className="badge badge-muted">{a.categorie}</span>
                      ) : (
                        <span className="text-[var(--muted)] text-sm">—</span>
                      )}
                    </td>
                    <td className="text-[var(--muted)]">
                      {a.reference || "—"}
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatMontant(a.prixDefaut)}
                    </td>
                    <td className="text-right tabular-nums text-[var(--muted)]">
                      {a.coutUnitaire > 0
                        ? `− ${formatMontant(a.coutUnitaire)}`
                        : "—"}
                    </td>
                    <td
                      className={`text-right font-semibold tabular-nums ${a.prixDefaut - a.coutUnitaire < 0 ? "text-[var(--danger)]" : ""}`}
                    >
                      {formatMontant(a.prixDefaut - a.coutUnitaire)}
                    </td>
                    <td>
                      {a.prix.length > 0 ? (
                        <span className="badge badge-primary">
                          {a.prix.length} boutique{a.prix.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)] text-sm">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2 justify-end">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => ouvrirPrix(a)}
                          disabled={boutiques.length === 0}
                          title={
                            boutiques.length === 0
                              ? "Ajoutez d'abord une boutique"
                              : "Prix par boutique"
                          }
                        >
                          Prix / boutique
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => ouvrirEdition(a)}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => supprimer(a)}
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
        </>
      )}

      {/* Modal création / édition */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edition ? "Modifier l'article" : "Nouvel article"}
      >
        <form onSubmit={enregistrer} className="flex flex-col gap-4">
          <div>
            <label className="label">Nom *</label>
            <input
              className="input"
              value={form.nom}
              autoFocus
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex : Bougie parfumée"
            />
          </div>
          <div>
            <label className="label">Catégorie</label>
            <div className="flex flex-wrap items-center gap-2">
              {suggestions.map((c) => {
                const actif = form.categorie === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${actif ? "chip-actif" : ""}`}
                    aria-pressed={actif}
                    onClick={() =>
                      setForm({ ...form, categorie: actif ? "" : c })
                    }
                  >
                    {actif && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                    {c}
                  </button>
                );
              })}
              {ajoutCategorie ? (
                <div className="flex items-center gap-1">
                  <input
                    className="input chip-input"
                    value={nouvelleCategorie}
                    autoFocus
                    onChange={(e) => setNouvelleCategorie(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        validerNouvelleCategorie();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        annulerNouvelleCategorie();
                      }
                    }}
                    placeholder="Nouvelle catégorie"
                  />
                  <button
                    type="button"
                    className="chip chip-icone chip-actif"
                    onClick={validerNouvelleCategorie}
                    disabled={!nouvelleCategorie.trim()}
                    title="Ajouter"
                    aria-label="Ajouter la catégorie"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </button>
                  <button
                    type="button"
                    className="chip chip-icone"
                    onClick={annulerNouvelleCategorie}
                    title="Annuler"
                    aria-label="Annuler"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="chip chip-ajout"
                  onClick={() => setAjoutCategorie(true)}
                  title="Ajouter une nouvelle catégorie"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  Nouvelle
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">Référence</label>
            <input
              className="input"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Code / référence interne (optionnel)"
            />
          </div>
          <div>
            <label className="label">Prix par défaut (€)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.prixDefaut}
              onChange={(e) =>
                setForm({ ...form, prixDefaut: e.target.value })
              }
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">Frais de fabrication par unité (€)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.coutUnitaire}
              onChange={(e) =>
                setForm({ ...form, coutUnitaire: e.target.value })
              }
              placeholder="0.00"
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              Achat de matériel pour fabriquer une pièce. Déduit du CA pour
              chaque article vendu.
              {form.coutUnitaire !== "" &&
                ` Marge : ${formatMontant((parseFloat(form.prixDefaut) || 0) - (parseFloat(form.coutUnitaire) || 0))} / unité.`}
            </p>
          </div>
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
              disabled={enregistrement || !form.nom.trim()}
            >
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal prix par boutique */}
      <Modal
        open={prixOpen}
        onClose={() => setPrixOpen(false)}
        title={`Prix par boutique — ${articlePrix?.nom ?? ""}`}
      >
        <p className="text-sm text-[var(--muted)] mb-4">
          Laissez vide pour utiliser le prix par défaut (
          {formatMontant(articlePrix?.prixDefaut ?? 0)}).
        </p>
        <div className="flex flex-col gap-3">
          {boutiques.map((boutique) => (
            <div key={boutique.id} className="flex items-center gap-3">
              <span className="flex-1 font-medium truncate">
                {boutique.nom}
              </span>
              <div className="relative w-36">
                <input
                  className="input pr-7"
                  type="number"
                  step="0.01"
                  min="0"
                  value={prixForm[boutique.id] ?? ""}
                  onChange={(e) =>
                    setPrixForm({
                      ...prixForm,
                      [boutique.id]: e.target.value,
                    })
                  }
                  placeholder={String(articlePrix?.prixDefaut ?? 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">
                  €
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end pt-5">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setPrixOpen(false)}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={enregistrerPrix}
            disabled={enregistrement}
          >
            {enregistrement ? "Enregistrement…" : "Enregistrer les prix"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
