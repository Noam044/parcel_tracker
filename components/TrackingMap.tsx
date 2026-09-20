"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { formatPopupDate } from "@/lib/format";
import { useTheme, type Theme } from "@/lib/theme";
import type { Coordinates, Destination, TrackingEvent, TrackingStatus } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Les sources et layers Mapbox partagent le même id
const PAST_ROUTE = "past-route";
const FUTURE_ROUTE = "future-route";

// Style de fond et couleurs du tracé pour chaque thème. Mapbox ne lit pas les variables CSS : les valeurs
// reprennent --color-customs et --color-ink-soft de chaque thème (voir globals.css).
const MAP_THEMES = {
  light: { style: "mapbox://styles/mapbox/light-v11", route: "#00794c", remaining: "#4b5561" },
  dark: { style: "mapbox://styles/mapbox/dark-v11", route: "#34c88a", remaining: "#97a3ae" },
} satisfies Record<Theme, { style: string; route: string; remaining: string }>;

interface TrackingMapProps {
  events?: TrackingEvent[];
  destination?: Destination;
  status?: TrackingStatus;
  /** Index (dans `events`) de l'étape mise en avant */
  activeIndex?: number | null;
  onSelectEvent?: (index: number | null) => void;
}

function createElement(className: string, text?: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

// Le contenu des popups vient d'une API externe : il est inséré en texte, jamais en HTML
function createPopupContent(title: string, body?: string, footer?: string): HTMLDivElement {
  const content = createElement("");
  content.append(createElement("mb-1 text-[14px] font-bold leading-snug last:mb-0", title));
  if (body) content.append(createElement("mb-2 text-[13px] leading-snug text-ink-soft last:mb-0", body));
  if (footer) content.append(createElement("label text-ink-soft", footer));
  return content;
}

function createMarker(kind: "past" | "latest" | "destination"): HTMLDivElement {
  const el = createElement(`trk-marker${kind === "past" ? "" : ` trk-marker--${kind}`}`);
  el.dataset.active = "false";
  return el;
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

/**
 * Trace le trajet parcouru, puis le trajet restant (en ligne droite) jusqu'à la destination.
 * `destination` n'est fourni que tant que le colis est en route.
 */
function drawRoutes(
  map: mapboxgl.Map,
  events: TrackingEvent[] | undefined,
  destination: Destination | undefined,
  colors: (typeof MAP_THEMES)[Theme]
) {
  try {
    clearRoutes(map);
    if (!events?.length) return;

    const path = chronologicalPath(events);
    if (path.length >= 2) addRoute(map, PAST_ROUTE, path, colors.route, 3.5, [2, 2]);
    if (destination && path.length > 0) {
      addRoute(map, FUTURE_ROUTE, [path[path.length - 1], destination.coordinates], colors.remaining, 2.5, [1, 2.5]);
    }
  } catch {
    // Le style est en cours de remplacement : l'événement style.load relancera le tracé
  }
}

export default function TrackingMap({ events, destination, status, activeIndex = null, onSelectEvent }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const isLoadedRef = useRef(false);
  const isOpeningPopupRef = useRef(false);
  const onSelectRef = useRef(onSelectEvent);

  const isFinished = status === "Delivered" || status === "Returned";
  const showDestination = !!destination && !isFinished;

  const { theme } = useTheme();
  // Thème dont le style est appliqué à la carte (peut retarder sur `theme` le temps d'un changement)
  const appliedThemeRef = useRef<Theme>(theme);
  // Dernières données, lues par le rechargement du style pour redessiner le tracé
  const latestRef = useRef({ events, destination: showDestination ? destination : undefined });

  useEffect(() => {
    onSelectRef.current = onSelectEvent;
    latestRef.current = { events, destination: showDestination ? destination : undefined };
  });

  // Initialisation de la carte
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_THEMES[appliedThemeRef.current].style,
      center: [2.3522, 48.8566],
      zoom: 3,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      isLoadedRef.current = true;
    });

    // Un seul popup, déplacé d'une étape à l'autre. Fermé (clic sur la carte), il désélectionne l'étape.
    const popup = new mapboxgl.Popup({ closeButton: false, offset: 16, className: "trk-popup", maxWidth: "280px" });
    popup.on("close", () => {
      if (!isOpeningPopupRef.current) onSelectRef.current?.(null);
    });

    mapRef.current = map;
    popupRef.current = popup;

    return () => {
      isLoadedRef.current = false;
      mapRef.current = null;
      popupRef.current = null;
      markersRef.current = new Map();
      destinationMarkerRef.current = null;
      map.remove();
    };
  }, []);

  // Tracé et marqueurs, à chaque changement de données
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = new Map();
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
      drawRoutes(map, events, showDestination ? destination : undefined, MAP_THEMES[appliedThemeRef.current]);

      if (!events?.length) return;

      const path = chronologicalPath(events);

      // Les événements sont triés du plus récent au plus ancien : le premier avec position est le dernier connu
      let isLatest = true;
      events.forEach((event, index) => {
        if (!event.coordinates) return;

        const element = createMarker(isLatest ? "latest" : "past");
        element.addEventListener("click", () => onSelectRef.current?.(index));
        markersRef.current.set(index, new mapboxgl.Marker({ element }).setLngLat(event.coordinates).addTo(map));
        isLatest = false;
      });

      if (showDestination) {
        destinationMarkerRef.current = new mapboxgl.Marker({ element: createMarker("destination") })
          .setLngLat(destination.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 16, closeButton: false, className: "trk-popup" }).setDOMContent(
              createPopupContent("Destination", destination.label)
            )
          )
          .addTo(map);
      }

      const points = showDestination ? [...path, destination.coordinates] : path;
      if (points.length > 1) {
        const bounds = points.reduce((b, point) => b.extend(point), new mapboxgl.LngLatBounds(points[0], points[0]));
        map.fitBounds(bounds, { padding: 70, maxZoom: 10 });
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
  }, [events, destination, showDestination]);

  // Changement de thème : nouveau fond de carte, sans recréer la carte (le zoom, les marqueurs et le popup restent)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedThemeRef.current === theme) return;

    appliedThemeRef.current = theme;
    map.setStyle(MAP_THEMES[theme].style);

    // setStyle efface les sources et layers : le tracé est redessiné dès que le nouveau style est chargé
    const redraw = () => drawRoutes(map, latestRef.current.events, latestRef.current.destination, MAP_THEMES[theme]);
    map.once("style.load", redraw);
    return () => {
      map.off("style.load", redraw);
    };
  }, [theme]);

  // Étape sélectionnée : marqueur mis en avant, popup ouvert, carte recentrée
  useEffect(() => {
    const map = mapRef.current;
    const popup = popupRef.current;
    if (!map || !popup) return;

    markersRef.current.forEach((marker, index) => {
      marker.getElement().dataset.active = String(index === activeIndex);
    });

    isOpeningPopupRef.current = true;
    popup.remove();
    const event = activeIndex === null ? undefined : events?.[activeIndex];
    if (event?.coordinates) {
      popup
        .setLngLat(event.coordinates)
        .setDOMContent(createPopupContent(event.location, event.description, formatPopupDate(event.date)))
        .addTo(map);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.easeTo({
        center: event.coordinates,
        zoom: Math.max(map.getZoom(), 8),
        duration: reduceMotion ? 0 : 800,
      });
    }
    isOpeningPopupRef.current = false;
  }, [activeIndex, events]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-ink-soft">
        La carte est indisponible : la variable NEXT_PUBLIC_MAPBOX_TOKEN n&apos;est pas configurée.
      </div>
    );
  }

  // Certains transporteurs ne donnent que le pays : rien à tracer, on l'explique plutôt que d'afficher une carte vide
  const hasPosition = !!events?.some((event) => event.coordinates);
  const hasNoPosition = !!events?.length && !hasPosition;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {hasPosition ? (
        <ul className="label pointer-events-none absolute left-3 top-3 space-y-1.5 rounded border-2 border-ink bg-sheet px-3 py-2.5">
          <li className="flex items-center gap-2.5">
            <span aria-hidden="true" className="w-6 border-t-[3px] border-dashed border-customs" />
            Trajet parcouru
          </li>
          {showDestination && (
            <li className="flex items-center gap-2.5">
              <span aria-hidden="true" className="w-6 border-t-[3px] border-dotted border-ink-soft" />
              Trajet restant
            </li>
          )}
          <li className="flex items-center gap-2.5">
            <span aria-hidden="true" className="ml-1 size-3.5 rounded-full border-[3px] border-ink bg-signal" />
            Dernière position
          </li>
        </ul>
      ) : null}

      {hasNoPosition && (
        <p className="absolute inset-x-3 bottom-8 mx-auto max-w-md rounded border-2 border-ink bg-sheet px-4 py-3 text-center text-[15px]">
          <span className="label mb-1 block font-bold">Position indisponible</span>
          Le transporteur n&apos;indique pas les lieux de passage de ce colis.
        </p>
      )}
    </div>
  );
}
