"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { formatMontant, formatMois, moisActuel } from "@/lib/format";

type Boutique = { id: number; nom: string };
type Ligne = {
  articleId: number;
  nom: string;
  reference: string | null;
  prixEffectif: number;
  envoye: number;
  vendu: number;
  prixUnitaire: number;
  saisi: boolean;
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

export default function SuiviPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [boutiqueId, setBoutiqueId] = useState<number | null>(null);
  const [mois, setMois] = useState(moisActuel());
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [dirty, setDirty] = useState<Set<number>>(new Set());
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/boutiques")
      .then((r) => r.json())
      .then((b: Boutique[]) => {
        setBoutiques(b);
        if (b.length > 0) setBoutiqueId(b[0].id);
        else setChargement(false);
      });
  }, []);

  const chargerLignes = useCallback(async () => {
    if (!boutiqueId) return;
    setChargement(true);
    setMessage("");
    const res = await fetch(
      `/api/entrees?mois=${mois}&boutiqueId=${boutiqueId}`,
    );
    setLignes(await res.json());
    setDirty(new Set());
    setChargement(false);
  }, [boutiqueId, mois]);

  useEffect(() => {
    if (boutiqueId) chargerLignes();
  }, [boutiqueId, mois, chargerLignes]);

  function maj(articleId: number, champ: keyof Ligne, valeur: number) {
    setLignes((prev) =>
      prev.map((l) =>
        l.articleId === articleId ? { ...l, [champ]: valeur } : l,
      ),
    );
    setDirty((prev) => new Set(prev).add(articleId));
    setMessage("");
  }

  async function enregistrer() {
    if (!boutiqueId || dirty.size === 0) return;
    setEnregistrement(true);
    const aEnregistrer = lignes.filter((l) => dirty.has(l.articleId));
    await Promise.all(
      aEnregistrer.map((l) =>
        fetch("/api/entrees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boutiqueId,
            articleId: l.articleId,
            mois,
            envoye: l.envoye,
            vendu: l.vendu,
            prixUnitaire: l.prixUnitaire,
          }),
        }),
      ),
    );
    setEnregistrement(false);
    setMessage("Modifications enregistrées ✓");
    await chargerLignes();
  }

  const totalEnvoye = lignes.reduce((s, l) => s + l.envoye, 0);
  const totalVendu = lignes.reduce((s, l) => s + l.vendu, 0);
  const totalCA = lignes.reduce((s, l) => s + l.vendu * l.prixUnitaire, 0);

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
        sousTitre="Saisissez les quantités envoyées et vendues, par boutique et par mois."
      />

      {/* Barre de sélection */}
      <div className="card p-4 mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <label className="label">Boutique</label>
          <select
            className="select"
            value={boutiqueId ?? ""}
            onChange={(e) => setBoutiqueId(Number(e.target.value))}
          >
            {boutiques.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Mois</label>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setMois(moisPrecedent(mois))}
              aria-label="Mois précédent"
            >
              ‹
            </button>
            <input
              type="month"
              className="input w-[170px]"
              value={mois}
              onChange={(e) => setMois(e.target.value || moisActuel())}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setMois(moisSuivant(mois))}
              aria-label="Mois suivant"
            >
              ›
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {message && (
            <span className="text-sm text-[var(--success)] font-medium">
              {message}
            </span>
          )}
          {dirty.size > 0 && (
            <span className="badge badge-warning">
              {dirty.size} modif. non enregistrée{dirty.size > 1 ? "s" : ""}
            </span>
          )}
          <button
            className="btn btn-primary"
            onClick={enregistrer}
            disabled={enregistrement || dirty.size === 0}
          >
            {enregistrement ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Cartes de totaux */}
      <div className="grid grid-cols-3 gap-4 mb-5">
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
      </div>

      <p className="text-sm text-[var(--muted)] mb-3">
        {formatMois(mois)} —{" "}
        {boutiques.find((b) => b.id === boutiqueId)?.nom}
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
                <th className="text-center">Invendus</th>
                <th className="text-right">CA</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => {
                const ca = l.vendu * l.prixUnitaire;
                const invendus = l.envoye - l.vendu;
                return (
                  <tr key={l.articleId}>
                    <td>
                      <p className="font-medium">{l.nom}</p>
                      {l.reference && (
                        <p className="text-xs text-[var(--muted)]">
                          {l.reference}
                        </p>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
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
                  {totalEnvoye - totalVendu}
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
