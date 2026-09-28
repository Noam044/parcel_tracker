"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { destinationLabel, eventDescriptionText, eventLocationText } from "@/lib/display";
import { formatPopupDate } from "@/lib/format";
import { useT } from "@/lib/locale";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/locale-script";
import { chronologicalPath, MAP_THEMES, type MapView } from "@/lib/map-view";
import { useTheme, type Theme } from "@/lib/theme";
import type { Coordinates, Destination, TrackingEvent } from "@/lib/types";

// Les sources et layers Mapbox partagent le même id
const PAST_ROUTE = "past-route";
const FUTURE_ROUTE = "future-route";

const styleUrl = (theme: Theme) => `mapbox://styles/${MAP_THEMES[theme].style}`;

interface TrackingMapProps {
  token: string;
  events: TrackingEvent[];
  /** Fournie seulement tant que le colis est en route */
  destination?: Destination;
  /** Vue de départ, identique à celle de l'aperçu statique (voir lib/map-view.ts) */
  initialView: MapView;
  /** Index (dans `events`) de l'étape mise en avant */
  activeIndex: number | null;
  onSelectEvent: (index: number | null) => void;
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

function createMarker(kind: "past" | "latest" | "destination", isActive = false): HTMLDivElement {
  const el = createElement(`trk-marker${kind === "past" ? "" : ` trk-marker--${kind}`}`);
  el.dataset.active = String(isActive);
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

/** Trace le trajet parcouru, puis le trajet restant (en ligne droite) jusqu'à la destination. */
function drawRoutes(
  map: mapboxgl.Map,
  events: TrackingEvent[],
  destination: Destination | undefined,
  colors: (typeof MAP_THEMES)[Theme]
) {
  try {
    clearRoutes(map);
    const path = chronologicalPath(events);
    if (path.length >= 2) addRoute(map, PAST_ROUTE, path, colors.route, 3.5, [2, 2]);
    if (destination && path.length > 0) {
      addRoute(map, FUTURE_ROUTE, [path[path.length - 1], destination.coordinates], colors.remaining, 2.5, [1, 2.5]);
    }
  } catch {
    // Le style est en cours de remplacement : l'événement style.load relancera le tracé
  }
}

/**
 * Carte interactive (mapbox-gl, ~450 Ko). Elle n'est chargée qu'à la demande, par-dessus l'aperçu
 * statique (voir MapPanel) : tant que son style n'est pas prêt, son canevas transparent laisse voir
 * l'aperçu, qu'elle recouvre ensuite à l'identique.
 */
export default function TrackingMap({ token, events, destination, initialView, activeIndex, onSelectEvent }: TrackingMapProps) {
  const { locale, t } = useT();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const isLoadedRef = useRef(false);
  const isOpeningPopupRef = useRef(false);

  const { theme } = useTheme();
  // Lus dans les effets qui ne s'exécutent qu'une fois (création de la carte, rechargement du style) via
  // des refs, pour ne jamais en dépendre : la carte n'a pas à être recréée quand ces valeurs changent.
  const onSelectRef = useRef(onSelectEvent);
  const localeRef = useRef<Locale>(locale);
  const tRef = useRef<Dictionary>(t);
  const activeIndexRef = useRef(activeIndex);
  const initialViewRef = useRef(initialView);
  // Thème dont le style est appliqué à la carte (peut retarder sur `theme` le temps d'un changement)
  const appliedThemeRef = useRef<Theme>(theme);
  const latestRef = useRef({ events, destination });

  useEffect(() => {
    onSelectRef.current = onSelectEvent;
    latestRef.current = { events, destination };
    localeRef.current = locale;
    tRef.current = t;
    activeIndexRef.current = activeIndex;
  });

  // Création de la carte, directement sur la vue du trajet : pas de survol animé depuis une vue par
  // défaut, donc aucune tuile téléchargée pour rien
  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl(appliedThemeRef.current),
      center: initialViewRef.current.center,
      zoom: initialViewRef.current.zoom,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      isLoadedRef.current = true;
    });

    // Un seul popup, déplacé d'une étape à l'autre. Fermé (clic sur la carte), il désélectionne l'étape.
    const popup = new mapboxgl.Popup({ closeButton: false, offset: 16, className: "trk-popup", maxWidth: "280px" });
    popup.on("close", () => {
      if (!isOpeningPopupRef.current) onSelectRef.current(null);
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
  }, [token]);

  // Tracé et marqueurs
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = new Map();
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
      drawRoutes(map, events, destination, MAP_THEMES[appliedThemeRef.current]);

      // Les événements sont triés du plus récent au plus ancien : le premier avec position est le dernier connu
      let isLatest = true;
      events.forEach((event, index) => {
        if (!event.coordinates) return;

        const element = createMarker(isLatest ? "latest" : "past", index === activeIndexRef.current);
        element.addEventListener("click", () => onSelectRef.current(index));
        markersRef.current.set(index, new mapboxgl.Marker({ element }).setLngLat(event.coordinates).addTo(map));
        isLatest = false;
      });

      if (destination) {
        destinationMarkerRef.current = new mapboxgl.Marker({ element: createMarker("destination") })
          .setLngLat(destination.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 16, closeButton: false, className: "trk-popup" }).setDOMContent(
              createPopupContent(tRef.current.map.destinationTitle, destinationLabel(destination, localeRef.current))
            )
          )
          .addTo(map);
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
  }, [events, destination]);

  // Changement de thème : nouveau fond de carte, sans recréer la carte (le zoom, les marqueurs et le popup restent)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedThemeRef.current === theme) return;

    appliedThemeRef.current = theme;
    map.setStyle(styleUrl(theme));

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
    const event = activeIndex === null ? undefined : events[activeIndex];
    if (event?.coordinates) {
      popup
        .setLngLat(event.coordinates)
        .setDOMContent(
          createPopupContent(
            eventLocationText(event, locale, t),
            eventDescriptionText(event, t),
            formatPopupDate(event.date, locale)
          )
        )
        .addTo(map);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.easeTo({
        center: event.coordinates,
        zoom: Math.max(map.getZoom(), 8),
        duration: reduceMotion ? 0 : 800,
      });
    }
    isOpeningPopupRef.current = false;
  }, [activeIndex, events, locale, t]);

  // Deux niveaux : mapbox-gl impose position: relative à son conteneur, ce qui annulerait le placement par-dessus l'aperçu
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
