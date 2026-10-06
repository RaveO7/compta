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
    const res = await fetch("/api/boutiques");
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

  async function supprimer(b: Boutique) {
    if (
      !confirm(
        `Supprimer la boutique « ${b.nom} » ? Tout son suivi mensuel sera également supprimé.`,
      )
    )
      return;
    await fetch(`/api/boutiques/${b.id}`, { method: "DELETE" });
    await charger();
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
      ) : boutiques.length === 0 ? (
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boutiques.map((b) => (
            <div key={b.id} className="card p-5 flex flex-col gap-3">
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
                  className="btn btn-danger btn-sm"
                  onClick={() => supprimer(b)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
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
