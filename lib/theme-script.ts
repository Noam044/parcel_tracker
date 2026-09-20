// Sans dépendance à React : ce fichier est importé par le layout, qui est un Server Component.

export const THEME_STORAGE_KEY = 'parcel-tracker:theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Exécuté dans le <head>, avant le premier rendu : sans lui, la page s'afficherait d'abord en clair
 * puis basculerait en sombre. Le choix enregistré prime, sinon on suit le réglage du système.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('${DARK_QUERY}').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`;
