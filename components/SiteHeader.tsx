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
  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-10">
        <a href="#" className="flex items-center gap-2.5 sm:gap-3">
          <RouteMark />
          <span className="font-wide text-[15px] font-extrabold tracking-tight sm:text-[17px]">Parcel Tracker</span>
        </a>
        <nav aria-label="Aide" className="flex gap-4 text-[13px] font-medium sm:gap-5 sm:text-sm md:gap-8">
          <a href="#statuts" className="underline-offset-4 hover:underline">
            Statuts
          </a>
          <a href="#bon-a-savoir" className="underline-offset-4 hover:underline">
            Bon à savoir
          </a>
        </nav>
      </div>
    </header>
  );
}
