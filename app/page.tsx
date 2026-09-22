"use client";

import { useState } from "react";
import Banner from "@/components/Banner";
import Guide from "@/components/Guide";
import ParcelResults from "@/components/ParcelResults";
import RecentParcels from "@/components/RecentParcels";
import SearchProgress from "@/components/SearchProgress";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Specimen from "@/components/Specimen";
import TrackingForm from "@/components/TrackingForm";
import { useT } from "@/lib/locale";
import { useParcelSearch } from "@/lib/use-parcel-search";

export default function Home() {
  const { data, stats, isLoading, isWaiting, error, notice, search } = useParcelSearch();
  const [query, setQuery] = useState("");
  const { t } = useT();

  // Une fois un colis affiché (ou en cours de recherche), le formulaire cède la place aux résultats
  const isCompact = isLoading || !!data;

  const handleSearch = (trackingNumber: string) => {
    setQuery(trackingNumber);
    search(trackingNumber);
  };

  return (
    <>
      <SiteHeader />

      <main>
        <section className={`mx-auto max-w-[1280px] px-5 md:px-10 ${isCompact ? "pb-0 pt-8 md:pt-10" : "pb-12 pt-10 md:pb-16 md:pt-16"}`}>
          {isCompact ? (
            <>
              <h1 className="sr-only">Parcel Tracker</h1>
              <TrackingForm value={query} onChange={setQuery} onSubmit={handleSearch} isLoading={isLoading} compact />
            </>
          ) : (
            <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
              <div className="animate-fade-up">
                <p className="label mb-5 text-ink-soft">{t.hero.eyebrow}</p>
                <h1 className="font-wide text-[clamp(2.5rem,6vw,4.75rem)] font-extrabold leading-[0.96] tracking-[-0.02em]">
                  {t.hero.title}
                </h1>
                <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">{t.hero.subtitle}</p>
                <div className="mt-10">
                  <TrackingForm value={query} onChange={setQuery} onSubmit={handleSearch} isLoading={isLoading} />
                </div>
              </div>
              <Specimen />
            </div>
          )}

          {error && <Banner tone="error">{error}</Banner>}
          {notice && <Banner tone="notice">{notice}</Banner>}
        </section>

        {!isCompact && <RecentParcels onSelect={handleSearch} />}
        {isLoading && <SearchProgress isWaiting={isWaiting} />}
        {data && stats && <ParcelResults key={data.trackingNumber} data={data} stats={stats} />}

        <div className="border-t-2 border-dashed border-ink">
          <Guide />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
