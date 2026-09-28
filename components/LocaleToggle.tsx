"use client";

import { useT } from "@/lib/locale";

/**
 * Curseur FR / EN, jumeau de ThemeToggle. Comme pour le soleil et la lune, les deux libellés sont
 * toujours présents dans le DOM et basculés par la variante CSS « lang-en: » (voir globals.css), pas
 * par l'état React : le curseur est donc déjà à la bonne place au premier affichage, sans saut à
 * l'hydratation.
 *
 * Pour un lecteur d'écran, ce n'est pas un interrupteur (« Langue, activé » ne dit pas laquelle) mais un
 * bouton qui annonce la langue d'arrivée, rédigé et prononcé dans cette langue : « Switch to English ».
 * Ce nom est un texte masqué plutôt qu'un aria-label : un aria-label doit reprendre le texte visible
 * (« FR EN »), sans quoi la commande vocale et les audits d'accessibilité le signalent.
 */
export default function LocaleToggle() {
  const { locale, setLocale, t } = useT();
  const isEnglish = locale === "en";

  return (
    <button
      type="button"
      title={t.header.switchLanguage}
      lang={isEnglish ? "fr" : "en"}
      onClick={() => setLocale(isEnglish ? "fr" : "en")}
      // py-2.5 agrandit la zone tactile (28 px de curseur → 48 px) sans changer l'apparence
      className="flex items-center gap-2.5 py-2.5"
    >
      <span className="sr-only">{t.header.switchLanguage}</span>
      <span className="relative flex h-7 w-14 shrink-0 items-center rounded border-2 border-ink bg-sheet font-mono text-[10px] font-bold">
        <span aria-hidden="true" className="flex-1 text-center text-ink-soft">
          FR
        </span>
        <span aria-hidden="true" className="flex-1 text-center text-ink-soft">
          EN
        </span>
        {/*
          left/top-1px, pas 3px : le pavé (22px) doit tenir dans l'espace intérieur de la piste une fois
          la bordure de 2px déduite (28px de piste - 4px de bordure = 24px, et 1+22+1 = 24 exactement).
          Avec un décalage de 3px il dépassait de 4px et rendait le texte du pavé décalé vers le bas.
        */}
        <span
          aria-hidden="true"
          className="absolute left-[1px] top-[1px] grid h-[22px] w-[22px] place-items-center rounded-[2px] bg-ink text-paper transition-transform duration-200 lang-en:translate-x-[28px]"
        >
          <span className="lang-en:hidden">FR</span>
          <span className="hidden lang-en:block">EN</span>
        </span>
      </span>
    </button>
  );
}
