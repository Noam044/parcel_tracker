import { countryName } from "@/lib/countries";
import { parseS10 } from "@/lib/journey";

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

  if (!s10) {
    return <p className="break-all font-mono text-[clamp(1.5rem,4vw,2.5rem)] font-medium leading-none">{number}</p>;
  }

  const origin = countryName(s10.origin);
  const segments = [
    { text: s10.service, caption: "Service", detail: null },
    { text: s10.serial, caption: "Série", detail: null },
    { text: s10.origin, caption: "Origine", detail: origin ?? null },
  ];

  return (
    <div className="@container">
      <span className="sr-only">{number}</span>
      <div aria-hidden="true" className="flex gap-4">
        {segments.map((segment) => (
          <div key={segment.caption} className="flex flex-col">
            <span className={NUMBER_CLASS}>{segment.text}</span>
            <span className="bracket mt-3 pt-1.5">
              <span className="label block text-ink-soft">{segment.caption}</span>
              {segment.detail && <span className="label block font-bold text-ink">{segment.detail}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
