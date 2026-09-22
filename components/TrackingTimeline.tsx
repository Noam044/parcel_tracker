"use client";

import { useEffect } from "react";
import { eventDescriptionText, eventLocationText } from "@/lib/display";
import { formatTime } from "@/lib/format";
import { groupEventsByDay } from "@/lib/journey";
import { useT } from "@/lib/locale";
import type { TrackingEvent } from "@/lib/types";

interface TrackingTimelineProps {
  events: TrackingEvent[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
}

export default function TrackingTimeline({ events, activeIndex, onSelect }: TrackingTimelineProps) {
  const { locale, t } = useT();
  const days = groupEventsByDay(events, locale);
  // Le marqueur orange de la carte est la dernière position connue : même repère ici
  const latestLocatedIndex = events.findIndex((event) => event.coordinates);

  // Sélectionner un marqueur sur la carte amène l'étape correspondante à l'écran
  useEffect(() => {
    if (activeIndex === null) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(`event-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [activeIndex]);

  return (
    <section aria-labelledby="timeline-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="timeline-title" className="font-wide text-xl font-extrabold">
          {t.timeline.title}
        </h2>
        <p className="label flex items-center gap-4 text-ink-soft">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 bg-customs" /> {t.timeline.legendOnMap}
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 border-2 border-ink-soft" /> {t.timeline.legendUnknown}
          </span>
        </p>
      </div>

      <div className="mt-5 space-y-8">
        {days.map((day) => (
          <div key={day.key}>
            <h3 className="label mb-3 flex items-center gap-3 font-bold">
              <span className="whitespace-nowrap">{day.label}</span>
              <span aria-hidden="true" className="h-0 flex-1 border-t-2 border-dashed border-rule" />
            </h3>

            <ol>
              {day.items.map(({ event, index }) => {
                const isLatest = index === latestLocatedIndex;
                const isActive = index === activeIndex;
                const hasPosition = !!event.coordinates;

                const content = (
                  <>
                    <p className="text-[15px] font-semibold leading-snug">{eventLocationText(event, locale, t)}</p>
                    <p className="mt-0.5 break-words text-[15px] leading-snug text-ink-soft">
                      {eventDescriptionText(event, t)}
                    </p>
                  </>
                );

                return (
                  <li
                    key={`${event.date}-${index}`}
                    id={`event-${index}`}
                    className="grid grid-cols-[3.25rem_1fr] gap-x-4"
                  >
                    <time dateTime={event.date} className="pt-[3px] font-mono text-xs font-medium text-ink-soft">
                      {formatTime(event.date, locale)}
                    </time>

                    <div className="relative border-l-2 border-ink pb-1 pl-5">
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[7px] top-[5px] size-3 border-2 ${
                          isLatest
                            ? "border-ink bg-signal"
                            : hasPosition
                              ? "border-customs bg-customs"
                              : "border-ink-soft bg-paper"
                        }`}
                      />

                      {hasPosition ? (
                        <button
                          type="button"
                          onClick={() => onSelect(index)}
                          aria-pressed={isActive}
                          className={`-ml-2 mb-1 block w-full rounded px-2 py-1.5 text-left transition-colors ${
                            isActive ? "bg-sheet outline-2 outline-ink" : "hover:bg-sheet"
                          }`}
                        >
                          {content}
                        </button>
                      ) : (
                        <div className="-ml-2 mb-1 px-2 py-1.5">{content}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
