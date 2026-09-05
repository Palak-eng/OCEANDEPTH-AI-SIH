import { Brain, Clock, Database, Download, Droplets, LocateFixed, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ClientMap } from "@/components/ocean/ClientMap";
import { Panel } from "@/components/ocean/Panel";
import { Button } from "@/components/ui/button";
import { REGION, SKILL_METRICS, type Reconstruction } from "@/lib/ocean-model";

export function LocationPicker({
  lat,
  lon,
  onPick,
  onConfirm,
}: {
  lat: number;
  lon: number;
  onPick: (lat: number, lon: number) => void;
  onConfirm: () => void;
}) {
  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const rawLat = position.coords.latitude;
        const rawLon = position.coords.longitude;
        const clampedLat = Math.min(REGION.latMax, Math.max(REGION.latMin, rawLat));
        const clampedLon = Math.min(REGION.lonMax, Math.max(REGION.lonMin, rawLon));
        onPick(Number(clampedLat.toFixed(1)), Number(clampedLon.toFixed(1)));
        toast.success("Location set from your device.");
      },
      () => toast.error("Could not access your location — check browser permission."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <Panel
      title="Select location"
      info="Click the real map to pick a grid point in the study region"
    >
      <div className="relative aspect-[5/4] overflow-hidden rounded-lg border border-border">
        <ClientMap lat={lat} lon={lon} onPick={onPick} className="h-full w-full" />
      </div>

      <div className="mt-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center font-display text-sm">
        {lat.toFixed(1)}°N, {lon.toFixed(1)}°E
      </div>

      <Button variant="secondary" className="mt-2 w-full gap-2" onClick={useMyLocation}>
        <LocateFixed className="size-4" /> Use my location
      </Button>
      <Button variant="default" className="mt-3 w-full" onClick={onConfirm}>
        Confirm location
      </Button>
    </Panel>
  );
}

export function DataSourcePanel({ onExport }: { onExport: () => void }) {
  const rows = [
    {
      icon: Database,
      label: "Data source",
      value: "Satellite · Gridded ARGO · GLORYS",
    },
    { icon: Clock, label: "Last updated", value: "03 Jun 2023, 10:30 AM IST" },
    { icon: Brain, label: "Model", value: "OceanEmbed v1.0 — ViT + CNN embeddings" },
    {
      icon: ShieldCheck,
      label: "Accuracy",
      value: SKILL_METRICS.map((m) => `${m.label}: ${m.value}`).join(" | "),
    },
  ];

  return (
    <Panel title="Pipeline status" info="Harmonised to 0.25° × 0.25°, daily">
      <ul className="space-y-4">
        {rows.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-accent">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="label-caps">{label}</p>
              <p className="text-sm text-foreground/90">{value}</p>
            </div>
          </li>
        ))}
      </ul>
      <Button variant="secondary" className="mt-4 w-full gap-2" onClick={onExport}>
        <Download className="size-4" /> Export data
      </Button>
    </Panel>
  );
}

export function LocationDetails({
  data,
  depth,
  onClear,
}: {
  data: Reconstruction;
  depth: number;
  onClear: () => void;
}) {
  const level = data.levels.find((l) => l.depth === depth) ?? data.levels[0]!;
  const cells = [
    { value: `${level.temperature.toFixed(1)} °C`, label: `Predicted temp (${depth} m)` },
    { value: `${level.confidence}%`, label: "Model confidence" },

    { value: `${data.surface.sst.toFixed(1)} °C`, label: "Sea surface temp (SST)" },
    { value: `${data.surface.sss.toFixed(1)} PSU`, label: "Salinity (SSS)" },
    { value: `${data.surface.sla.toFixed(2)} m`, label: "Sea level anomaly (SLA)" },
    {
      value: `${Math.hypot(data.surface.currentU, data.surface.currentV).toFixed(2)} m/s`,
      label: "Surface current speed",
    },
    { value: `${data.mld} m`, label: "Mixed layer depth" },
    { value: `${data.heatContent} °C`, label: "Mean temp 0–300 m" },
  ];

  return (
    <Panel
      title="Location details"
      action={
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear
        </Button>
      }
    >
      <div className="flex items-start gap-2">
        <Droplets className="mt-1 size-5 text-accent" />
        <div>
          <p className="font-display text-2xl font-semibold">
            {data.lat.toFixed(1)}° N, {data.lon.toFixed(1)}° E
          </p>
          <p className="text-sm text-muted-foreground">{data.basin}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="font-display text-lg font-semibold">{c.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
