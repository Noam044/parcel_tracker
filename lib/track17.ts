import { DICTIONARY } from './dictionary';
import { rejectionText } from './display';
import type { Locale } from './locale-script';
import { CARRIER_NAMES, type CarrierId, type ParcelQuery } from './tracking-number';
import type { ApiErrorCode, Coordinates, TrackingStatus } from './types';

const API_BASE = 'https://api.17track.net/track/v2.2';
const REQUEST_TIMEOUT_MS = 10_000;

export const API_KEY_PLACEHOLDER = 'votre_cle_17track_ici';

export interface RawAddress {
  country?: string | null;
  city?: string | null;
  postal_code?: string | null;
  coordinates?: { longitude?: number | string | null; latitude?: number | string | null } | null;
}

export interface RawEvent {
  time_iso?: string | null;
  time_utc?: string | null;
  description?: string | null;
  location?: string | null;
  address?: RawAddress | null;
}

interface RawProvider {
  provider?: { name?: string | null; country?: string | null } | null;
  events?: RawEvent[] | null;
}

type RawEstimatedDate = string | { from?: string | null; to?: string | null } | null;

export interface RawTrackInfo {
  latest_status?: {
    status?: string | null;
    sub_status?: string | null;
    estimated_delivery_date?: RawEstimatedDate;
  } | null;
  shipping_info?: {
    shipper_address?: RawAddress | null;
    recipient_address?: RawAddress | null;
    estimated_delivery_date?: RawEstimatedDate;
  } | null;
  time_metrics?: {
    estimated_delivery_date?: RawEstimatedDate;
    estimated_delivery_time?: RawEstimatedDate;
  } | null;
  tracking?: { providers?: RawProvider[] | null } | null;
}

interface Rejection {
  error?: { code?: number; message?: string };
}

interface ApiResponse {
  data?: {
    accepted?: { track_info?: RawTrackInfo | null }[] | null;
    rejected?: Rejection[] | null;
  };
}

// Code renvoyé par gettrackinfo pour un numéro qui n'a jamais été enregistré
const NOT_REGISTERED = -18019902;
// Code renvoyé par register quand le numéro l'est déjà (ex: deux onglets qui cherchent le même colis)
const ALREADY_REGISTERED = -18019901;
// Code renvoyé par gettrackinfo quand le numéro est enregistré, mais sous un autre transporteur que celui demandé
const OTHER_CARRIER = -18019910;
// Codes renvoyés par register quand le transporteur exige le code postal du destinataire
const POSTAL_CODE_REQUIRED = new Set([-18010018, -18010019]);
// Plafond quotidien du compte (réglage max_track_daily) ou quota total épuisé
const OUT_OF_QUOTA = new Set([-18019907, -18019908]);

/**
 * Formats de numéros dont 17TRACK ne détecte PAS seul le transporteur : l'enregistrement est alors rejeté
 * avec le code -18019903 (« The carrier can not be detected ») alors que le transporteur est bien pris en
 * charge. On le lui désigne explicitement avec sa clé numérique (liste : res.17track.net/asset/carrier/info/apicarrier.all.json).
 */
const CARRIER_HINTS: { pattern: RegExp; carrier: number; name: string }[] = [
  // Chronopost / Shop2Shop, ex. XW123456789TS : « TS » n'est pas un code pays, 17TRACK ne le reconnaît pas
  { pattern: /^[A-Z]{2}\d{9}TS$/i, carrier: 100273, name: 'Chronopost' },
];

export function carrierHint(number: string): number | undefined {
  return CARRIER_HINTS.find(({ pattern }) => pattern.test(number))?.carrier;
}

/** Clés 17TRACK des transporteurs désignés par un lien de suivi (voir lib/tracking-number.ts). */
export const CARRIER_KEYS: Record<CarrierId, number> = {
  'mondial-relay': 100304,
  'vinted-go': 101020,
};

/**
 * Transporteur reconnu au format du numéro, parmi ceux qui ont besoin d'une information en plus. Les
 * numéros d'expédition Mondial Relay comptent 8 chiffres : 17TRACK ne les enregistre pas sans code postal.
 * Ne sert qu'à l'enregistrement : un numéro déjà suivi l'est sous le transporteur choisi alors.
 */
export function guessCarrier(number: string): CarrierId | undefined {
  return /^\d{8}$/.test(number) ? 'mondial-relay' : undefined;
}

/** Transporteurs qui exigent le code postal du destinataire pour être suivis. */
export const needsPostalCode = (carrier: CarrierId | undefined) => carrier === 'mondial-relay';

/** Une requête telle que 17TRACK l'attend : transporteur sous forme de clé, code postal du destinataire. */
interface TrackRequest {
  number: string;
  carrier?: number;
  destination_postal_code?: string;
}

function trackRequest({ number, carrier, postalCode }: ParcelQuery): TrackRequest {
  return {
    number,
    ...(carrier && { carrier: CARRIER_KEYS[carrier] }),
    ...(postalCode && { destination_postal_code: postalCode }),
  };
}

