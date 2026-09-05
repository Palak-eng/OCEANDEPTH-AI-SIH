import { ClientMap } from "@/components/ocean/ClientMap";
import { reconstruct } from "@/lib/ocean-model";
import { cn } from "@/lib/utils";

type Props = {
  lat: number;
  lon: number;
  depth: number;
  onPick: (lat: number, lon: number) => void;
  className?: string;
};

const SCALE_TICKS = [32, 28, 24, 20, 16, 12, 8, 4];

export function OceanMap({ lat, lon, depth, onPick, className }: Props) {
  const reading = reconstruct(lat, lon).levels.find((level) => level.depth === depth);

  return (
    <div className={cn("flex gap-3", className)}>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-[#08131c]">
        <ClientMap
          lat={lat}
          lon={lon}
          onPick={onPick}
          temperature={reading?.temperature}
          depth={depth}
          showHeatmap
          className="leaflet-heatmap-fill h-full w-full"
        />
      </div>

      <div className="flex w-16 flex-col items-center gap-2 py-1">
        <span className="label-caps text-[0.6rem] leading-tight">Temp °C</span>
        <div className="flex flex-1 gap-1">
          <div className="temp-scale w-4 rounded-sm border border-border" />
          <div className="flex flex-col justify-between text-[0.65rem] text-muted-foreground">
            {SCALE_TICKS.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
