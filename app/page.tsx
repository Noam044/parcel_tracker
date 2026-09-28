"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useEffectEvent, useRef, useState } from "react";
import Banner from "@/components/Banner";
import Guide from "@/components/Guide";
import ParcelResults from "@/components/ParcelResults";
import RecentParcels from "@/components/RecentParcels";
import SearchProgress from "@/components/SearchProgress";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Specimen from "@/components/Specimen";
import TrackingForm from "@/components/TrackingForm";
import { useHistory } from "@/lib/history";
import { useT } from "@/lib/locale";
import { normalizeTrackingNumber } from "@/lib/tracking-number";
import { useParcelSearch } from "@/lib/use-parcel-search";

// Le colis affiché vit dans l'URL (?n=…) : un suivi se recharge, se partage, se met en favori, et les
// boutons Précédent/Suivant du navigateur passent d'un colis à l'autre ou reviennent à l'accueil.
const NUMBER_PARAM = "n";

/** Signale chaque changement du numéro dans l'URL, y compris au premier chargement. */
function UrlNumber({ onChange }: { onChange: (number: string | null) => void }) {
  const number = useSearchParams().get(NUMBER_PARAM);
  const notify = useEffectEvent(onChange);
  useEffect(() => notify(number), [number]);
  return null;
}

export default function Home() {
  const { data, stats, isLoading, isWaiting, banner, search, reset } = useParcelSearch();
  const [query, setQuery] = useState("");
  const { t } = useT();
  const hasHistory = useHistory().entries.length > 0;
  // Après un retour à l'accueil, le focus clavier revient au champ plutôt que de se perdre
  const focusFormRef = useRef(false);

  // Une fois un colis affiché (ou en cours de recherche), le formulaire cède la place aux résultats
  const isCompact = isLoading || !!data;

  const showNumber = (number: string | null) => {
    if (!number) {
      setQuery("");
      reset();
      return;
    }
    const normalized = normalizeTrackingNumber(number);
    // Lien collé en minuscules ou avec des espaces : l'adresse reprend la forme canonique, et ce changement
    // d'URL rappelle showNumber avec le numéro corrigé (une seule recherche part)
    if (normalized !== number) {
      window.history.replaceState(null, "", `?${NUMBER_PARAM}=${encodeURIComponent(normalized)}`);
      return;
    }
    setQuery(normalized);
    // Le résultat s'affiche en haut de page : sans ça, un clic dans l'historique laissait la page défilée
    window.scrollTo({ top: 0 });
    search(normalized);
  };

  const handleSearch = (trackingNumber: string) => {
    const number = normalizeTrackingNumber(trackingNumber);
    if (new URLSearchParams(window.location.search).get(NUMBER_PARAM) === number) {
      // Même colis (bouton « Actualiser ») : l'URL ne change pas, on relance directement
      showNumber(number);
    } else {
      window.history.pushState(null, "", `?${NUMBER_PARAM}=${encodeURIComponent(number)}`);
    }
  };

  const goHome = () => {
    focusFormRef.current = true;
    window.scrollTo({ top: 0 });
    if (window.location.search) {
      window.history.pushState(null, "", window.location.pathname);
    } else {
      showNumber(null);
    }
  };

  useEffect(() => {
    if (isCompact || !focusFormRef.current) return;
    focusFormRef.current = false;
    document.getElementById("tracking-number")?.focus();
  }, [isCompact]);

  // Un message (erreur, introuvable…) après un clic dans l'historique : le bouton cliqué a disparu
  // pendant la recherche, le focus est retombé sur la page. On le rend au champ, juste au-dessus du message.
  const hasBanner = !!banner;
  useEffect(() => {
    if (hasBanner && document.activeElement === document.body) document.getElementById("tracking-number")?.focus();
  }, [hasBanner]);

  // Titre de l'onglet et description suivent le colis affiché et la langue choisie
  useEffect(() => {
    document.title = data ? t.meta.parcelTitle(data.trackingNumber, t.status[data.status].label) : "Parcel Tracker";
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.meta.description);
  }, [data, t]);

  return (
    <>
      <Suspense fallback={null}>
        <UrlNumber onChange={showNumber} />
      </Suspense>

      <SiteHeader onHome={goHome} />

      <main>
        <section className={`mx-auto max-w-[1280px] px-5 md:px-10 ${isCompact ? "pb-0 pt-6 md:pt-8" : "pb-12 pt-10 md:pb-16 md:pt-16"}`}>
          {isCompact ? (
            <>
              <h1 className="sr-only">Parcel Tracker</h1>
              <button
                type="button"
                onClick={goHome}
                className="label mb-3 inline-flex items-center gap-2 py-2 text-ink-soft underline-offset-4 hover:text-customs hover:underline"
              >
                <span aria-hidden="true">←</span>
                {t.form.backHome}
              </button>
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
                  {/* Juste sous le formulaire : sur téléphone, la colonne d'exemple passe dessous et masquerait le message */}
                  {banner && <Banner tone={banner.tone}>{banner.text}</Banner>}
                </div>
              </div>
              {/* Sur téléphone, un visiteur qui revient cherche d'abord ses colis : l'exemple passe après l'historique */}
              <Specimen className={hasHistory ? "hidden lg:block" : undefined} />
            </div>
          )}
        </section>

        {!isCompact && <RecentParcels onSelect={handleSearch} />}
        {!isCompact && hasHistory && (
          <div className="mx-auto max-w-[1280px] px-5 pb-14 md:px-10 lg:hidden">
            <Specimen />
          </div>
        )}
        {isLoading && <SearchProgress isWaiting={isWaiting} onCancel={goHome} />}
        {data && stats && <ParcelResults key={data.trackingNumber} data={data} stats={stats} />}

        <div className="border-t-2 border-dashed border-ink">
          <Guide />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
