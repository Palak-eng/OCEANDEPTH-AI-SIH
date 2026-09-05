/**
 * SSR-safe wrapper around the Leaflet map. Leaflet imports `window` at load,
 * so the map module is only fetched and mounted in the browser. The server
 * renders the placeholder instead.
 */
import { useEffect, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { LeafletMapProps } from "@/components/ocean/LeafletMap";

type LazyMap = ComponentType<LeafletMapProps>;

export function ClientMap({ className, ...props }: LeafletMapProps & { className?: string }) {
  const [Map, setMap] = useState<LazyMap | null>(null);

  useEffect(() => {
    let active = true;
    import("@/components/ocean/LeafletMap").then((module) => {
      if (active) setMap(() => module.LeafletMap);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!Map) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground",
          className,
        )}
      >
        Loading map…
      </div>
    );
  }

  return <Map className={cn("h-full w-full", className)} {...props} />;
}
