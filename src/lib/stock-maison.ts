import { prisma } from "@/lib/prisma";

// Types de mouvements saisis à la main. Les envois en boutique viennent du
// suivi mensuel (Entree.envoye) et ne sont pas dupliqués ici.
export const TYPES_SAISIE = ["fabrication", "sortie"] as const;
export type TypeSaisie = (typeof TYPES_SAISIE)[number];

export type StockArticle = {
  fabrique: number; // pièces fabriquées / achetées
  sorties: number; // sorties hors boutique (vente directe, don, casse…), en positif
  inventaire: number; // corrections d'inventaire cumulées (signées)
  envoye: number; // total envoyé en boutique
  vendu: number; // total vendu en boutique
  maison: number; // reste à la maison
  enBoutique: number; // reste en boutique (envoyé − vendu)
};

function vide(): StockArticle {
  return {
    fabrique: 0,
    sorties: 0,
    inventaire: 0,
    envoye: 0,
    vendu: 0,
    maison: 0,
    enBoutique: 0,
  };
}

// Stock de chaque article (à la maison et en boutique). Un article absent de
// la Map n'a aucun mouvement : tout est à 0.
export async function stockParArticle(
  articleIds?: number[],
): Promise<Map<number, StockArticle>> {
  const filtre = articleIds ? { articleId: { in: articleIds } } : undefined;
  const [mouvements, entrees] = await Promise.all([
    prisma.mouvementMaison.groupBy({
      by: ["articleId", "type"],
      where: filtre,
      _sum: { quantite: true },
    }),
    prisma.entree.groupBy({
      by: ["articleId"],
      where: filtre,
      _sum: { envoye: true, vendu: true },
    }),
  ]);

  const map = new Map<number, StockArticle>();
  const ligne = (id: number) => {
    let l = map.get(id);
    if (!l) {
      l = vide();
      map.set(id, l);
    }
    return l;
  };

  for (const m of mouvements) {
    const q = m._sum.quantite ?? 0;
    const l = ligne(m.articleId);
    if (m.type === "fabrication") l.fabrique += q;
    else if (m.type === "sortie") l.sorties -= q; // stockées en négatif
    else l.inventaire += q;
  }
  for (const e of entrees) {
    const l = ligne(e.articleId);
    l.envoye = e._sum.envoye ?? 0;
    l.vendu = e._sum.vendu ?? 0;
  }
  for (const l of map.values()) {
    l.maison = l.fabrique - l.sorties + l.inventaire - l.envoye;
    l.enBoutique = l.envoye - l.vendu;
  }
  return map;
}

export function stockDe(
  map: Map<number, StockArticle>,
  articleId: number,
): StockArticle {
  return map.get(articleId) ?? vide();
}
