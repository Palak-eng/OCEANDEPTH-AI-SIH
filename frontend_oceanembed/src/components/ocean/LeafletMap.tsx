/**
 * Client-only Leaflet map. This module is NEVER imported on the server — it is
 * lazily loaded over a dynamic import from ClientMap so `window`-dependent
 * Leaflet code never touches the SSR bundle.
 */
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import heatmap from "@/assets/ocean-heatmap.jpg";
import { REGION } from "@/lib/ocean-model";

export type LeafletMapProps = {
  lat: number;
  lon: number;
  onPick: (lat: number, lon: number) => void;
  temperature?: number | undefined;
  depth?: number;
  showHeatmap?: boolean;
  className?: string;
};

const REGION_BOUNDS: L.LatLngBoundsExpression = [
  [REGION.latMin, REGION.lonMin],
  [REGION.latMax, REGION.lonMax],
];

const IMAGE_ASPECT = 1200 / 912;
const LON_SPAN = REGION.lonMax - REGION.lonMin;
const LAT_SPAN = LON_SPAN / IMAGE_ASPECT;
const LAT_CENTER = (REGION.latMin + REGION.latMax) / 2;

const IMAGE_BOUNDS: L.LatLngBoundsExpression = [
  [REGION.latMin, REGION.lonMin],
  [REGION.latMax, REGION.lonMax],
];

function selectorIcon() {
  return L.divIcon({
    className: "",
    html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:oklch(0.72 0.13 178);border:2px solid #fff;box-shadow:0 0 0 6px rgb(255 255 255 / 0.15);"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
}

function PickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      const clampedLat = Math.min(REGION.latMax, Math.max(REGION.latMin, lat));
      const clampedLon = Math.min(REGION.lonMax, Math.max(REGION.lonMin, lng));
      onPick(Number(clampedLat.toFixed(1)), Number(clampedLon.toFixed(1)));
    },
  });
  return null;
}

function FocusRegion({ showHeatmap }: { showHeatmap?: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(REGION_BOUNDS, { animate: false, padding: [0, 0] });
  }, [map, showHeatmap]);
  return null;
}

export function LeafletMap({
  lat,
  lon,
  onPick,
  temperature,
  depth,
  showHeatmap,
  className,
}: LeafletMapProps) {
  const icon = selectorIcon();

  if (showHeatmap) {
    const normLon = (lon - REGION.lonMin) / (REGION.lonMax - REGION.lonMin);
    const normLat = (lat - REGION.latMin) / (REGION.latMax - REGION.latMin);
    const leftPct = Math.min(100, Math.max(0, normLon * 100));
    const bottomPct = Math.min(100, Math.max(0, normLat * 100));

    return (
      <div
        className={cn("relative h-full w-full overflow-hidden select-none cursor-crosshair", className)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = 1 - (e.clientY - rect.top) / rect.height;
          const pickedLon = REGION.lonMin + x * (REGION.lonMax - REGION.lonMin);
          const pickedLat = REGION.latMin + y * (REGION.latMax - REGION.latMin);
          onPick(
            Number(Math.min(REGION.latMax, Math.max(REGION.latMin, pickedLat)).toFixed(1)),
            Number(Math.min(REGION.lonMax, Math.max(REGION.lonMin, pickedLon)).toFixed(1))
          );
        }}
      >
        <img
          src={heatmap}
          alt="Ocean Subsurface Heatmap"
          className="h-full w-full object-cover rounded-lg"
        />
        <div
          className="absolute z-10 -translate-x-1/2 translate-y-1/2 pointer-events-none"
          style={{ left: `${leftPct}%`, bottom: `${bottomPct}%` }}
        >
          <span className="block h-4 w-4 rounded-full bg-accent border-2 border-white shadow-[0_0_0_6px_rgba(255,255,255,0.25)] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={[lat, lon]}
      zoom={12}
      minZoom={3}
      maxZoom={12}
      scrollWheelZoom
      className={className ?? "h-full w-full outline-none"}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Rectangle
        bounds={REGION_BOUNDS}
        pathOptions={{ color: "#2dd4bf", weight: 1, dashArray: "5 5", fill: false }}
        interactive={false}
      />
      <PickHandler onPick={onPick} />
      <FocusRegion showHeatmap={showHeatmap ?? false} />
      <Marker position={[lat, lon]} icon={icon}>
        <Popup closeButton={false}>
          <div style={{ fontFamily: "inherit", fontSize: 12, lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>
              Lat <strong>{lat.toFixed(1)}° N</strong>
            </p>
            <p style={{ margin: 0 }}>
              Lon <strong>{lon.toFixed(1)}° E</strong>
            </p>
            {temperature !== undefined && (
              <p style={{ margin: 0 }}>
                Temp {depth !== undefined ? `(${depth} m) ` : ""}
                <strong>{temperature.toFixed(1)} °C</strong>
              </p>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}