/**
 * Erreur liée à la communication avec 17TRACK (renvoyée au client en 502, ou 503 si `status` le précise).
 * Le message est rédigé dans la langue de la requête ; `code` et `detail` permettent au client de le
 * réécrire dans la langue affichée.
 */
export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorCode,
    readonly status = 502,
    readonly detail?: number
  ) {
    super(message);
  }
}

function rejectionError(code: number | undefined, locale: Locale): UpstreamError {
  return new UpstreamError(rejectionText(code, DICTIONARY[locale]), 'rejected', 502, code);
}

/** Appel brut à 17TRACK. Les détails techniques restent dans les logs serveur, jamais dans la réponse au client. */
export async function post<T>(
  endpoint: 'register' | 'gettrackinfo' | 'getquota' | 'changecarrier' | 'changeinfo',
  apiKey: string,
  body: unknown,
  locale: Locale
): Promise<T & { code: number; message?: string }> {
  const errors = DICTIONARY[locale].errors;
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { '17token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`17TRACK ${endpoint} injoignable :`, error);
    throw new UpstreamError(errors.networkError, 'network');
  }

  // 17TRACK limite chaque compte à 3 requêtes par seconde
  if (response.status === 429) {
    console.warn(`17TRACK ${endpoint} : limite de débit atteinte (429)`);
    throw new UpstreamError(errors.busy, 'busy', 503);
  }
  if (!response.ok) {
    console.error(`17TRACK ${endpoint} : HTTP ${response.status}`);
    throw new UpstreamError(errors.upstreamHttpError(response.status), 'upstream_http', 502, response.status);
  }

  const json = (await response.json().catch(() => null)) as (T & { code: number; message?: string }) | null;
  if (!json || json.code !== 0) {
    // Ex: clé invalide ou compte suspendu. Le message de 17TRACK peut décrire le compte : il n'est pas relayé.
    console.error(`17TRACK ${endpoint} : code ${json?.code}`, json?.message);
    throw new UpstreamError(errors.upstreamGenericError, 'upstream');
  }
  return json;
}

/**
 * Le colis ne peut être enregistré sans le code postal du destinataire : le client le demande au visiteur,
 * puis relance la recherche avec `carrier` (s'il est connu) et ce code postal.
 */
export class PostalCodeRequiredError extends UpstreamError {
  constructor(
    locale: Locale,
    readonly carrier?: CarrierId
  ) {
    super(
      DICTIONARY[locale].postalCode.intro(carrier && CARRIER_NAMES[carrier]),
      'postal_code_required',
      422
    );
  }
}

/** Plus aucun nouveau numéro ne peut être enregistré aujourd'hui (limite du site, de 17TRACK, ou quota épuisé). */
export class RegistrationsPausedError extends UpstreamError {
  constructor(locale: Locale) {
    super(DICTIONARY[locale].errors.registrationsPaused, 'registrations_paused', 503);
  }
}

export type TrackInfoResult =
  | { status: 'ready'; info: RawTrackInfo }
  /** Numéro jamais enregistré : il faut l'enregistrer avant de pouvoir le suivre */
  | { status: 'unregistered' }
  /** Numéro enregistré sous un autre transporteur que celui demandé (17TRACK s'était trompé) */
  | { status: 'other_carrier' }
  /** Numéro enregistré mais sans données de suivi pour l'instant */
  | { status: 'pending' };

export async function getTrackInfo(apiKey: string, query: ParcelQuery, locale: Locale): Promise<TrackInfoResult> {
  const { number, carrier } = trackRequest(query);
  const json = await post<ApiResponse>('gettrackinfo', apiKey, [carrier ? { number, carrier } : { number }], locale);

  const trackInfo = json.data?.accepted?.[0]?.track_info;
  if (trackInfo?.tracking) return { status: 'ready', info: trackInfo };

  const rejection = json.data?.rejected?.[0]?.error;
  if (rejection?.code === NOT_REGISTERED) return { status: 'unregistered' };
  if (rejection?.code === OTHER_CARRIER && carrier) return { status: 'other_carrier' };
  if (rejection) {
    console.warn('Numéro rejeté par 17TRACK :', rejection.code, rejection.message);
    throw rejectionError(rejection.code, locale);
  }

  return { status: 'pending' };
}

/**
 * Enregistre un numéro auprès de 17TRACK pour qu'il commence à le suivre. Le transporteur est désigné
 * quand le visiteur a collé son lien de suivi, ou quand on connaît le format du numéro (voir CARRIER_HINTS).
 */
export async function registerNumber(apiKey: string, query: ParcelQuery, locale: Locale): Promise<void> {
  const request = trackRequest(query);
  request.carrier ??= carrierHint(request.number);
  const json = await post<ApiResponse>('register', apiKey, [request], locale);

  const rejection = json.data?.rejected?.[0]?.error;
  if (!rejection || rejection.code === ALREADY_REGISTERED) return;

  console.warn('Enregistrement rejeté par 17TRACK :', rejection.code, rejection.message);
  if (rejection.code !== undefined && OUT_OF_QUOTA.has(rejection.code)) {
    throw new RegistrationsPausedError(locale);
  }
  // Transporteur détecté par 17TRACK, mais qui exige un code postal que le visiteur n'a pas encore donné
  if (rejection.code !== undefined && POSTAL_CODE_REQUIRED.has(rejection.code) && !query.postalCode) {
    throw new PostalCodeRequiredError(locale, query.carrier);
  }
  throw rejectionError(rejection.code, locale);
}

