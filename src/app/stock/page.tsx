"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { formatMontant, formatMoisCourt } from "@/lib/format";

type Boutique = { id: number; nom: string };
type Cellule = { envoye: number; vendu: number };
type Ligne = {
  articleId: number;
  nom: string;
  reference: string | null;
  parMois: Record<string, Cellule>;
  totalEnvoye: number;
  totalVendu: number;
  reste: number;
  ca: number;
};
type Bilan = {
  mois: string[];
  lignes: Ligne[];
  totauxParMois: Record<string, Cellule>;
  totalGeneral: { envoye: number; vendu: number; reste: number; ca: number };
};
type LigneMatrice = {
  articleId: number;
  nom: string;
  reference: string | null;
  parBoutique: Record<number, number>;
  total: number;
};
type Matrice = {
  boutiques: Boutique[];
  lignes: LigneMatrice[];
  totauxParBoutique: Record<number, number>;
  totalGeneral: number;
};

// Couleur de fond d'une cellule de stock restant selon son intensité.
// reste <= 0 : épuisé (transparent). Sinon dégradé d'indigo (couleur primaire du site).
function couleurReste(reste: number, max: number): string {
  if (reste <= 0) return "transparent";
  const ratio = max > 0 ? reste / max : 0;
  const alpha = 0.1 + ratio * 0.55;
  return `rgba(79, 70, 229, ${alpha.toFixed(2)})`;
}

