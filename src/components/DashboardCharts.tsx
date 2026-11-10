"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMontant, formatMoisCourt } from "@/lib/format";

type ChartColors = {
  grid: string;
  axis: string;
  foreground: string;
  tooltipBg: string;
  tooltipText: string;
  border: string;
};

const COULEURS_PAR_DEFAUT: ChartColors = {
  grid: "#eef0f5",
  axis: "#64748b",
  foreground: "#0f172a",
  tooltipBg: "#ffffff",
  tooltipText: "#0f172a",
  border: "#e2e8f0",
};

function lire(variable: string, secours: string): string {
  const valeur = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return valeur || secours;
}

function useChartColors(): ChartColors {
  const [couleurs, setCouleurs] = useState<ChartColors>(COULEURS_PAR_DEFAUT);

  useEffect(() => {
    const maj = () =>
      setCouleurs({
        grid: lire("--chart-grid", COULEURS_PAR_DEFAUT.grid),
        axis: lire("--chart-axis", COULEURS_PAR_DEFAUT.axis),
        foreground: lire("--foreground", COULEURS_PAR_DEFAUT.foreground),
        tooltipBg: lire("--chart-tooltip-bg", COULEURS_PAR_DEFAUT.tooltipBg),
        tooltipText: lire("--chart-tooltip-text", COULEURS_PAR_DEFAUT.tooltipText),
        border: lire("--border", COULEURS_PAR_DEFAUT.border),
      });

    maj();

    const observer = new MutationObserver(maj);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return couleurs;
}

function tooltipProps(couleurs: ChartColors) {
  return {
    contentStyle: {
      borderRadius: 12,
      border: `1px solid ${couleurs.border}`,
      fontSize: 13,
      background: couleurs.tooltipBg,
      color: couleurs.tooltipText,
    },
    labelStyle: { color: couleurs.tooltipText, fontWeight: 600 },
    itemStyle: { color: couleurs.tooltipText },
    cursor: { fill: couleurs.grid, opacity: 0.6 },
  };
}

type PointMois = {
  mois: string;
  ca: number;
  envoye: number;
  vendu: number;
};
type PointBoutique = { nom: string; ca: number; vendu: number };
type PointStock = {
  nom: string;
  envoye: number;
  vendu: number;
  reste: number;
};

const COULEURS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function GraphiqueMensuel({ data }: { data: PointMois[] }) {
  const couleurs = useChartColors();
  const formate = data.map((d) => ({ ...d, label: formatMoisCourt(d.mois) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={formate} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={couleurs.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: couleurs.axis }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: couleurs.axis }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value, name) =>
            name === "CA" ? formatMontant(Number(value)) : String(value)
          }
          {...tooltipProps(couleurs)}
        />
        <Bar dataKey="ca" name="CA" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={42} />
        <Line
          dataKey="vendu"
          name="Vendu"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3 }}
          yAxisId={0}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GraphiqueBoutiques({ data }: { data: PointBoutique[] }) {
  const couleurs = useChartColors();
  if (data.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-8 text-center">
        Aucune vente enregistrée.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={couleurs.grid} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: couleurs.axis }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="nom"
          tick={{ fontSize: 12, fill: couleurs.foreground }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          formatter={(value) => formatMontant(Number(value))}
          {...tooltipProps(couleurs)}
        />
        <Bar dataKey="ca" name="CA" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type PointBoutiqueBenefice = {
  nom: string;
  ca: number;
  frais: number;
  materiel: number;
};

export function GraphiqueBoutiquesBenefice({
  data,
}: {
  data: PointBoutiqueBenefice[];
}) {
  const couleurs = useChartColors();
  if (data.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-8 text-center">
        Aucune vente enregistrée.
      </p>
    );
  }
  // Barre empilée : bénéfice + charges = CA (charges plafonnées au CA si perte)
  const formate = data.map((d) => {
    const net = d.ca - d.frais - d.materiel;
    const benefice = Math.max(0, net);
    return { nom: d.nom, ca: d.ca, net, benefice, charges: d.ca - benefice };
  });
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart
        data={formate}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={couleurs.grid} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: couleurs.axis }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="nom"
          tick={{ fontSize: 12, fill: couleurs.foreground }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          formatter={(value, name, item) => {
            const p = item.payload as (typeof formate)[number];
            if (name === "Bénéfice") return formatMontant(p.net);
            if (name === "CA") return formatMontant(p.ca);
            return formatMontant(Number(value));
          }}
          labelFormatter={(label, payload) => {
            const p = payload?.[0]?.payload as (typeof formate)[number] | undefined;
            return p?.nom ?? String(label);
          }}
          {...tooltipProps(couleurs)}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="benefice" name="Bénéfice" stackId="s" fill="#22D3EE" maxBarSize={28} />
        <Bar dataKey="charges" name="CA" stackId="s" fill="#4f46e5" radius={[0, 6, 6, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraphiqueFluxStock({ data }: { data: PointMois[] }) {
  const couleurs = useChartColors();
  const formate = data.map((d) => ({ ...d, label: formatMoisCourt(d.mois) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={formate} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={couleurs.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: couleurs.axis }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: couleurs.axis }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          {...tooltipProps(couleurs)}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="envoye" name="Envoyé" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={32} />
        <Bar dataKey="vendu" name="Vendu" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GraphiqueStockArticles({ data }: { data: PointStock[] }) {
  const couleurs = useChartColors();
  if (data.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-8 text-center">
        Aucun stock enregistré.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={couleurs.grid} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: couleurs.axis }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="nom"
          tick={{ fontSize: 12, fill: couleurs.foreground }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          {...tooltipProps(couleurs)}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="vendu" name="Vendu" stackId="s" fill="#10b981" maxBarSize={28} />
        <Bar dataKey="reste" name="Reste" stackId="s" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
