"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CARRIER_LOGOS } from "@/lib/carrier-logos";
import { useT } from "@/lib/locale";

/**
 * Une série de logos ; la copie, identique, ne sert qu'à boucler le défilement sans à-coup.
 * `load` : tant que le bandeau est loin de l'écran, les étiquettes restent vides (à leur taille finale).
 */
function LogoList({ copy = false, load }: { copy?: boolean; load: boolean }) {
  return (
    <ul
      aria-hidden={copy || undefined}
      className={`flex shrink-0 ${
        copy ? "motion-reduce:hidden" : "motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-4"
      }`}
    >
      {CARRIER_LOGOS.map((logo) => (
        // L'espacement est une marge interne et non un gap : -50 % retombe ainsi exactement sur la copie
        <li key={logo.name} className="shrink-0 pr-4 md:pr-5">
          {/* Chaque logo sur sa petite étiquette claire : lisible en thème sombre, quelles que soient ses couleurs */}
          <div className="group/logo flex h-[72px] items-center rounded border-2 border-ink bg-sticker px-6">
            {load ? (
              <Image
                src={logo.src}
                alt={copy ? "" : logo.name}
                width={logo.width}
                height={logo.height}
                // Pas de chargement différé natif : il suit mal un élément déplacé par une animation CSS, et
                // des logos restaient vides. Le bandeau entier attend plutôt d'approcher de l'écran.
                loading="eager"
                className="grayscale transition-[filter] duration-300 group-hover/logo:grayscale-0"
              />
            ) : (
              <span style={{ width: logo.width, height: logo.height }} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Bandeau des transporteurs pris en charge : les logos défilent en continu (la liste est doublée et
 * glisse de la moitié de sa largeur, puis recommence). Le défilement s'arrête au survol. Avec le
 * mouvement réduit, les logos s'affichent en grille fixe.
 */
export default function CarrierMarquee() {
  const [load, setLoad] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const { t } = useT();

  // Le bandeau est tout en bas de la page : ses logos ne sont téléchargés qu'à son approche, pour ne rien
  // ajouter au premier affichage
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="carriers-title" className="py-14 lg:py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <h2 id="carriers-title" className="font-wide text-[clamp(1.25rem,2.4vw,1.5rem)] font-extrabold">
          {t.carriers.title}
        </h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">{t.carriers.subtitle}</p>
      </div>

      <div
        className="group mt-8 overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] motion-reduce:[mask-image:none]"
      >
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none motion-reduce:px-5">
          <LogoList load={load} />
          <LogoList copy load={load} />
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-[1280px] px-5 text-sm text-ink-soft md:px-10">{t.carriers.trademarks}</p>
    </section>
  );
}
