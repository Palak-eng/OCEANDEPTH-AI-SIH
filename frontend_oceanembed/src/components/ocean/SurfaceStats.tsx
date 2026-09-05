import { Droplet, Thermometer, Waves, Wind } from "lucide-react";
import type { SurfaceState } from "@/lib/ocean-model";

export function SurfaceStats({ surface }: { surface: SurfaceState }) {
  const stats = [
    {
      icon: Thermometer,
      label: "SST",
      value: surface.sst.toFixed(1),
      unit: "°C",
      tone: "text-warm",
    },
    { icon: Droplet, label: "SSS", value: surface.sss.toFixed(1), unit: "PSU", tone: "text-cool" },
    {
      icon: Wind,
      label: "Wind",
      value: (Math.hypot(surface.windU, surface.windV) * 3.6).toFixed(0),
      unit: "km/h",
      tone: "text-chart-5",
    },
    {
      icon: Waves,
      label: "Current",
      value: Math.hypot(surface.currentU, surface.currentV).toFixed(1),
      unit: "m/s",
      tone: "text-teal",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map(({ icon: Icon, label, value, unit, tone }) => (
        <div key={label} className="panel-surface flex items-center gap-3 px-4 py-3">
          <span className={`flex size-10 items-center justify-center rounded-full bg-secondary/60 ${tone}`}>
            <Icon className="size-5" />
          </span>
          <div>
            <p className="label-caps">{label}</p>
            <p className="font-display text-2xl font-semibold leading-tight">
              {value}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
