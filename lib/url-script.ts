// Sans dépendance à React : importé par le layout (Server Component) et par la page.

/** Paramètre d'URL qui porte le numéro du colis affiché (?n=…). */
export const NUMBER_PARAM = 'n';

/**
 * Exécuté dans le <body>, avant le premier rendu. La page est statique : sans ce script, un lien
 * ?n=… afficherait d'abord l'accueil, puis React basculerait vers le chargement, ce qui ferait sauter la
 * page (CLS) et clignoter l'accueil. L'attribut data-deeplink masque l'accueil et montre directement le
 * cadre de chargement (variante CSS « deeplink: », voir globals.css) ; la page le retire dès qu'elle a
 * pris le relais (voir app/page.tsx).
 */
export const DEEPLINK_SCRIPT = `(function(){try{if(new URLSearchParams(location.search).get('${NUMBER_PARAM}'))document.documentElement.dataset.deeplink=''}catch(e){}})()`;

export function clearDeeplink() {
  delete document.documentElement.dataset.deeplink;
}
