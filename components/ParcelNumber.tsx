"use client";

import { countryLabel } from "@/lib/countries";
import { parseS10 } from "@/lib/journey";
import { useT } from "@/lib/locale";

// La série pèse environ 6,3 fois la taille de police en largeur ; les libellés « Service » et « Origine »
// (~118 px à eux deux) et les écarts (32 px) ne rétrécissent pas. La taille se déduit donc de la largeur
// du bloc (unités cqw) pour que le numéro tienne toujours sur une ligne, dans n'importe quelle colonne.
const NUMBER_CLASS =
  "font-mono font-medium leading-none tracking-tight text-[min(2.75rem,calc((100cqw_-_9.4rem)/6.3))]";

/**
 * Affiche un numéro de suivi comme sur une étiquette. Un numéro postal international (norme S10)
 * est décomposé : service, série, pays d'origine. Les autres formats restent d'un seul bloc.
 */
export default function ParcelNumber({ number }: { number: string }) {
  const s10 = parseS10(number);
  const { locale, t } = useT();

  if (!s10) {
    return <p className="break-all font-mono text-[clamp(1.5rem,4vw,2.5rem)] font-medium leading-none">{number}</p>;
  }

  const origin = countryLabel(s10.origin, locale);
  const segments = [
    { text: s10.service, caption: t.parcelNumber.service },
    { text: s10.serial, caption: t.parcelNumber.serial },
    { text: s10.origin, caption: t.parcelNumber.origin },
  ];

  return (
    <div className="@container">
      <span className="sr-only">{number}</span>
      {/* w-fit : la ligne du pays s'aligne sur la fin du numéro, pas sur le bord de la carte */}
      <div aria-hidden="true" className="w-fit max-w-full">
        <div className="flex gap-4">
          {segments.map((segment) => (
            <div key={segment.caption} className="flex flex-col">
              <span className={NUMBER_CLASS}>{segment.text}</span>
              <span className="bracket mt-3 pt-1.5">
                <span className="label block text-ink-soft">{segment.caption}</span>
              </span>
            </div>
          ))}
        </div>
        {/*
          Le nom du pays a sa propre ligne : la colonne « Origine » ne fait que quelques dizaines de pixels et un
          nom long (« République démocratique du Congo ») y débordait de la carte. Ici il peut passer à la ligne.
        */}
        {origin && <p className="label mt-1 text-right font-bold text-ink">{origin}</p>}
      </div>
    </div>
  );
}
