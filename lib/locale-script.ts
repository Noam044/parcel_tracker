// Sans dépendance à React : importé par le layout (Server Component) et par les fichiers serveur
// (route API, client 17TRACK) qui doivent localiser un message sans passer par un hook React.

export type Locale = 'fr' | 'en';

export const LOCALE_STORAGE_KEY = 'parcel-tracker:locale';
export const DEFAULT_LOCALE: Locale = 'fr';

export function isLocale(value: unknown): value is Locale {
  return value === 'fr' || value === 'en';
}

/**
 * Exécuté dans le <body>, avant le premier rendu : sans lui, la page s'afficherait d'abord dans la
 * langue par défaut puis basculerait dans la langue choisie. Le choix enregistré prime, sinon on
 * suit la langue du navigateur (uniquement fr/en, tout le reste retombe sur le français).
 */
export const LOCALE_SCRIPT = `(function(){try{var l=localStorage.getItem('${LOCALE_STORAGE_KEY}');if(l!=='fr'&&l!=='en'){l=(navigator.language||'').toLowerCase().startsWith('en')?'en':'${DEFAULT_LOCALE}'}document.documentElement.lang=l;document.documentElement.dataset.lang=l}catch(e){document.documentElement.lang='${DEFAULT_LOCALE}';document.documentElement.dataset.lang='${DEFAULT_LOCALE}'}})()`;
