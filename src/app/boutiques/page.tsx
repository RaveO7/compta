"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";

type Boutique = {
  id: number;
  nom: string;
  contact: string | null;
  adresse: string | null;
  notes: string | null;
  archivee: boolean;
};

const vide = { nom: "", contact: "", adresse: "", notes: "" };

export default function BoutiquesPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [chargement, setChargement] = useState(true);
  const [open, setOpen] = useState(false);
  const [edition, setEdition] = useState<Boutique | null>(null);
  const [form, setForm] = useState(vide);
  const [enregistrement, setEnregistrement] = useState(false);

  async function charger() {
    setChargement(true);
    const res = await fetch("/api/boutiques?toutes=1");
    setBoutiques(await res.json());
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  function ouvrirAjout() {
    setEdition(null);
    setForm(vide);
    setOpen(true);
  }

  function ouvrirEdition(b: Boutique) {
    setEdition(b);
    setForm({
      nom: b.nom,
      contact: b.contact ?? "",
      adresse: b.adresse ?? "",
      notes: b.notes ?? "",
    });
    setOpen(true);
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setEnregistrement(true);
    if (edition) {
      await fetch(`/api/boutiques/${edition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/boutiques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setEnregistrement(false);
    setOpen(false);
    await charger();
  }

  async function archiver(b: Boutique, archivee: boolean) {
    if (
      archivee &&
      !confirm(
        `Archiver la boutique « ${b.nom} » ? Elle n'apparaîtra plus dans le suivi mensuel, mais son historique (envois, ventes, CA) est conservé. Vous pourrez la réactiver à tout moment.`,
      )
    )
      return;
    await fetch(`/api/boutiques/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivee }),
    });
    await charger();
  }

  async function supprimer(b: Boutique) {
    if (
      !confirm(
        `Supprimer la boutique « ${b.nom} » ? Tout son suivi mensuel (envois, ventes, CA) sera définitivement supprimé.

Pour la retirer du suivi en gardant son historique, utilisez plutôt « Archiver ».`,
      )
    )
      return;
    await fetch(`/api/boutiques/${b.id}`, { method: "DELETE" });
    await charger();
  }

  const actives = boutiques.filter((b) => !b.archivee);
  const archivees = boutiques.filter((b) => b.archivee);

  function carte(b: Boutique) {
    return (
      <div
        key={b.id}
        className={`card p-5 flex flex-col gap-3 ${b.archivee ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] font-bold uppercase">
              {b.nom.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{b.nom}</p>
              {b.contact && (
                <p className="text-sm text-[var(--muted)] truncate">
                  {b.contact}
                </p>
              )}
            </div>
          </div>
        </div>

        {b.adresse && (
          <p className="text-sm text-[var(--muted)]">{b.adresse}</p>
        )}
        {b.notes && (
          <p className="text-sm bg-[var(--surface-2)] rounded-lg p-2 text-[var(--foreground)]">
            {b.notes}
          </p>
        )}

        <div className="flex gap-2 mt-auto pt-2">
          <button
            className="btn btn-secondary btn-sm flex-1"
            onClick={() => ouvrirEdition(b)}
          >
            Modifier
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => archiver(b, !b.archivee)}
            title={
              b.archivee
                ? "Remettre la boutique dans le suivi mensuel"
                : "Retirer la boutique du suivi mensuel sans perdre son historique"
            }
          >
            {b.archivee ? "Réactiver" : "Archiver"}
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => supprimer(b)}
          >
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        titre="Boutiques"
        sousTitre="Gérez les boutiques auxquelles vous vendez vos articles."
        action={
          <button className="btn btn-primary" onClick={ouvrirAjout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nouvelle boutique
          </button>
        }
      />

      {chargement ? (
        <p className="text-[var(--muted)]">Chargement…</p>
      ) : actives.length === 0 && archivees.length === 0 ? (
        <EmptyState
          titre="Aucune boutique"
          description="Ajoutez votre première boutique pour commencer le suivi."
          action={
            <button className="btn btn-primary" onClick={ouvrirAjout}>
              Ajouter une boutique
            </button>
          }
        />
      ) : (
        <>
          {actives.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {actives.map(carte)}
            </div>
          ) : (
            <p className="text-[var(--muted)]">Aucune boutique active.</p>
          )}

          {archivees.length > 0 && (
            <details className="mt-8">
              <summary className="cursor-pointer font-semibold mb-1">
                Boutiques archivées ({archivees.length})
              </summary>
              <p className="text-sm text-[var(--muted)] mb-4">
                Plus proposées dans le suivi mensuel. Leur historique reste
                comptabilisé dans le tableau de bord et le stock.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archivees.map(carte)}
              </div>
            </details>
          )}
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edition ? "Modifier la boutique" : "Nouvelle boutique"}
      >
        <form onSubmit={enregistrer} className="flex flex-col gap-4">
          <div>
            <label className="label">Nom *</label>
            <input
              className="input"
              value={form.nom}
              autoFocus
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex : Boutique du Centre"
            />
          </div>
          <div>
            <label className="label">Contact</label>
            <input
              className="input"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Téléphone, email, responsable…"
            />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input
              className="input"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              placeholder="Adresse de la boutique"
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="textarea"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Informations utiles…"
            />
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
    </div>
  );
}
