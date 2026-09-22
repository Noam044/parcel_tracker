import { useSyncExternalStore } from 'react';
import { DICTIONARY } from './dictionary';
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, type Locale } from './locale-script';

function getSnapshot(): Locale {
  const current = document.documentElement.dataset.lang;
  return isLocale(current) ? current : DEFAULT_LOCALE;
}

function subscribe(onChange: () => void) {
  // L'attribut est la source de vérité : le script, le bouton et la langue du navigateur passent tous par lui
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  return () => observer.disconnect();
}

export function setLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dataset.lang = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour cette visite seulement
  }
}

export function useLocale() {
  // Côté serveur la langue est inconnue : le défaut sert de valeur initiale, corrigée dès l'hydratation
  const locale = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_LOCALE);
  return { locale, setLocale };
}

/** Langue courante + dictionnaire de textes déjà résolu, pour éviter `DICTIONARY[locale]` partout. */
export function useT() {
  const { locale, setLocale } = useLocale();
  return { locale, setLocale, t: DICTIONARY[locale] };
}
