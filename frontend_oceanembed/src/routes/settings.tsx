import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel } from "@/components/ocean/Panel";
import { AppShell } from "@/components/ocean/TopNav";
import { Switch } from "@/components/ui/switch";
import {
  fetchDatasets,
  fetchModelStatus,
  type BackendDatasets,
  type BackendModelStatus,
} from "@/lib/backend";
import { STANDARD_DEPTHS } from "@/lib/ocean-model";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configuration — OceanEmbed" },
      {
        name: "description",
        content:
          "Datasets, grid configuration and model settings used by the OceanEmbed subsurface temperature reconstruction framework.",
      },
      { property: "og:title", content: "Configuration — OceanEmbed" },
      {
        property: "og:description",
        content: "Input datasets, target reanalysis, depth levels and model architecture options.",
      },
    ],
  }),
  component: SettingsPage,
});

const DATASETS = [
  { name: "Sea Surface Temperature", source: "Satellite L4 analysis", res: "0.25° · daily" },
  { name: "Sea Surface Salinity", source: "SMAP / SMOS", res: "0.25° · daily (interp.)" },
  { name: "SSH / Sea Level Anomaly", source: "Altimetry gridded product", res: "0.25° · daily" },
  {
    name: "Surface currents (U, V)",
    source: "Altimetry-derived geostrophic + Ekman",
    res: "0.25° · daily",
  },
  {
    name: "Surface winds (U, V)",
    source: "Scatterometer / reanalysis blend",
    res: "0.25° · daily",
  },
  { name: "Subsurface temperature (target)", source: "GLORYS reanalysis", res: "0.083° → 0.25°" },
  { name: "Validation", source: "INCOIS LAS gridded ARGO", res: "1° · monthly" },
];

function SettingsPage() {
  const [modelStatus, setModelStatus] = useState<BackendModelStatus | null>(null);
  const [datasets, setDatasets] = useState<BackendDatasets | null>(null);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchModelStatus(), fetchDatasets()]).then(([status, data]) => {
      if (cancelled) return;
      setModelStatus(status);
      setDatasets(data);
      setBackendReachable(status !== null || data !== null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const datasetRows = datasets
    ? [
        ...datasets.surface_inputs.map((entry) => ({
          name: entry.variable,
          source: entry.product,
          res: entry.resolution,
        })),
        {
          name: datasets.target.variable,
          source: `Target · ${datasets.target.product}`,
          res: "—",
        },
      ]
    : DATASETS;

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title="Datasets"
          subtitle="Harmonised inputs, target and validation sources"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-caps">
                  <th className="px-4 py-2 text-left font-semibold">Variable</th>
                  <th className="px-4 py-2 text-left font-semibold">Source</th>
                  <th className="px-4 py-2 text-left font-semibold">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {datasetRows.map((d) => (
                  <tr key={d.name} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-4 py-2">{d.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{d.source}</td>
                    <td className="px-4 py-2 text-muted-foreground">{d.res}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-xs text-muted-foreground">
            {datasets
              ? `Standard grid · ${datasets.standard_grid.spatial_resolution}, ${datasets.standard_grid.temporal_resolution}`
              : "Showing curated defaults (backend offline)."}
          </p>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Backend service" info="Django API · proxied via server functions">
            <div className="flex items-center gap-3">
              <span
                className={`size-2.5 rounded-full ${
                  backendReachable === null
                    ? "bg-muted-foreground"
                    : backendReachable
                      ? "bg-emerald-500"
                      : "bg-red-500"
                }`}
              />
              <p className="font-display text-lg font-semibold">
                {backendReachable === null
                  ? "Connecting…"
                  : backendReachable
                    ? (modelStatus?.status ?? "Online")
                    : "Offline"}
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {modelStatus?.message ??
                "Backend unreachable — the app continues on simulated demo data."}
            </p>
            {modelStatus?.input_variables && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {modelStatus.input_variables.map((variable) => (
                  <span
                    key={variable}
                    className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 font-mono text-xs"
                  >
                    {variable}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Model options">
            <ul className="space-y-4 text-sm">
              {[
                { label: "ViT embedding encoder", detail: "16×16 patches, 128-d latent", on: true },
                { label: "CNN residual branch", detail: "Local mesoscale features", on: true },
                {
                  label: "Graph attention refinement",
                  detail: "Neighbour grid coupling",
                  on: false,
                },
                { label: "ARGO fine-tuning", detail: "Adapt to in-situ profiles", on: true },
              ].map((o) => (
                <li key={o.label} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.detail}</p>
                  </div>
                  <Switch defaultChecked={o.on} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Output grid" subtitle="Standard depth levels (m)">
            <div className="flex flex-wrap gap-2">
              {(modelStatus?.standard_depths_m ?? [...STANDARD_DEPTHS]).map((d) => (
                <span
                  key={d}
                  className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-display text-xs"
                >
                  {d}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {modelStatus
                ? `Region ${modelStatus.region_bounds.min_latitude}°N–${modelStatus.region_bounds.max_latitude}°N, ${modelStatus.region_bounds.min_longitude}°E–${modelStatus.region_bounds.max_longitude}°E · 0.25° × 0.25° · daily.`
                : "Region 5°N–30°N, 45°E–105°E · 0.25° × 0.25° · daily temporal resolution."}
            </p>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
