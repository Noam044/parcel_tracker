"use client";

import { formatEventDate } from "@/lib/format";
import { useHistory } from "@/lib/history";
import { useT } from "@/lib/locale";
import { STATUS_CLASSES } from "@/lib/status";
import { countryLabel } from "@/lib/countries";

/** Derniers colis suivis sur cet appareil : un clic relance la recherche. */
export default function RecentParcels({ onSelect }: { onSelect: (trackingNumber: string) => void }) {
  const { entries, remove, clear } = useHistory();
  const { locale, t } = useT();

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="recent-title" className="mx-auto max-w-[1280px] px-5 pb-14 md:px-10">
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-dashed border-ink pt-8">
        <h2 id="recent-title" className="font-wide text-xl font-extrabold">
          {t.recent.title}
        </h2>
        <button type="button" onClick={clear} className="label -my-2.5 py-2.5 underline underline-offset-4 hover:text-customs">
          {t.recent.clear}
        </button>
      </div>

      <ul className="mt-5 divide-y-2 divide-dashed divide-rule border-y-2 border-ink">
        {entries.map((entry) => {
          const location =
            entry.lastLocation ||
            (entry.lastLocationCountryCode ? countryLabel(entry.lastLocationCountryCode, locale) : undefined) ||
            "";
          return (
            <li
              key={entry.number}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 md:grid-cols-[1.4fr_1.6fr_auto]"
            >
              <button
                type="button"
                onClick={() => onSelect(entry.number)}
                className="-my-2.5 flex items-center gap-3 py-2.5 text-left font-mono text-[15px] font-medium hover:text-customs"
              >
                <span aria-hidden="true" className={`size-3 shrink-0 ${STATUS_CLASSES[entry.status].marker}`} />
                <span className="break-all">{entry.number}</span>
              </button>

              <div className="flex items-center gap-2 md:order-last">
                <button
                  type="button"
                  onClick={() => onSelect(entry.number)}
                  className="label rounded border-2 border-ink px-3 py-2.5 hover:bg-ink hover:text-sheet"
                >
                  {t.recent.refresh}
                </button>
                <button
                  type="button"
                  onClick={() => remove(entry.number)}
                  aria-label={t.recent.removeAria(entry.number)}
                  className="flex size-11 items-center justify-center rounded text-xl leading-none text-ink-soft hover:bg-ink hover:text-sheet"
                >
                  ×
                </button>
              </div>

              <p className="col-span-2 pl-6 text-sm text-ink-soft md:col-span-1 md:pl-0">
                <span className="font-semibold text-ink">{t.status[entry.status].label}</span>
                {location && ` · ${location}`}
                {entry.lastDate && ` · ${formatEventDate(entry.lastDate, locale)}`}
                {entry.carrier && <span className="hidden lg:inline"> · {entry.carrier}</span>}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