/**
 * Réattribue un numéro déjà enregistré au transporteur désigné par le lien de suivi (ex: un numéro Vinted Go
 * que 17TRACK avait pris pour un numéro APC), puis lui transmet le code postal s'il est exigé. 17TRACK
 * limite à 5 les changements de transporteur d'un même numéro.
 */
export async function changeCarrier(apiKey: string, query: ParcelQuery, locale: Locale): Promise<void> {
  const { number, carrier, destination_postal_code } = trackRequest(query);
  if (!carrier) return;

  const changed = await post<ApiResponse>('changecarrier', apiKey, [{ number, carrier_new: carrier }], locale);
  const rejection = changed.data?.rejected?.[0]?.error;
  if (rejection) {
    console.warn('Changement de transporteur rejeté par 17TRACK :', rejection.code, rejection.message);
    throw rejectionError(rejection.code, locale);
  }

  if (destination_postal_code) {
    const updated = await post<ApiResponse>(
      'changeinfo',
      apiKey,
      [{ number, carrier, items: { destination_postal_code } }],
      locale
    );
    const refused = updated.data?.rejected?.[0]?.error;
    if (refused) {
      console.warn('Code postal rejeté par 17TRACK :', refused.code, refused.message);
      throw rejectionError(refused.code, locale);
    }
  }
}

export function mapStatus(raw: string | null | undefined, subStatus?: string | null): TrackingStatus {
  // Colis retourné à l'expéditeur (ou en cours de retour) : 17TRACK le classe en Exception
  if (subStatus === 'Exception_Returned' || subStatus === 'Exception_Returning') return 'Returned';

  switch (raw) {
    case 'Delivered':
      return 'Delivered';
    case 'InTransit':
    case 'OutForDelivery':
    case 'AvailableForPickup':
    // Anciennes valeurs de l'API
    case 'Transit':
    case 'PickUp':
    case 'Undelivered':
      return 'In Transit';
    case 'Exception':
    case 'DeliveryFailure':
    case 'Expired':
    case 'Alert':
      return 'Exception';
    case 'Returned':
      return 'Returned';
    default:
      return 'Pending';
  }
}

export function readCoordinates(address: RawAddress | null | undefined): Coordinates | undefined {
  const lng = Number(address?.coordinates?.longitude);
  const lat = Number(address?.coordinates?.latitude);
  const valid =
    Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
  // (0, 0) est la valeur par défaut renvoyée quand la position est inconnue
  return valid && (lng !== 0 || lat !== 0) ? [lng, lat] : undefined;
}

export interface MergedEvent {
  raw: RawEvent;
  iso: string;
  time: number;
  /** Pays du transporteur qui rapporte l'événement */
  providerCountry?: string | null;
}

/**
 * Fusionne les événements de tous les transporteurs, du plus récent au plus ancien.
 * Un événement rapporté à la même seconde par deux transporteurs différents est un doublon :
 * on garde celui dont la ville est renseignée.
 */
export function mergeEvents(providers: RawProvider[]): MergedEvent[] {
  const merged: MergedEvent[] = [];
  const firstSeen = new Map<number, { providerIndex: number; position: number }>();

  providers.forEach((provider, providerIndex) => {
    for (const raw of provider.events ?? []) {
      const iso = raw.time_iso || raw.time_utc;
      const time = iso ? Date.parse(iso) : NaN;
      if (!iso || Number.isNaN(time)) continue;

      const event: MergedEvent = { raw, iso, time, providerCountry: provider.provider?.country };
      const seen = firstSeen.get(time);

      if (!seen) {
        firstSeen.set(time, { providerIndex, position: merged.length });
        merged.push(event);
      } else if (seen.providerIndex === providerIndex) {
        // Deux événements distincts du même transporteur à la même seconde
        merged.push(event);
      } else if (!merged[seen.position].raw.address?.city && raw.address?.city) {
        merged[seen.position] = event;
      }
    }
  });

  return merged.sort((a, b) => b.time - a.time);
}

/** Date de livraison estimée fournie par le transporteur, si elle existe. */
export function extractEstimatedDelivery(info: RawTrackInfo): string | undefined {
  const candidates = [
    info.time_metrics?.estimated_delivery_date,
    info.latest_status?.estimated_delivery_date,
    info.shipping_info?.estimated_delivery_date,
    info.time_metrics?.estimated_delivery_time,
  ];

  for (const candidate of candidates) {
    const value = typeof candidate === 'string' ? candidate : candidate?.to || candidate?.from;
    if (value && !Number.isNaN(Date.parse(value))) return value;
  }
  return undefined;
}
