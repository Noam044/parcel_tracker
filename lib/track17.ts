import type { Coordinates, TrackingStatus } from './types';

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
  code: number;
  message?: string;
  data?: {
    accepted?: { track_info?: RawTrackInfo | null }[] | null;
    rejected?: Rejection[] | null;
  };
}

// Code renvoyé par gettrackinfo pour un numéro qui n'a jamais été enregistré
const NOT_REGISTERED = -18019902;

/** Erreur liée à la communication avec 17TRACK (renvoyée au client en 502). */
export class UpstreamError extends Error {}

async function call(endpoint: 'register' | 'gettrackinfo', apiKey: string, number: string): Promise<ApiResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { '17token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ number }]),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new UpstreamError('Impossible de joindre 17TRACK, veuillez réessayer.');
  }

  if (!response.ok) {
    throw new UpstreamError(`Erreur lors de la communication avec 17TRACK (${response.status})`);
  }

  const json: ApiResponse = await response.json();
  if (json.code !== 0) {
    throw new UpstreamError(`Erreur 17TRACK: ${json.message || 'Impossible de récupérer les informations.'}`);
  }
  return json;
}

export type TrackInfoResult =
  | { status: 'ready'; info: RawTrackInfo }
  /** Numéro jamais enregistré : il faut l'enregistrer avant de pouvoir le suivre */
  | { status: 'unregistered' }
  /** Numéro enregistré mais sans données de suivi pour l'instant */
  | { status: 'pending' };

export async function getTrackInfo(apiKey: string, number: string): Promise<TrackInfoResult> {
  const json = await call('gettrackinfo', apiKey, number);

  const trackInfo = json.data?.accepted?.[0]?.track_info;
  if (trackInfo?.tracking) return { status: 'ready', info: trackInfo };

  const rejection = json.data?.rejected?.[0]?.error;
  if (rejection?.code === NOT_REGISTERED) return { status: 'unregistered' };
  if (rejection) {
    console.warn('Numéro rejeté par 17TRACK :', rejection.code, rejection.message);
    throw new UpstreamError(`17TRACK a refusé ce numéro de suivi (code ${rejection.code}).`);
  }

  return { status: 'pending' };
}

/** Enregistre un numéro auprès de 17TRACK pour qu'il commence à le suivre. */
export async function registerNumber(apiKey: string, number: string): Promise<void> {
  const json = await call('register', apiKey, number);

  const rejection = json.data?.rejected?.[0]?.error;
  if (rejection) {
    console.warn('Enregistrement rejeté par 17TRACK :', rejection.code, rejection.message);
    throw new UpstreamError(`17TRACK a refusé d'enregistrer ce numéro de suivi (code ${rejection.code}).`);
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
