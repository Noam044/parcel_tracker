"use client";

import { useT } from "@/lib/locale";

/** État d'attente : un pointillé qui avance, comme le colis. */
export default function SearchProgress({ isWaiting }: { isWaiting: boolean }) {
  const { t } = useT();

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">
      <div role="status" aria-live="polite" className="label-card animate-fade-up p-6 md:p-10">
        <div className="relative h-[14px]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 animate-march bg-[length:16px_3px] bg-repeat-x"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--color-ink) 0 8px, transparent 8px 16px)",
            }}
          />
          <span
            aria-hidden="true"
            className="absolute top-0 size-[14px] animate-travel border-2 border-ink bg-signal"
          />
        </div>

        <p className="label mt-8 text-ink-soft">{isWaiting ? t.progress.newNumberEyebrow : t.progress.searchEyebrow}</p>
        <p className="font-wide mt-1 text-[clamp(1.5rem,3.6vw,2.25rem)] font-extrabold leading-tight">
          {isWaiting ? t.progress.newNumberTitle : t.progress.searchTitle}
        </p>
        {isWaiting && <p className="mt-3 max-w-[60ch] text-[15px] text-ink-soft">{t.progress.newNumberHint}</p>}
      </div>
    </section>
  );
}
