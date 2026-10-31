"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { CATEGORY_STYLE } from "./categories";

type Pin = { id: string; lat: number | null; lng: number | null; category: string; name: string; going: boolean };

function icon(category: string, selected: boolean, going: boolean) {
  const s = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.hackathon!;
  const size = selected ? 52 : 40;
  return L.divIcon({
    className: "hg-marker",
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    html: `<div style="position:relative;width:${size}px;height:${size + 10}px;filter:drop-shadow(0 8px 14px rgba(21,19,31,.22));transition:transform .2s">
      <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 8px;transform:rotate(-45deg);background:${s.color};border:3px solid white;display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);font-size:${selected ? 22 : 17}px">${s.emoji}</span>
      </div>
      ${going ? `<span style="position:absolute;top:-4px;right:-4px;background:#FFD65A;border:2px solid white;border-radius:999px;width:16px;height:16px;font-size:9px;display:flex;align-items:center;justify-content:center">✓</span>` : ""}
    </div>`,
  });
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 9), { duration: 0.8 });
  }, [target, map]);
  return null;
}

function Picker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function LeafletMap({
  pins,
  selectedId,
  onSelect,
  center,
  zoom = 4,
  flyTarget,
  onPick,
  picked,
}: {
  pins: Pin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  center: [number, number];
  zoom?: number;
  flyTarget?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  picked?: [number, number] | null;
}) {
  const pickIcon = useMemo(() => icon("hackathon", true, false), []);
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full" zoomControl={false} worldCopyJump>
      {/* Default: OpenStreetMap's standard tiles (no key; fine for light use per the OSM tile policy).
          Set NEXT_PUBLIC_MAP_TILE_URL (+ attribution) to use Mapbox or another provider. */}
      <TileLayer
        attribution={process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
        url={process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
      />
      <FlyTo target={flyTarget ?? null} />
      <Picker onPick={onPick} />
      {pins
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => (
          <Marker
            key={p.id}
            position={[p.lat!, p.lng!]}
            icon={icon(p.category, p.id === selectedId, p.going)}
            zIndexOffset={p.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect?.(p.id) }}
            title={p.name}
          />
        ))}
      {picked && <Marker position={picked} icon={pickIcon} />}
    </MapContainer>
  );
}
