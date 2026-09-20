import { formatEventDate } from "@/lib/format";
import type { TrackingEvent } from "@/lib/types";

export default function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  return (
    <ol className="relative ml-3 space-y-6 border-l-2 border-slate-200 pl-8">
      {events.map((event, index) => (
        <li key={`${event.date}-${index}`} className="relative">
          {/* Point centré sur le trait : le trait est à 2rem + 1px à gauche de l'élément */}
          <div
            className={`absolute -left-[calc(2rem+1px)] top-4 z-10 size-4 -translate-x-1/2 rounded-full border-[3px] border-white ring-1 ring-slate-200 ${
              index === 0 ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "bg-slate-300"
            }`}
          />

          {/* Event card */}
          <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
            <h3 className="font-bold text-slate-900 text-sm mb-1">{event.location}</h3>
            <p className="text-slate-600 text-sm mb-2 break-words">{event.description}</p>
            <time dateTime={event.date} className="text-xs font-medium text-slate-400">
              {formatEventDate(event.date)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
