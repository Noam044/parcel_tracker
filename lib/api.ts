import type { ApiError, TrackingData } from './types';

function isApiError(payload: unknown): payload is ApiError {
  return typeof payload === 'object' && payload !== null && typeof (payload as ApiError).error === 'string';
}

function isTrackingData(payload: unknown): payload is TrackingData {
  return typeof payload === 'object' && payload !== null && Array.isArray((payload as TrackingData).events);
}

export async function fetchTrackingData(trackingNumber: string, signal?: AbortSignal): Promise<TrackingData> {
  const response = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingNumber }),
    signal,
  });

  // Une réponse non-JSON (page d'erreur d'un proxy, par exemple) ne doit pas masquer le vrai statut
  const payload: unknown = await response.json().catch(() => null);

  // Un 202 (colis en cours de recherche) est un statut 2xx mais ne contient pas de données de suivi
  if (isApiError(payload)) throw new Error(payload.error);
  if (!response.ok) throw new Error(`Erreur ${response.status}`);
  if (!isTrackingData(payload)) throw new Error('Réponse inattendue du serveur.');

  return payload;
}
