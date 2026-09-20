"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { JourneyStats } from "@/lib/journey";
import type { TrackingData } from "@/lib/types";
import ParcelHeader from "./ParcelHeader";
import TrackingTimeline from "./TrackingTimeline";

// mapbox-gl est lourd et n'a de sens que dans le navigateur : chargé à part, sans rendu serveur
const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-rule" />,
});

export default function ParcelResults({ data, stats }: { data: TrackingData; stats: JourneyStats }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const mapPanelRef = useRef<HTMLDivElement | null>(null);

  const handleSelect = (index: number | null) => {
    setActiveIndex(index);
    // Sur mobile la carte est au-dessus de la liste : on la ramène à l'écran pour montrer où mène l'étape
    if (index !== null && window.matchMedia("(max-width: 1023px)").matches) {
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
          className="order-first h-[340px] overflow-hidden rounded border-2 border-ink bg-rule sm:h-[440px] lg:sticky lg:top-6 lg:order-last lg:h-[calc(100dvh-3rem)] lg:max-h-[780px]"
        >
          <TrackingMap
            events={data.events}
            destination={data.destination}
            status={data.status}
            activeIndex={activeIndex}
            onSelectEvent={handleSelect}
          />
        </div>
      </div>
    </div>
  );
}
