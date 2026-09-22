import { DICTIONARY } from './dictionary';
import type { Locale } from './locale-script';
import type { ApiError, ApiPending, TrackingData } from './types';

// Un numéro tout juste enregistré peut mettre un moment à recevoir ses premières données
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 12;

function isApiError(payload: unknown): payload is ApiError {
  return typeof payload === 'object' && payload !== null && typeof (payload as ApiError).error === 'string';
}

function isPending(payload: unknown): payload is ApiPending {
  return typeof payload === 'object' && payload !== null && (payload as ApiPending).pending === true;
}

function isTrackingData(payload: unknown): payload is TrackingData {
  return typeof payload === 'object' && payload !== null && Array.isArray((payload as TrackingData).events);
}

/** Une seule requête : les données de suivi, ou null si le colis n'a pas encore de données. */
async function requestTracking(trackingNumber: string, locale: Locale, signal?: AbortSignal): Promise<TrackingData | null> {
  const errors = DICTIONARY[locale].errors;
  const response = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // La langue voyage avec la requête : la route API l'utilise pour ses propres messages d'erreur
    // (numéro invalide, rejet 17TRACK…). Les données de suivi elles-mêmes restent neutres (voir lib/tracking.ts).
    body: JSON.stringify({ trackingNumber, locale }),
    signal,
  });

  // Une réponse non-JSON (page d'erreur d'un proxy, par exemple) ne doit pas masquer le vrai statut
  const payload: unknown = await response.json().catch(() => null);

  if (isApiError(payload)) throw new Error(payload.error);
  if (!response.ok) throw new Error(errors.httpErrorGeneric(response.status));
  if (isPending(payload)) return null;
  if (!isTrackingData(payload)) throw new Error(errors.unexpectedResponse);

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
  pollIntervalMs?: number;
  maxPolls?: number;
}

/**
 * Récupère le suivi d'un colis, en réessayant automatiquement tant que 17TRACK n'a pas de données.
 * Renvoie null si le colis reste introuvable après toutes les tentatives.
 */
export async function trackParcel(
  trackingNumber: string,
  locale: Locale,
  { signal, onPending, pollIntervalMs = POLL_INTERVAL_MS, maxPolls = MAX_POLLS }: TrackOptions = {}
): Promise<TrackingData | null> {
  for (let poll = 0; poll <= maxPolls; poll++) {
    const data = await requestTracking(trackingNumber, locale, signal);
    if (data) return data;

    if (poll < maxPolls) {
      onPending?.();
      await wait(pollIntervalMs, signal);
    }
  }
  return null;
}
