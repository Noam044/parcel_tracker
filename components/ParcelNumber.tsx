import { COUNTRIES, countryName } from "@/lib/countries";
import { parseS10 } from "@/lib/journey";

// La série pèse environ 6,3 fois la taille de police en largeur ; les libellés « Service » et « Origine »
// (~118 px à eux deux) et les écarts (32 px) ne rétrécissent pas. La taille se déduit donc de la largeur
// du bloc (unités cqw) pour que le numéro tienne toujours sur une ligne, dans n'importe quelle colonne.
const NUMBER_CLASS =
  "font-mono font-medium leading-none tracking-tight text-[min(2.75rem,calc((100cqw_-_9.4rem)/6.3))]";

const SEGMENT_CAPTIONS = ["Service", "Série", "Origine"];

/**
 * Nom français du pays d'origine.
 *
 * On lit d'abord notre table : ses libellés sont identiques partout. Intl.DisplayNames dépend des données de
 * langue de chaque moteur (Node dit « Chine », Safari sur iPhone dit « Chine continentale »), ce qui donnait
 * un texte plus long que prévu sur mobile, et un texte différent entre le rendu serveur et le navigateur.
 * Il ne sert plus que de repli pour les pays absents de la table.
 */
function originName(code: string): string | undefined {
  return COUNTRIES[code]?.label ?? countryName(code);
}

/**
 * Affiche un numéro de suivi comme sur une étiquette. Un numéro postal international (norme S10)
 * est décomposé : service, série, pays d'origine. Les autres formats restent d'un seul bloc.
 */
export default function ParcelNumber({ number }: { number: string }) {
  const s10 = parseS10(number);

  if (!s10) {
    return <p className="break-all font-mono text-[clamp(1.5rem,4vw,2.5rem)] font-medium leading-none">{number}</p>;
  }

  const origin = originName(s10.origin);
  const segments = [s10.service, s10.serial, s10.origin];

  return (
    <div className="@container">
      <span className="sr-only">{number}</span>
      {/* w-fit : la ligne du pays s'aligne sur la fin du numéro, pas sur le bord de la carte */}
      <div aria-hidden="true" className="w-fit max-w-full">
        <div className="flex gap-4">
          {segments.map((text, index) => (
            <div key={SEGMENT_CAPTIONS[index]} className="flex flex-col">
              <span className={NUMBER_CLASS}>{text}</span>
              <span className="bracket mt-3 pt-1.5">
                <span className="label block text-ink-soft">{SEGMENT_CAPTIONS[index]}</span>
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
