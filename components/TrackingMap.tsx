"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { formatPopupDate } from "@/lib/format";
import type { Coordinates, Destination, TrackingEvent, TrackingStatus } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Les sources et layers Mapbox partagent le même id
const PAST_ROUTE = "past-route";
const FUTURE_ROUTE = "future-route";

interface TrackingMapProps {
  events?: TrackingEvent[];
  destination?: Destination;
  status?: TrackingStatus;
}

function createElement(className: string, text?: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

// Le contenu des popups vient d'une API externe : il est inséré en texte, jamais en HTML
function createPopup(title: string, body?: string, footer?: string): mapboxgl.Popup {
  const content = createElement("p-2 font-sans");
  content.append(createElement("mb-1 text-[13px] font-bold text-slate-800 last:mb-0", title));
  if (body) content.append(createElement("mb-1 text-xs text-slate-500 last:mb-0", body));
  if (footer) content.append(createElement("text-[11px] text-slate-400", footer));
  return new mapboxgl.Popup({ offset: 25, closeButton: false }).setDOMContent(content);
}

function createEventMarker(isLatest: boolean): HTMLDivElement {
  if (!isLatest) {
    return createElement("size-3.5 cursor-pointer rounded-full border-[3px] border-white bg-blue-400 shadow");
  }
  const marker = createElement("size-6 cursor-pointer");
  marker.append(
    createElement("absolute -inset-2 animate-ping rounded-full bg-blue-500 opacity-40"),
    createElement("relative z-10 size-6 rounded-full border-4 border-white bg-blue-500 shadow-md")
  );
  return marker;
}

function createDestinationMarker(): HTMLDivElement {
  const marker = createElement("size-5 cursor-pointer rounded-full border-[3px] border-dashed border-slate-400");
  marker.append(
    createElement("absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400")
  );
  return marker;
}

function clearRoutes(map: mapboxgl.Map) {
  for (const id of [PAST_ROUTE, FUTURE_ROUTE]) {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  }
}

function addRoute(map: mapboxgl.Map, id: string, coordinates: Coordinates[], color: string, width: number, dash: number[]) {
  map.addSource(id, {
    type: "geojson",
    data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } },
  });
  map.addLayer({
    id,
    type: "line",
    source: id,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": color, "line-width": width, "line-dasharray": dash },
  });
}

/** Coordonnées dans l'ordre chronologique, sans doublons consécutifs. */
function chronologicalPath(events: TrackingEvent[]): Coordinates[] {
  const path: Coordinates[] = [];
  for (const { coordinates } of [...events].reverse()) {
    if (!coordinates) continue;
    const last = path[path.length - 1];
    if (!last || last[0] !== coordinates[0] || last[1] !== coordinates[1]) path.push(coordinates);
  }
  return path;
}

export default function TrackingMap({ events, destination, status }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const isLoadedRef = useRef(false);

  // Initialisation de la carte
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [2.3522, 48.8566],
      zoom: 3,
    });
    map.on("load", () => {
      isLoadedRef.current = true;
    });
    mapRef.current = map;

    return () => {
      isLoadedRef.current = false;
      mapRef.current = null;
      markersRef.current = [];
      map.remove();
    };
  }, []);

  // Mise à jour du tracé et des marqueurs quand les données changent
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      clearRoutes(map);

      if (!events?.length) return;

      const showDestination = destination && status !== "Delivered" && status !== "Returned";
      const path = chronologicalPath(events);

      // Trajet parcouru, puis trajet restant (en ligne droite) jusqu'à la destination
      if (path.length >= 2) addRoute(map, PAST_ROUTE, path, "#3b82f6", 3, [3, 3]);
      if (showDestination && path.length > 0) {
        addRoute(map, FUTURE_ROUTE, [path[path.length - 1], destination.coordinates], "#94a3b8", 2.5, [4, 4]);
      }

      // Les événements sont triés du plus récent au plus ancien : le premier avec position est le dernier connu
      let isLatest = true;
      for (const event of events) {
        if (!event.coordinates) continue;
        markersRef.current.push(
          new mapboxgl.Marker({ element: createEventMarker(isLatest) })
            .setLngLat(event.coordinates)
            .setPopup(createPopup(event.location, event.description, formatPopupDate(event.date)))
            .addTo(map)
        );
        isLatest = false;
      }

      if (showDestination) {
        markersRef.current.push(
          new mapboxgl.Marker({ element: createDestinationMarker() })
            .setLngLat(destination.coordinates)
            .setPopup(createPopup("📍 Destination", destination.label))
            .addTo(map)
        );
      }

      const points = showDestination ? [...path, destination.coordinates] : path;
      if (points.length > 1) {
        const bounds = points.reduce((b, point) => b.extend(point), new mapboxgl.LngLatBounds(points[0], points[0]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 10 });
      } else if (points.length === 1) {
        map.flyTo({ center: points[0], zoom: 8 });
      }
    };

    if (isLoadedRef.current) {
      draw();
    } else {
      map.once("load", draw);
    }
    return () => {
      map.off("load", draw);
    };
  }, [events, destination, status]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-slate-300">
        La carte est indisponible : la variable NEXT_PUBLIC_MAPBOX_TOKEN n&apos;est pas configurée.
      </div>
    );
  }

  // Certains transporteurs ne donnent que le pays : rien à tracer, on l'explique plutôt que d'afficher une carte vide
  const hasNoPosition = !!events?.length && !events.some((event) => event.coordinates);

  return (
    <div className="relative h-full min-h-[500px] w-full">
      <div ref={containerRef} className="h-full w-full overflow-hidden rounded-2xl" />
      {hasNoPosition && (
        <p className="absolute left-1/2 top-4 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-slate-900/85 px-4 py-3 text-center text-sm text-slate-200 shadow-lg backdrop-blur">
          Position précise indisponible : le transporteur n&apos;indique pas les lieux de passage de ce colis.
        </p>
      )}
    </div>
  );
}
