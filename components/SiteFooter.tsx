export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-dashed border-ink">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-8 text-sm text-ink-soft md:flex-row md:justify-between md:px-10">
        <p>
          Suivi fourni par <span className="font-semibold text-ink">17TRACK</span>, cartes par{" "}
          <span className="font-semibold text-ink">Mapbox</span> © OpenStreetMap.
        </p>
        <p>Les positions sont indicatives : elles sont déduites des noms de lieux.</p>
      </div>
    </footer>
  );
}
