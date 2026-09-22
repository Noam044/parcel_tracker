"use client";

import { useT } from "@/lib/locale";

export default function SiteFooter() {
  const { t } = useT();

  return (
    <footer className="border-t-2 border-dashed border-ink">
      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
        <div className="flex flex-col gap-2 text-sm text-ink-soft md:flex-row md:justify-between">
          <p>
            {t.footer.trackingBy} <span className="font-semibold text-ink">17TRACK</span>
            {t.footer.mapsBy} <span className="font-semibold text-ink">Mapbox</span> {t.footer.afterMaps}
          </p>
          <p>{t.footer.positionsNote}</p>
        </div>

        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-dashed border-rule pt-6">
          <span className="label text-ink-soft">{t.footer.createdBy}</span>
          <a
            href="https://noambouriche.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-baseline gap-2.5 underline-offset-4 hover:underline"
          >
            <span className="font-wide text-lg font-extrabold group-hover:text-customs">Noam Bouriche</span>
            <span className="label normal-case text-ink-soft group-hover:text-customs">
              noambouriche.fr <span aria-hidden="true">↗</span>
            </span>
            <span className="sr-only">{t.footer.portfolioNewTab}</span>
          </a>
        </p>
      </div>
    </footer>
  );
}
