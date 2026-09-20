export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-dashed border-ink">
      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
        <div className="flex flex-col gap-2 text-sm text-ink-soft md:flex-row md:justify-between">
          <p>
            Suivi fourni par <span className="font-semibold text-ink">17TRACK</span>, cartes par{" "}
            <span className="font-semibold text-ink">Mapbox</span> © OpenStreetMap.
          </p>
          <p>Les positions sont indicatives : elles sont déduites des noms de lieux.</p>
        </div>

        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-dashed border-rule pt-6">
          <span className="label text-ink-soft">Site créé par</span>
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
            <span className="sr-only">(portfolio, s&apos;ouvre dans un nouvel onglet)</span>
          </a>
        </p>
      </div>
    </footer>
  );
}
