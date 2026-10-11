// Sans dépendance à React : importé par le layout (Server Component) et par la page.

import { isCarrierId, type ParcelQuery } from './tracking-number';

/** Paramètre d'URL qui porte le numéro du colis affiché (?n=…). */
export const NUMBER_PARAM = 'n';
/** Transporteur et code postal tirés d'un lien de suivi (?n=…&c=mondial-relay&cp=13010). */
const CARRIER_PARAM = 'c';
const POSTAL_CODE_PARAM = 'cp';

/** Colis désigné par l'URL de la page, tel quel (non normalisé) ; null sur l'accueil. */
export function readParcelQuery(params: URLSearchParams): ParcelQuery | null {
  const number = params.get(NUMBER_PARAM);
  if (!number) return null;
  const carrier = params.get(CARRIER_PARAM);
  const postalCode = params.get(POSTAL_CODE_PARAM);
  return {
    number,
    // Un transporteur inconnu (lien abîmé) est ignoré : 17TRACK le détectera
    ...(isCarrierId(carrier) && { carrier }),
    ...(postalCode && { postalCode }),
  };
}

/** Query string de la page pour un colis : « ?n=…&c=…&cp=… ». */
export function pageSearch({ number, carrier, postalCode }: ParcelQuery): string {
  const params = new URLSearchParams({ [NUMBER_PARAM]: number });
  if (carrier) params.set(CARRIER_PARAM, carrier);
  if (postalCode) params.set(POSTAL_CODE_PARAM, postalCode);
  return `?${params}`;
}

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
