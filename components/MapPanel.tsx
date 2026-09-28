"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/locale";
import { chronologicalPath, fitView, staticMapUrl, toPixel, type MapView } from "@/lib/map-view";
import { useTheme } from "@/lib/theme";
import type { Coordinates, Destination, TrackingEvent, TrackingStatus } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// mapbox-gl pèse ~450 Ko et plusieurs secondes de calcul sur un téléphone : la carte interactive n'est
// chargée qu'à la demande, par-dessus l'aperçu statique qu'elle recouvre à l'identique
const TrackingMap = dynamic(() => import("./TrackingMap"), { ssr: false, loading: () => null });
// Survol, focus ou toucher de la carte : on commence le téléchargement avant même le clic
const preloadTrackingMap = () => void import("./TrackingMap");

// Taille demandée à l'API arrondie au-dessus : quelques pixels de redimensionnement ne rechargent pas l'image
const SIZE_STEP = 32;
const MAX_STATIC_SIZE = 1280;
const roundSize = (value: number) => Math.min(MAX_STATIC_SIZE, Math.ceil(value / SIZE_STEP) * SIZE_STEP);

interface MapPanelProps {
  events: TrackingEvent[];
  destination?: Destination;
  status: TrackingStatus;
  /** Index (dans `events`) de l'étape mise en avant */
  activeIndex: number | null;
  onSelectEvent: (index: number | null) => void;
  isInteractive: boolean;
  onActivate: () => void;
}

function Message({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-6 text-center text-[15px]">
      {title && <p className="label mb-1 font-bold">{title}</p>}
      <p className="text-ink-soft">{children}</p>
    </div>
  );
}

interface OverlayProps {
  events: TrackingEvent[];
  destination?: Destination;
  view: MapView;
  width: number;
  height: number;
  onSelectEvent: (index: number) => void;
}

/** Tracé et marqueurs de l'aperçu, aux couleurs du site (mêmes formes que ceux de la carte interactive). */
function RouteOverlay({ events, destination, view, width, height, onSelectEvent }: OverlayProps) {
  const pixel = (point: Coordinates) => toPixel(point, view, width, height);
  const path = chronologicalPath(events).map(pixel);
  const latestIndex = events.findIndex((event) => event.coordinates);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="pointer-events-none absolute inset-0">
      {path.length >= 2 && (
        <polyline
          points={path.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          strokeWidth={3.5}
          strokeDasharray="7 7"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: "var(--color-customs)" }}
        />
      )}
      {destination && path.length > 0 && (
        <line
          x1={path[path.length - 1][0]}
          y1={path[path.length - 1][1]}
          x2={pixel(destination.coordinates)[0]}
          y2={pixel(destination.coordinates)[1]}
          strokeWidth={2.5}
          strokeDasharray="2.5 6.25"
          strokeLinecap="round"
          style={{ stroke: "var(--color-ink-soft)" }}
        />
      )}
      {destination && (
        <circle
          cx={pixel(destination.coordinates)[0]}
          cy={pixel(destination.coordinates)[1]}
          r={7.5}
          strokeWidth={3}
          strokeDasharray="4 3"
          style={{ fill: "var(--color-sheet)", stroke: "var(--color-ink)" }}
        />
      )}
      {/* Du plus ancien au plus récent : la dernière position est dessinée par-dessus les autres */}
      {events
        .map((event, index) => ({ event, index }))
        .reverse()
        .map(({ event, index }) => {
          if (!event.coordinates) return null;
          const [x, y] = pixel(event.coordinates);
          const isLatest = index === latestIndex;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={isLatest ? 8.5 : 4.75}
              strokeWidth={isLatest ? 3 : 2.5}
              className="pointer-events-auto cursor-pointer"
              style={
                isLatest
                  ? { fill: "var(--color-signal)", stroke: "var(--color-ink)" }
                  : { fill: "var(--color-sheet)", stroke: "var(--color-customs)" }
              }
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onSelectEvent(index);
              }}
            />
          );
        })}
    </svg>
  );
}

