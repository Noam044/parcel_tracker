import type { Dictionary } from './dictionary';
import { apiErrorText } from './display';
import type { CarrierId, ParcelQuery } from './tracking-number';
import { CLIENT_HEADER, type ApiError, type ApiErrorCode, type ApiPending, type TrackingData } from './types';

// Un numéro tout juste enregistré peut mettre un moment à recevoir ses premières données. Les données
// arrivent souvent dans les premières secondes, parfois bien plus tard : des relances rapprochées au début
// puis espacées couvrent la même minute qu'une relance toutes les 5 s, avec 8 requêtes au lieu de 13.
const POLL_DELAYS_MS = [4_000, 4_000, 6_000, 8_000, 10_000, 12_000, 16_000];

/**
 * Échec d'une recherche. Le message n'est rédigé qu'à l'affichage (describe), dans la langue du moment :
 * basculer FR/EN après une erreur traduit aussi le bandeau.
 */
export class TrackingError extends Error {
  constructor(
    readonly describe: (t: Dictionary) => string,
    readonly code?: ApiErrorCode,
    /** postal_code_required : transporteur reconnu par le serveur */
    readonly carrier?: CarrierId
  ) {
    super(code ?? 'tracking error');
  }
}

function fromApiError({ error, code, detail, carrier }: ApiError): TrackingError {
  // Un code inconnu (client plus ancien que le serveur) : le message du serveur fait foi
  return new TrackingError((t) => (code ? apiErrorText(code, detail, t) : error), code, carrier);
}

function isApiError(payload: unknown): payload is ApiError {
  return typeof payload === 'object' && payload !== null && typeof (payload as ApiError).error === 'string';
}

function isPending(payload: unknown): payload is ApiPending {
  return typeof payload === 'object' && payload !== null && (payload as ApiPending).pending === true;
}

function isTrackingData(payload: unknown): payload is TrackingData {
  return typeof payload === 'object' && payload !== null && Array.isArray((payload as TrackingData).events);
}

/** Chemin de l'API pour un colis : « /api/track/{numéro}?carrier=…&postcode=… ». */
export function apiPath({ number, carrier, postalCode }: ParcelQuery): string {
  const params = new URLSearchParams();
  if (carrier) params.set('carrier', carrier);
  if (postalCode) params.set('postcode', postalCode);
  const search = params.size ? `?${params}` : '';
  return `/api/track/${encodeURIComponent(number)}${search}`;
}

/** Une seule requête : les données de suivi, ou null si le colis n'a pas encore de données. */
async function requestTracking(query: ParcelQuery, signal?: AbortSignal): Promise<TrackingData | null> {
  // Numéro dans le chemin : un suivi prêt peut être servi par le CDN (voir app/api/track/[number]/route.ts).
  // Les messages d'erreur sont rédigés ici, dans la langue affichée, à partir du code renvoyé.
  const response = await fetch(apiPath(query), {
    headers: { [CLIENT_HEADER]: '1' },
    signal,
  });

  // Une réponse non-JSON (page d'erreur d'un proxy, par exemple) ne doit pas masquer le vrai statut
  const payload: unknown = await response.json().catch(() => null);

  if (isApiError(payload)) throw fromApiError(payload);
  if (!response.ok) throw new TrackingError((t) => t.errors.httpErrorGeneric(response.status));
  if (isPending(payload)) return null;
  if (!isTrackingData(payload)) throw new TrackingError((t) => t.errors.unexpectedResponse);

  return payload;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

interface TrackOptions {
  signal?: AbortSignal;
  /** Appelé quand le colis n'a pas encore de données et que la recherche continue */
  onPending?: () => void;
}

/**
 * Récupère le suivi d'un colis, en réessayant automatiquement tant que 17TRACK n'a pas de données.
 * Renvoie null si le colis reste introuvable après toutes les tentatives.
 */
export async function trackParcel(
  query: ParcelQuery,
  { signal, onPending }: TrackOptions = {}
): Promise<TrackingData | null> {
  for (let poll = 0; poll <= POLL_DELAYS_MS.length; poll++) {
    const data = await requestTracking(query, signal);
    if (data) return data;

    if (poll < POLL_DELAYS_MS.length) {
      onPending?.();
      await wait(POLL_DELAYS_MS[poll], signal);
    }
  }
  return null;
}
