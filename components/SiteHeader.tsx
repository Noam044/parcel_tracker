"use client";

import { useT } from "@/lib/locale";
import LocaleToggle from "./LocaleToggle";
import ThemeToggle from "./ThemeToggle";

// Deux points reliés par un pointillé : l'origine et la destination d'un colis
function RouteMark() {
  return (
    <svg width="30" height="14" viewBox="0 0 30 14" fill="none" aria-hidden="true">
      <circle cx="5" cy="7" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M11 7h9" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="25" cy="7" r="4" fill="var(--color-signal)" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function SiteHeader() {
  const { t } = useT();

  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-10">
        <a href="#" className="flex items-center gap-2.5 sm:gap-3">
          <RouteMark />
          <span className="font-wide text-[15px] font-extrabold tracking-tight sm:text-[17px]">Parcel Tracker</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-5 md:gap-7">
          {/*
            Les deux liens sont masqués sur petit écran pour laisser la place aux deux curseurs
            (langue + thème) : leurs sections suivent juste après dans la page, la navigation reste
            possible en faisant défiler.
          */}
          <nav aria-label={t.header.navAria} className="hidden gap-4 text-[13px] font-medium sm:flex sm:gap-5 sm:text-sm md:gap-8">
            <a href="#statuts" className="underline-offset-4 hover:underline">
              {t.header.statuses}
            </a>
            <a href="#bon-a-savoir" className="underline-offset-4 hover:underline">
              {t.header.goodToKnow}
            </a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