export default function MapPanel({
  events,
  destination,
  status,
  activeIndex,
  onSelectEvent,
  isInteractive,
  onActivate,
}: MapPanelProps) {
  const { t } = useT();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number; retina: boolean } | null>(null);
  // Sur téléphone la carte ne fait que 340 px de haut : la légende y est repliée derrière un bouton
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const legendId = useId();

  const isFinished = status === "Delivered" || status === "Returned";
  const shownDestination = destination && !isFinished ? destination : undefined;
  const path = chronologicalPath(events);

  // Le cadrage dépend de la taille réelle du panneau (340 px sur téléphone, toute la hauteur sur ordinateur)
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = (width: number, height: number) => {
      const next = { width: Math.round(width), height: Math.round(height), retina: window.devicePixelRatio > 1 };
      setSize((current) =>
        current?.width === next.width && current.height === next.height && current.retina === next.retina ? current : next
      );
    };
    // Mesure immédiate : l'observateur ne se déclenche qu'au prochain rendu, qui n'a pas lieu dans un onglet en arrière-plan
    const rect = element.getBoundingClientRect();
    update(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width, entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!MAPBOX_TOKEN) return <Message>{t.map.tokenMissing}</Message>;
  // Certains transporteurs ne donnent que le pays : rien à tracer, et inutile de charger une carte
  if (path.length === 0) return <Message title={t.map.noPositionTitle}>{t.map.noPositionText}</Message>;

  const points = shownDestination ? [...path, shownDestination.coordinates] : path;
  const view = size && size.width > 0 && size.height > 0 ? fitView(points, size.width, size.height) : null;
  const imageWidth = size ? roundSize(size.width) : 0;
  const imageHeight = size ? roundSize(size.height) : 0;
  const retina = size?.retina ?? false;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      onPointerEnter={preloadTrackingMap}
      onTouchStart={preloadTrackingMap}
      onFocus={preloadTrackingMap}
    >
      {view && (
        // Centrée sur le panneau : l'image, un peu plus grande (taille arrondie), déborde également des deux côtés
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${isInteractive ? "" : "cursor-pointer"}`}
          style={{ width: imageWidth, height: imageHeight }}
          onClick={isInteractive ? undefined : onActivate}
        >
          {/* Déjà compressée par Mapbox : l'optimiseur de Next ajouterait un appel serveur par image */}
          <Image
            src={staticMapUrl(theme, view, { width: imageWidth, height: imageHeight, retina }, MAPBOX_TOKEN)}
            alt=""
            width={imageWidth}
            height={imageHeight}
            unoptimized
            loading="eager"
            className="absolute inset-0 size-full"
          />
          <RouteOverlay
            events={events}
            destination={shownDestination}
            view={view}
            width={imageWidth}
            height={imageHeight}
            onSelectEvent={onSelectEvent}
          />
        </div>
      )}

      {isInteractive && view && (
        <TrackingMap
          token={MAPBOX_TOKEN}
          events={events}
          destination={shownDestination}
          initialView={view}
          activeIndex={activeIndex}
          onSelectEvent={onSelectEvent}
        />
      )}

      {!isInteractive && (
        <button
          type="button"
          onClick={onActivate}
          className="label absolute right-3 top-3 rounded border-2 border-ink bg-sheet px-3 py-2 hover:bg-ink hover:text-sheet"
        >
          {t.map.explore}
        </button>
      )}

      <button
        type="button"
        onClick={() => setIsLegendOpen((open) => !open)}
        aria-expanded={isLegendOpen}
        aria-controls={legendId}
        className="label absolute left-3 top-3 rounded border-2 border-ink bg-sheet px-3 py-2 sm:hidden"
      >
        {isLegendOpen ? t.map.hideLegend : t.map.showLegend}
      </button>
      <ul
        id={legendId}
        className={`label pointer-events-none absolute left-3 space-y-1.5 rounded border-2 border-ink bg-sheet px-3 py-2.5 sm:top-3 sm:block ${isLegendOpen ? "top-14" : "top-3 hidden"}`}
      >
        <li className="flex items-center gap-2.5">
          <span aria-hidden="true" className="w-6 border-t-[3px] border-dashed border-customs" />
          {t.map.legendPast}
        </li>
        {shownDestination && (
          <li className="flex items-center gap-2.5">
            <span aria-hidden="true" className="w-6 border-t-[3px] border-dotted border-ink-soft" />
            {t.map.legendRemaining}
          </li>
        )}
        <li className="flex items-center gap-2.5">
          <span aria-hidden="true" className="ml-1 size-3.5 rounded-full border-[3px] border-ink bg-signal" />
          {t.map.legendLatest}
        </li>
      </ul>
    </div>
  );
}
