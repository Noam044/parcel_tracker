// Partagé par le formulaire (validation immédiate, sans requête) et la route API (validation de confiance).

// 17TRACK accepte des numéros de 5 à 50 caractères. Un numéro de suivi contient toujours au moins un
// chiffre : exiger un chiffre écarte d'emblée les saisies absurdes, qui pourraient coûter un enregistrement.
const TRACKING_NUMBER_PATTERN = /^(?=.*\d)[A-Z0-9_-]{5,50}$/;

// Codes postaux européens, une fois normalisés (ex: 13010, 1000AA, SW1A1AA)
const POSTAL_CODE_PATTERN = /^[A-Z0-9]{3,10}$/;

/**
 * Transporteurs que 17TRACK ne sait pas suivre à partir du numéro seul : un numéro Vinted Go est pris pour
 * celui d'un autre transporteur, un numéro Mondial Relay ne peut être suivi sans code postal. Le premier
 * est désigné par son lien de suivi (voir parseTrackingInput) ; le second est reconnu à son format, et le
 * code postal est alors demandé au visiteur (voir lib/track17.ts:guessCarrier).
 */
export const CARRIER_IDS = ['mondial-relay', 'vinted-go'] as const;
export type CarrierId = (typeof CARRIER_IDS)[number];

/** Noms de marque, identiques dans toutes les langues. */
export const CARRIER_NAMES: Record<CarrierId, string> = {
  'mondial-relay': 'Mondial Relay',
  'vinted-go': 'Vinted Go',
};

/** Ce qu'il faut pour suivre un colis : le numéro, et parfois le transporteur et un code postal. */
export interface ParcelQuery {
  number: string;
  /** Transporteur désigné par un lien de suivi ; sinon, 17TRACK le détecte */
  carrier?: CarrierId;
  /** Exigé par certains transporteurs (Mondial Relay) */
  postalCode?: string;
}

/**
 * Les espaces sont souvent copiés avec le numéro (ex: "1Z 999 AA1 ..."). La casse est normalisée pour
 * qu'un même colis saisi en minuscules partage le cache et ne soit jamais enregistré deux fois.
 */
export function normalizeTrackingNumber(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** À appeler sur un numéro déjà normalisé. */
export function isValidTrackingNumber(number: string): boolean {
  return TRACKING_NUMBER_PATTERN.test(number);
}

export function normalizePostalCode(raw: string): string {
  return raw.replace(/[\s-]+/g, '').toUpperCase();
}

/** À appeler sur un code postal déjà normalisé. */
export function isValidPostalCode(postalCode: string): boolean {
  return POSTAL_CODE_PATTERN.test(postalCode);
}

export function isCarrierId(value: unknown): value is CarrierId {
  return CARRIER_IDS.includes(value as CarrierId);
}

/** Met le numéro et le code postal sous leur forme canonique (clé de cache, URL). */
export function normalizeQuery({ number, carrier, postalCode }: ParcelQuery): ParcelQuery {
  const postal = postalCode ? normalizePostalCode(postalCode) : '';
  return {
    number: normalizeTrackingNumber(number),
    ...(carrier && { carrier }),
    ...(postal && { postalCode: postal }),
  };
}

export type QueryProblem = 'invalid_number' | 'invalid_postal_code';

/**
 * À appeler sur une requête déjà normalisée. Un code postal manquant n'est pas un problème ici : il n'est
 * demandé que si le colis doit être enregistré auprès de 17TRACK (voir la route API).
 */
export function queryProblem({ number, postalCode }: ParcelQuery): QueryProblem | null {
  if (!isValidTrackingNumber(number)) return 'invalid_number';
  if (postalCode !== undefined && !isValidPostalCode(postalCode)) return 'invalid_postal_code';
  return null;
}

/** Même colis, même transporteur, même code postal : sert de clé de cache. */
export function queryKey({ number, carrier, postalCode }: ParcelQuery): string {
  return [number, carrier ?? '', postalCode ?? ''].join('|');
}

/** Lit un lien de suivi Mondial Relay ou Vinted Go ; null pour tout autre lien. */
function parseTrackingLink(raw: string): ParcelQuery | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();

  // mondialrelay.fr/suivi-de-colis/?numeroExpedition=…&codePostal=… (aussi .be, .es, .com…)
  if (/(^|\.)mondialrelay\.[a-z]{2,3}$/.test(host)) {
    // La casse des paramètres varie d'une page du site à l'autre
    const param = (name: string) =>
      [...url.searchParams].find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? '';
    const number = param('numeroExpedition');
    if (!number) return null;
    return normalizeQuery({ number, carrier: 'mondial-relay', postalCode: param('codePostal') });
  }

  // vintedgo.com/fr/tracking/1791213205588874?country=fr…
  if (/(^|\.)vintedgo\.com$/.test(host)) {
    const segments = url.pathname.split('/').filter(Boolean);
    const index = segments.indexOf('tracking');
    const number = index >= 0 ? segments[index + 1] : undefined;
    if (!number) return null;
    return normalizeQuery({ number, carrier: 'vinted-go' });
  }

  return null;
}

/**
 * Interprète la saisie du formulaire : un numéro seul, ou le lien de suivi d'un transporteur. Un numéro de
 * suivi ne contient jamais « / », « ? », « = » ni « : » : leur présence signale un lien.
 * Renvoie null pour un lien qui n'est pas reconnu.
 */
export function parseTrackingInput(raw: string): ParcelQuery | null {
  const input = raw.trim();
  if (/[/?=:]/.test(input)) return parseTrackingLink(input);
  return { number: normalizeTrackingNumber(input) };
}
