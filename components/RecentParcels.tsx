"use client";

import { formatEventDate } from "@/lib/format";
import { useHistory } from "@/lib/history";
import { STATUS_META } from "@/lib/status";

/** Derniers colis suivis sur cet appareil : un clic relance la recherche. */
export default function RecentParcels({ onSelect }: { onSelect: (trackingNumber: string) => void }) {
  const { entries, remove, clear } = useHistory();

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="recent-title" className="mx-auto max-w-[1280px] px-5 pb-14 md:px-10">
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-dashed border-ink pt-8">
        <h2 id="recent-title" className="font-wide text-xl font-extrabold">
          Derniers colis suivis
        </h2>
        <button type="button" onClick={clear} className="label underline underline-offset-4 hover:text-customs">
          Effacer l&apos;historique
        </button>
      </div>

      <ul className="mt-5 divide-y-2 divide-dashed divide-rule border-y-2 border-ink">
        {entries.map((entry) => {
          const meta = STATUS_META[entry.status];
          return (
            <li
              key={entry.number}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 md:grid-cols-[1.4fr_1.6fr_auto]"
            >
              <button
                type="button"
                onClick={() => onSelect(entry.number)}
                className="flex items-center gap-3 text-left font-mono text-[15px] font-medium hover:text-customs"
              >
                <span aria-hidden="true" className={`size-3 shrink-0 ${meta.marker}`} />
                <span className="break-all">{entry.number}</span>
              </button>

              <div className="flex items-center gap-2 md:order-last">
                <button
                  type="button"
                  onClick={() => onSelect(entry.number)}
                  className="label rounded border-2 border-ink px-3 py-1.5 hover:bg-ink hover:text-sheet"
                >
                  Actualiser
                </button>
                <button
                  type="button"
                  onClick={() => remove(entry.number)}
                  aria-label={`Retirer ${entry.number} de l'historique`}
                  className="flex size-8 items-center justify-center rounded text-lg leading-none text-ink-soft hover:bg-ink hover:text-sheet"
                >
                  ×
                </button>
              </div>

              <p className="col-span-2 pl-6 text-sm text-ink-soft md:col-span-1 md:pl-0">
                <span className="font-semibold text-ink">{meta.label}</span>
                {entry.lastLocation && ` · ${entry.lastLocation}`}
                {entry.lastDate && ` · ${formatEventDate(entry.lastDate)}`}
                {entry.carrier && <span className="hidden lg:inline"> · {entry.carrier}</span>}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