export default function StockPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [boutiqueId, setBoutiqueId] = useState<string>("");
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [matrice, setMatrice] = useState<Matrice | null>(null);
  const [chargement, setChargement] = useState(true);
  const [afficherMois, setAfficherMois] = useState(true);

  useEffect(() => {
    fetch("/api/boutiques")
      .then((r) => r.json())
      .then((b: Boutique[]) => setBoutiques(b));
    fetch("/api/stock/matrice")
      .then((r) => r.json())
      .then((m: Matrice) => setMatrice(m));
  }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    const url = boutiqueId
      ? `/api/stock?boutiqueId=${boutiqueId}`
      : "/api/stock";
    const res = await fetch(url);
    setBilan(await res.json());
    setChargement(false);
  }, [boutiqueId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const nomBoutique =
    boutiqueId === ""
      ? "Toutes les boutiques"
      : boutiques.find((b) => String(b.id) === boutiqueId)?.nom ?? "";

  return (
    <div>
      <PageHeader
        titre="Stock & bilan"
        sousTitre="Envois et ventes mois par mois, avec le reste cumulé en boutique."
      />

      {/* Sélecteurs */}
      <div className="card p-4 mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-[220px]">
          <label className="label">Boutique</label>
          <select
            className="select"
            value={boutiqueId}
            onChange={(e) => setBoutiqueId(e.target.value)}
          >
            <option value="">Toutes les boutiques (cumulé)</option>
            {boutiques.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nom}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none pb-2">
          <input
            type="checkbox"
            checked={afficherMois}
            onChange={(e) => setAfficherMois(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Afficher le détail par mois
        </label>
      </div>

      {/* Cartes de synthèse */}
      {bilan && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="card p-4">
            <p className="text-xs text-[var(--muted)] font-medium uppercase">
              Total envoyé
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {bilan.totalGeneral.envoye}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[var(--muted)] font-medium uppercase">
              Total vendu
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {bilan.totalGeneral.vendu}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[var(--muted)] font-medium uppercase">
              Reste en boutique
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-[var(--warning)]">
              {bilan.totalGeneral.reste}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[var(--muted)] font-medium uppercase">
              Chiffre d&apos;affaires
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-[var(--primary)]">
              {formatMontant(bilan.totalGeneral.ca)}
            </p>
          </div>
        </div>
      )}

      {/* Vue d'ensemble : stock restant par article et par boutique */}
      {matrice && matrice.lignes.length > 0 && matrice.boutiques.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-1">Stock restant par boutique</h2>
          <p className="text-sm text-[var(--muted)] mb-3">
            Reste cumulé (envoyé − vendu) de chaque article dans chaque
            boutique. Plus la case est foncée, plus il reste de stock.
          </p>
          {(() => {
            const maxReste = Math.max(
              1,
              ...matrice.lignes.flatMap((l) =>
                matrice.boutiques.map((b) => l.parBoutique[b.id] ?? 0),
              ),
            );
            return (
              <div className="card table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-[var(--surface-2)] z-10">
                        Article
                      </th>
                      {matrice.boutiques.map((b) => (
                        <th
                          key={b.id}
                          className="text-center border-l border-[var(--border)]"
                        >
                          {b.nom}
                        </th>
                      ))}
                      <th className="text-center border-l-2 border-[var(--primary)]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrice.lignes.map((l) => (
                      <tr key={l.articleId}>
                        <td className="font-medium sticky left-0 bg-[var(--surface)] z-10">
                          {l.nom}
                          {l.reference && (
                            <span className="block text-xs text-[var(--muted)]">
                              {l.reference}
                            </span>
                          )}
                        </td>
                        {matrice.boutiques.map((b) => {
                          const r = l.parBoutique[b.id] ?? 0;
                          return (
                            <td
                              key={b.id}
                              className="text-center tabular-nums font-semibold border-l border-[var(--border)]"
                              style={{ backgroundColor: couleurReste(r, maxReste) }}
                            >
                              {r === 0 ? (
                                <span className="text-[var(--muted)] font-normal">
                                  —
                                </span>
                              ) : (
                                <span
                                  className={
                                    r < 0
                                      ? "text-[var(--danger)]"
                                      : "text-[var(--heat-text)]"
                                  }
                                >
                                  {r}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center tabular-nums font-bold border-l-2 border-[var(--primary)]">
                          {l.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-[var(--surface-2)]">
                      <td className="sticky left-0 bg-[var(--surface-2)] z-10 px-4 py-3">
                        Total
                      </td>
                      {matrice.boutiques.map((b) => (
                        <td
                          key={b.id}
                          className="text-center tabular-nums border-l border-[var(--border)] text-[var(--primary)]"
                        >
                          {matrice.totauxParBoutique[b.id] ?? 0}
                        </td>
                      ))}
                      <td className="text-center tabular-nums border-l-2 border-[var(--primary)] text-[var(--primary)]">
                        {matrice.totalGeneral}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      <p className="text-sm text-[var(--muted)] mb-3">{nomBoutique}</p>

      {chargement ? (
        <p className="text-[var(--muted)]">Chargement…</p>
      ) : !bilan || bilan.lignes.length === 0 ? (
        <EmptyState
          titre="Aucune donnée"
          description="Saisissez des envois et des ventes pour voir le bilan ici."
          action={
            <a className="btn btn-primary" href="/suivi">
              Saisir un suivi
            </a>
          }
        />
      ) : (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th rowSpan={2} className="sticky left-0 bg-[var(--surface-2)] z-10">
                  Article
                </th>
                {afficherMois &&
                  bilan.mois.map((m) => (
                    <th key={m} className="text-center border-l border-[var(--border)]">
                      {formatMoisCourt(m)}
                    </th>
                  ))}
                <th colSpan={4} className="text-center border-l-2 border-[var(--primary)]">
                  Totaux
                </th>
              </tr>
              <tr>
                {afficherMois &&
                  bilan.mois.map((m) => (
                    <th key={m} className="text-center !normal-case border-l border-[var(--border)]">
                      <span className="text-[10px] font-semibold">Env. / Vend.</span>
                    </th>
                  ))}
                <th className="text-center border-l-2 border-[var(--primary)]">Envoyé</th>
                <th className="text-center">Vendu</th>
                <th className="text-center">Reste</th>
                <th className="text-right">CA</th>
              </tr>
            </thead>
            <tbody>
              {bilan.lignes.map((l) => (
                <tr key={l.articleId}>
                  <td className="font-medium sticky left-0 bg-[var(--surface)] z-10">
                    {l.nom}
                    {l.reference && (
                      <span className="block text-xs text-[var(--muted)]">
                        {l.reference}
                      </span>
                    )}
                  </td>
                  {afficherMois &&
                    bilan.mois.map((m) => {
                      const c = l.parMois[m];
                      return (
                        <td
                          key={m}
                          className="text-center tabular-nums border-l border-[var(--border)] whitespace-nowrap"
                        >
                          {c ? (
                            <span>
                              <span className="text-[var(--muted)]">{c.envoye}</span>
                              <span className="text-[var(--muted)]"> / </span>
                              <span className="font-medium text-[var(--success)]">
                                {c.vendu}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[var(--border)]">—</span>
                          )}
                        </td>
                      );
                    })}
                  <td className="text-center tabular-nums font-medium border-l-2 border-[var(--primary)]">
                    {l.totalEnvoye}
                  </td>
                  <td className="text-center tabular-nums font-medium">
                    {l.totalVendu}
                  </td>
                  <td className="text-center tabular-nums font-semibold">
                    <span
                      className={
                        l.reste < 0
                          ? "text-[var(--danger)]"
                          : l.reste > 0
                            ? "text-[var(--warning)]"
                            : "text-[var(--muted)]"
                      }
                    >
                      {l.reste}
                    </span>
                  </td>
                  <td className="text-right tabular-nums font-semibold">
                    {formatMontant(l.ca)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-[var(--surface-2)]">
                <td className="sticky left-0 bg-[var(--surface-2)] z-10 px-4 py-3">
                  Total
                </td>
                {afficherMois &&
                  bilan.mois.map((m) => {
                    const t = bilan.totauxParMois[m];
                    return (
                      <td
                        key={m}
                        className="text-center tabular-nums border-l border-[var(--border)] whitespace-nowrap"
                      >
                        {t.envoye} / {t.vendu}
                      </td>
                    );
                  })}
                <td className="text-center tabular-nums border-l-2 border-[var(--primary)]">
                  {bilan.totalGeneral.envoye}
                </td>
                <td className="text-center tabular-nums">
                  {bilan.totalGeneral.vendu}
                </td>
                <td className="text-center tabular-nums text-[var(--warning)]">
                  {bilan.totalGeneral.reste}
                </td>
                <td className="text-right tabular-nums text-[var(--primary)]">
                  {formatMontant(bilan.totalGeneral.ca)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-[var(--muted)] mt-3">
        Dans le détail mensuel, chaque cellule indique{" "}
        <span className="text-[var(--muted)]">envoyé</span> /{" "}
        <span className="text-[var(--success)] font-medium">vendu</span>. Le{" "}
        <span className="text-[var(--warning)] font-medium">reste</span> est le
        cumul (total envoyé − total vendu) depuis le début.
      </p>
    </div>
  );
}
