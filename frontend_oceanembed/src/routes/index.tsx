import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/ocean/TopNav";
import { OceanMap } from "@/components/ocean/OceanMap";
import { Panel } from "@/components/ocean/Panel";
import { SurfaceStats } from "@/components/ocean/SurfaceStats";
import { TimeSeriesChart, VerticalProfileChart } from "@/components/ocean/Charts";
import { DataSourcePanel, LocationDetails, LocationPicker } from "@/components/ocean/SidePanels";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchPredictions, type PredictResult } from "@/lib/backend";
import { STANDARD_DEPTHS, reconstruct, timeSeriesFor } from "@/lib/ocean-model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OceanEmbed — Subsurface Ocean Temperature Dashboard" },
      {
        name: "description",
        content:
          "Reconstruct depth-wise subsurface ocean temperature over the North Indian Ocean from daily satellite surface observations using satellite embeddings.",
      },
      { property: "og:title", content: "OceanEmbed — Subsurface Temperature Reconstruction" },
      {
        property: "og:description",
        content:
          "Daily 0.25° subsurface temperature profiles reconstructed from SST, SSS, SLA, currents and winds.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [draft, setDraft] = useState({ lat: 18.2, lon: 72.5 });
  const [point, setPoint] = useState({ lat: 15.2, lon: 88.6 });
  const [depth, setDepth] = useState(100);
  const [profile, setProfile] = useState<PredictResult | null>(null);
  const [backendPending, setBackendPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBackendPending(true);
    fetchPredictions({ data: { latitude: point.lat, longitude: point.lon, date: "2020-08-01" } })
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .finally(() => {
        if (!cancelled) setBackendPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [point]);

  const data = useMemo(() => {
    const base = reconstruct(point.lat, point.lon);
    if (!profile || profile.source !== "live") return base;
    return {
      ...base,
      levels: base.levels.map((level) => ({
        ...level,
        temperature: profile.temperatures[level.depth] ?? level.temperature,
      })),
    };
  }, [point, profile]);
  const series = useMemo(() => {
    const baseTemperature = data.levels.find((level) => level.depth === depth)?.temperature;
    return timeSeriesFor(point.lat, point.lon, depth, baseTemperature);
  }, [point, depth, data]);

  const statusLabel =
    profile?.source === "live" ? `live · ${profile.mode}` : backendPending ? "connecting…" : "demo";

  function exportCsv() {
    const csv = [
      "depth_m,predicted_temp_c,argo_reference_c,confidence_pct",
      ...data.levels.map((l) => `${l.depth},${l.temperature},${l.reference},${l.confidence}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `oceanembed_profile_${point.lat}N_${point.lon}E.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Profile exported as CSV");
  }

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <LocationPicker
            lat={draft.lat}
            lon={draft.lon}
            onPick={(lat, lon) => setDraft({ lat, lon })}
            onConfirm={() => {
              setPoint(draft);
              toast.success(`Reconstructing profile at ${draft.lat}°N, ${draft.lon}°E`);
            }}
          />
          <DataSourcePanel onExport={exportCsv} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SurfaceStats surface={data.surface} />

          <div className="grid gap-4 2xl:grid-cols-2">
            <Panel
              title="Ocean map view"
              subtitle={`Predicted subsurface temperature at ${depth} m depth · ${statusLabel}`}
              bodyClassName="p-3"
            >
              <OceanMap
                lat={point.lat}
                lon={point.lon}
                depth={depth}
                onPick={(lat, lon) => setPoint({ lat, lon })}
                className="h-[18rem]"
              />
            </Panel>
            <LocationDetails
              data={data}
              depth={depth}
              onClear={() => setPoint({ lat: 15.2, lon: 88.6 })}
            />
          </div>

          <div className="grid gap-4 2xl:grid-cols-3">
            <Panel title="Vertical temperature profile" subtitle="Predicted vs reference (ARGO)">
              <VerticalProfileChart levels={data.levels} />
            </Panel>

            <Panel
              title="Depth-wise values"
              action={
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={exportCsv}>
                  <Download className="size-3.5" /> Export
                </Button>
              }
              bodyClassName="p-0"
            >
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-popover">
                    <tr className="label-caps">
                      <th className="px-4 py-2 text-left font-semibold">Depth (m)</th>
                      <th className="px-4 py-2 text-right font-semibold">Temp (°C)</th>
                      <th className="px-4 py-2 text-right font-semibold">Conf. (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.levels.map((l) => (
                      <tr
                        key={l.depth}
                        onClick={() => setDepth(l.depth)}
                        className={`cursor-pointer border-t border-border transition-colors hover:bg-secondary/50 ${
                          l.depth === depth ? "bg-primary/20" : ""
                        }`}
                      >
                        <td className="px-4 py-2 text-muted-foreground">{l.depth}</td>
                        <td className="px-4 py-2 text-right font-display">
                          {l.temperature.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {l.confidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="Time series at selected location"
              subtitle="Daily reconstruction, Aug 2020"
              action={
                <Select value={String(depth)} onValueChange={(v) => setDepth(Number(v))}>
                  <SelectTrigger className="h-8 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_DEPTHS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} m
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              <TimeSeriesChart data={series} />
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
