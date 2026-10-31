"use client";

import { Crosshair, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { CITIES } from "@/lib/catalog";
import { haversineKm } from "@/lib/utils";
import { toast } from "./Toast";

type Loc = { location: string; lat: number | null; lng: number | null };

export function LocationPicker({ value, onChange }: { value: Loc; onChange: (v: Loc) => void }) {
  const [q, setQ] = useState(value.location);
  const [open, setOpen] = useState(false);
  const results = useMemo(
    () => CITIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6),
    [q],
  );

  const locate = () => {
    if (!navigator.geolocation) return toast.error("Your browser doesn't support location");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const nearest = [...CITIES].sort((a, b) => haversineKm(a, p) - haversineKm(b, p))[0]!;
        const name = haversineKm(nearest, p) < 80 ? nearest.name : "Near you";
        setQ(name);
        // Round to ~1km so we never store a precise home location.
        onChange({ location: name, lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 });
      },
      () => toast.error("Location permission denied"),
    );
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            className="input pl-10"
            value={q}
            placeholder="Search a city…"
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => {
              setQ(e.target.value);
              onChange({ location: e.target.value, lat: null, lng: null });
            }}
          />
        </div>
        <button type="button" onClick={locate} className="btn-outline px-3" title="Use my location" aria-label="Use my location">
          <Crosshair className="h-4 w-4" />
        </button>
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-paper-line bg-white shadow-lift">
          {results.map((c) => (
            <button
              type="button"
              key={c.name}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-paper-off"
              onMouseDown={() => {
                setQ(c.name);
                onChange({ location: c.name, lat: c.lat, lng: c.lng });
                setOpen(false);
              }}
            >
              <MapPin className="h-3.5 w-3.5 text-mint" /> {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
