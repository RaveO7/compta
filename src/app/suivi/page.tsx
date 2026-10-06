"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import OptionsBoutiques from "@/components/OptionsBoutiques";
import { formatMontant, formatMois, moisActuel } from "@/lib/format";
import { aDesFrais, libelleFrais, montantCommission } from "@/lib/frais";

type Boutique = {
  id: number;
  nom: string;
  archivee: boolean;
  loyerMensuel: number;
  commission: number;
};
type Ligne = {
  articleId: number;
  nom: string;
  reference: string | null;
  prixEffectif: number;
  envoye: number;
  vendu: number;
  prixUnitaire: number;
  saisi: boolean;
  stockAnterieur: number;
};

function moisPrecedent(mois: string) {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(a, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function moisSuivant(mois: string) {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(a, m - 1, 1);
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type EtatSauvegarde = "enregistre" | "attente" | "enCours" | "erreur";
type Selection = { boutiqueId: number; mois: string };

function StatutSauvegarde({
  etat,
  nbEnAttente,
  derniereSauvegarde,
}: {
  etat: EtatSauvegarde;
  nbEnAttente: number;
  derniereSauvegarde: Date | null;
}) {
  const pluriel = nbEnAttente > 1 ? "s" : "";
  const heure = derniereSauvegarde?.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (etat === "enCours") {
    return (
      <span className="badge badge-muted inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
        Enregistrement…
      </span>
    );
  }
  if (etat === "erreur") {
    return (
      <span className="badge badge-danger">
        ✕ {nbEnAttente} modif. non enregistrée{pluriel}
      </span>
    );
  }
  if (etat === "attente") {
    return (
      <span className="badge badge-warning">
        ● {nbEnAttente} modif. en attente
      </span>
    );
  }
  return (
    <span className="badge badge-success">
      ✓ Tout est enregistré{heure ? ` (${heure})` : ""}
    </span>
  );
}

// Délai après la dernière frappe avant l'enregistrement automatique
const DELAI_AUTO = 800;

export default function SuiviPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [boutiqueId, setBoutiqueId] = useState<number | null>(null);
  const [mois, setMois] = useState(moisActuel());
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [chargement, setChargement] = useState(true);
  // Articles dont la saisie n'est pas encore enregistrée (pour l'affichage)
  const [enAttente, setEnAttente] = useState<Set<number>>(new Set());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [derniereSauvegarde, setDerniereSauvegarde] = useState<Date | null>(
    null,
  );

  // Lignes affichées + la boutique/le mois auxquels elles appartiennent :
  // un enregistrement part toujours vers le mois des lignes, jamais vers un
  // autre mois sélectionné entre-temps.
  const lignesRef = useRef<Ligne[]>([]);
  const selectionLignesRef = useRef<Selection | null>(null);
  // articleId -> version de la modification non enregistrée
  const modifsRef = useRef<Map<number, number>>(new Map());
  const versionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sauvegardeRef = useRef<Promise<void> | null>(null);
  const relancerRef = useRef(false);

  useEffect(() => {
    // Toutes les boutiques (archivées incluses, pour consulter l'historique),
    // mais on démarre sur une boutique active.
    fetch("/api/boutiques?toutes=1")
      .then((r) => r.json())
      .then((b: Boutique[]) => {
        setBoutiques(b);
        if (b.length > 0) setBoutiqueId((b.find((x) => !x.archivee) ?? b[0]).id);
        else setChargement(false);
      });
  }, []);

  // Boutique + mois actuellement affichés : sert à ignorer une réponse arrivée
  // en retard pour un autre mois (sinon le tableau affiche les chiffres d'un
  // mois sous l'intitulé d'un autre, et l'enregistrement les écrit au mauvais mois).
  const selectionRef = useRef("");
  const requeteRef = useRef(0);
  useEffect(() => {
    selectionRef.current = `${boutiqueId}|${mois}`;
  }, [boutiqueId, mois]);

  const chargerLignes = useCallback(async () => {
    if (!boutiqueId) return;
    const selection = `${boutiqueId}|${mois}`;
    const requete = ++requeteRef.current;
    setChargement(true);
    const res = await fetch(
      `/api/entrees?mois=${mois}&boutiqueId=${boutiqueId}`,
      { cache: "no-store" },
    );
    const data: Ligne[] = await res.json();
    if (requete !== requeteRef.current || selection !== selectionRef.current) {
      return;
    }
    lignesRef.current = data;
    selectionLignesRef.current = { boutiqueId, mois };
    modifsRef.current = new Map();
    setLignes(data);
    setEnAttente(new Set());
    setErreur(false);
    setChargement(false);
  }, [boutiqueId, mois]);

  useEffect(() => {
    if (boutiqueId) chargerLignes();
  }, [boutiqueId, mois, chargerLignes]);

  // Enregistre toutes les modifications en attente. Si un enregistrement est
  // déjà en cours, on relance juste après pour les saisies arrivées entre-temps.
  const sauvegarder = useCallback((): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (sauvegardeRef.current) {
      relancerRef.current = true;
      return sauvegardeRef.current;
    }
    const selection = selectionLignesRef.current;
    if (!selection || modifsRef.current.size === 0) return Promise.resolve();

    const executer = async () => {
      setEnCours(true);
      let echec = false;
      do {
        relancerRef.current = false;
        const versions = new Map(modifsRef.current);
        const aEnregistrer = lignesRef.current.filter((l) =>
          versions.has(l.articleId),
        );
        const resultats = await Promise.all(
          aEnregistrer.map((l) =>
            fetch("/api/entrees", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              // keepalive : la requête aboutit même si la page se ferme
              keepalive: true,
              body: JSON.stringify({
                boutiqueId: selection.boutiqueId,
                articleId: l.articleId,
                mois: selection.mois,
                envoye: l.envoye,
                vendu: l.vendu,
                prixUnitaire: l.prixUnitaire,
              }),
            })
              .then((r) => r.ok)
              .catch(() => false),
          ),
        );
        echec = false;
        aEnregistrer.forEach((l, i) => {
          if (!resultats[i]) {
            echec = true;
            return;
          }
          // Retirée de l'attente seulement si elle n'a pas été re-modifiée pendant l'envoi
          if (modifsRef.current.get(l.articleId) === versions.get(l.articleId)) {
            modifsRef.current.delete(l.articleId);
          }
        });
        setEnAttente(new Set(modifsRef.current.keys()));
      } while (!echec && relancerRef.current && modifsRef.current.size > 0);

      setErreur(echec);
      if (!echec) setDerniereSauvegarde(new Date());
      setEnCours(false);
      sauvegardeRef.current = null;
    };

    sauvegardeRef.current = executer();
    return sauvegardeRef.current;
  }, []);

  function maj(articleId: number, champ: keyof Ligne, valeur: number) {
    const suivantes = lignesRef.current.map((l) =>
      l.articleId === articleId ? { ...l, [champ]: valeur } : l,
    );
    lignesRef.current = suivantes;
    setLignes(suivantes);
    modifsRef.current.set(articleId, ++versionRef.current);
    setEnAttente(new Set(modifsRef.current.keys()));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      sauvegarder();
    }, DELAI_AUTO);
  }

  const aDesModifs = enAttente.size > 0 || enCours;

  // Fermeture / rechargement de l'onglet avec des modifications non
  // enregistrées : on lance l'enregistrement et le navigateur avertit.
  useEffect(() => {
    if (!aDesModifs) return;
    const avantFermeture = (e: BeforeUnloadEvent) => {
      sauvegarder();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avantFermeture);
    return () => window.removeEventListener("beforeunload", avantFermeture);
  }, [aDesModifs, sauvegarder]);

  // Clic sur un lien (menu…) avec des modifications pas encore enregistrées :
  // on enregistre tout de suite et on demande confirmation avant de partir.
  useEffect(() => {
    if (!aDesModifs) return;
    const surClic = (e: MouseEvent) => {
      const lien = (e.target as Element | null)?.closest?.("a[href]");
      if (!lien) return;
      sauvegarder();
      if (
        !window.confirm(
          "Vos dernières modifications ne sont pas encore enregistrées.\n\nQuitter la page maintenant risque de les perdre. Quitter quand même ?",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", surClic, true);
    return () => document.removeEventListener("click", surClic, true);
  }, [aDesModifs, sauvegarder]);

  // Changer de boutique / de mois : on enregistre d'abord la saisie en cours
  async function changerSelection(action: () => void) {
    await sauvegarder();
    if (
      modifsRef.current.size > 0 &&
      !window.confirm(
        "Certaines modifications n'ont pas pu être enregistrées et seront perdues. Continuer ?",
      )
    ) {
      return;
    }
    action();
  }

  const etat: EtatSauvegarde = enCours
    ? "enCours"
    : erreur
      ? "erreur"
      : enAttente.size > 0
        ? "attente"
        : "enregistre";

  const totalEnvoye = lignes.reduce((s, l) => s + l.envoye, 0);
  const totalVendu = lignes.reduce((s, l) => s + l.vendu, 0);
  const totalCA = lignes.reduce((s, l) => s + l.vendu * l.prixUnitaire, 0);
  const totalInvendus = lignes.reduce(
    (s, l) => s + l.stockAnterieur + l.envoye - l.vendu,
    0,
  );
  const boutique = boutiques.find((b) => b.id === boutiqueId);
  const loyer = boutique?.loyerMensuel ?? 0;
  const commission = boutique ? montantCommission(totalCA, boutique) : 0;
  const totalFrais = loyer + commission;
  const net = totalCA - totalFrais;

  if (boutiques.length === 0 && !chargement) {
    return (
      <div>
        <PageHeader titre="Suivi mensuel" />
        <EmptyState
          titre="Aucune boutique"
          description="Créez d'abord une boutique pour saisir un suivi."
          action={
            <a className="btn btn-primary" href="/boutiques">
              Ajouter une boutique
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        titre="Suivi mensuel"
        sousTitre="Saisissez les quantités envoyées et vendues, par boutique et par mois. Les modifications sont enregistrées automatiquement."
      />

      {/* Barre de sélection */}
      <div className="card p-4 mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <label className="label">Boutique</label>
          <select
            className="select"
            value={boutiqueId ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              changerSelection(() => setBoutiqueId(id));
            }}
          >
            <OptionsBoutiques boutiques={boutiques} />
          </select>
        </div>

        <div>
          <label className="label">Mois</label>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => changerSelection(() => setMois(moisPrecedent(mois)))}
              aria-label="Mois précédent"
            >
              ‹
            </button>
            <input
              type="month"
              className="input w-[170px]"
              value={mois}
              onChange={(e) => {
                const m = e.target.value || moisActuel();
                changerSelection(() => setMois(m));
              }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => changerSelection(() => setMois(moisSuivant(mois)))}
              aria-label="Mois suivant"
            >
              ›
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3" aria-live="polite">
          <StatutSauvegarde
            etat={etat}
            nbEnAttente={enAttente.size}
            derniereSauvegarde={derniereSauvegarde}
          />
          {etat === "erreur" && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => sauvegarder()}
            >
              Réessayer
            </button>
          )}
        </div>
      </div>

      {/* Cartes de totaux */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)] font-medium uppercase">
            Envoyé
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{totalEnvoye}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)] font-medium uppercase">
            Vendu
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{totalVendu}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)] font-medium uppercase">
            Chiffre d&apos;affaires
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1 text-[var(--primary)]">
            {formatMontant(totalCA)}
          </p>
        </div>
        <div
          className="card p-4"
          title={boutique ? libelleFrais(boutique, formatMontant) : undefined}
        >
          <p className="text-xs text-[var(--muted)] font-medium uppercase">
            Frais boutique
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">
            {totalFrais > 0 ? `− ${formatMontant(totalFrais)}` : formatMontant(0)}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            {boutique && aDesFrais(boutique)
              ? [
                  loyer > 0 && `Loyer ${formatMontant(loyer)}`,
                  boutique.commission > 0 &&
                    `${boutique.commission.toLocaleString("fr-FR")} % : ${formatMontant(commission)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Aucun frais"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)] font-medium uppercase">
            Net
          </p>
          <p
            className={`text-2xl font-bold tabular-nums mt-1 ${net < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
          >
            {formatMontant(net)}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">CA − frais</p>
        </div>
      </div>

      <p className="text-sm text-[var(--muted)] mb-3">
        {formatMois(mois)} —{" "}
        {boutique?.nom}
        {boutique?.archivee &&
          " (boutique archivée)"}
      </p>

      {chargement ? (
        <p className="text-[var(--muted)]">Chargement…</p>
      ) : lignes.length === 0 ? (
        <EmptyState
          titre="Aucun article"
          description="Ajoutez des articles pour pouvoir saisir un suivi."
          action={
            <a className="btn btn-primary" href="/articles">
              Ajouter un article
            </a>
          }
        />
      ) : (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Article</th>
                <th className="text-right">Prix unit.</th>
                <th className="text-center">Envoyé</th>
                <th className="text-center">Vendu</th>
                <th
                  className="text-center"
                  title="Stock restant en boutique : total envoyé − total vendu, depuis le début jusqu'à ce mois inclus"
                >
                  Invendus (cumul)
                </th>
                <th className="text-right">CA</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => {
                const ca = l.vendu * l.prixUnitaire;
                // Invendus cumulés en boutique (mois précédents + mois en cours)
                const invendus = l.stockAnterieur + l.envoye - l.vendu;
                return (
                  <tr key={l.articleId}>
                    <td>
                      <p className="font-medium flex items-center gap-2">
                        {l.nom}
                        {enAttente.has(l.articleId) && (
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              etat === "erreur"
                                ? "bg-[var(--danger)]"
                                : "bg-[var(--warning)]"
                            }`}
                            title={
                              etat === "erreur"
                                ? "Non enregistré (erreur)"
                                : "Modification en cours d'enregistrement"
                            }
                          />
                        )}
                      </p>
                      {l.reference && (
                        <p className="text-xs text-[var(--muted)]">
                          {l.reference}
                        </p>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        step="0.01"
                        min="0"
                        className="input !py-1.5 w-24 text-right ml-auto"
                        value={l.prixUnitaire}
                        onChange={(e) =>
                          maj(
                            l.articleId,
                            "prixUnitaire",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        min="0"
                        className="input !py-1.5 w-20 text-center mx-auto"
                        value={l.envoye || ""}
                        placeholder="0"
                        onChange={(e) =>
                          maj(
                            l.articleId,
                            "envoye",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        min="0"
                        className="input !py-1.5 w-20 text-center mx-auto"
                        value={l.vendu || ""}
                        placeholder="0"
                        onChange={(e) =>
                          maj(
                            l.articleId,
                            "vendu",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                    <td className="text-center tabular-nums">
                      <span
                        className={
                          invendus < 0
                            ? "text-[var(--danger)] font-medium"
                            : "text-[var(--muted)]"
                        }
                      >
                        {invendus}
                      </span>
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatMontant(ca)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="px-4 py-3">Total</td>
                <td></td>
                <td className="text-center tabular-nums">{totalEnvoye}</td>
                <td className="text-center tabular-nums">{totalVendu}</td>
                <td className="text-center tabular-nums">
                  {totalInvendus}
                </td>
                <td className="text-right tabular-nums text-[var(--primary)]">
                  {formatMontant(totalCA)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
