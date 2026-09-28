"use client";

import { useRef, useState } from "react";
import type { JourneyStats } from "@/lib/journey";
import type { TrackingData } from "@/lib/types";
import MapPanel from "./MapPanel";
import ParcelHeader from "./ParcelHeader";
import TrackingTimeline from "./TrackingTimeline";

export default function ParcelResults({ data, stats }: { data: TrackingData; stats: JourneyStats }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // La carte interactive n'est chargée qu'à la première interaction (voir MapPanel)
  const [isMapInteractive, setIsMapInteractive] = useState(false);
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const hasPosition = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && data.events.some((event) => event.coordinates);

  const handleSelect = (index: number | null) => {
    setActiveIndex(index);
    if (index === null) return;
    // Montrer une étape sur la carte demande la carte interactive (popup, recentrage)
    setIsMapInteractive(true);
    // Sur mobile la carte est au-dessus de la liste : on la ramène à l'écran pour montrer où mène l'étape
    if (window.matchMedia("(max-width: 1023px)").matches) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      mapPanelRef.current?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-10 px-5 pb-12 pt-8 md:px-10 md:pb-16 md:pt-10">
      <ParcelHeader data={data} stats={stats} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <TrackingTimeline events={data.events} activeIndex={activeIndex} onSelect={handleSelect} />

        <div
          ref={mapPanelRef}
          className={`order-first overflow-hidden rounded border-2 border-ink lg:sticky lg:top-6 lg:order-last ${
            hasPosition
              ? "h-[340px] bg-rule sm:h-[440px] lg:h-[calc(100dvh-3rem)] lg:max-h-[780px]"
              : // Rien à tracer : un simple encadré, plutôt qu'une grande carte vide
                "bg-sheet"
          }`}
        >
          <MapPanel
            events={data.events}
            destination={data.destination}
            status={data.status}
            activeIndex={activeIndex}
            onSelectEvent={handleSelect}
            isInteractive={isMapInteractive}
            onActivate={() => setIsMapInteractive(true)}
          />
        </div>
      </div>
    </div>
  );
}
