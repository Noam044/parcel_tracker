import type { Coordinates } from './types';

const ENDPOINT = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_CACHE_ENTRIES = 500;

export interface GeocodeAttempt {
  query: string;
  /** Codes pays ISO séparés par des virgules (ex: "KR" ou "CN,KR") : restreint les résultats à ces pays */
  country?: string;
}

/** Tentatives essayées dans l'ordre jusqu'à obtenir un résultat. */
export type GeocodeTarget = GeocodeAttempt[];

const attemptKey = ({ query, country }: GeocodeAttempt) => `${country ?? ''}|${query}`;

export const targetKey = (target: GeocodeTarget) => target.map(attemptKey).join('||');

// Cache partagé entre les requêtes (valable tant que l'instance serveur vit).
// null = Mapbox n'a aucun résultat pour cette tentative.
const cache = new Map<string, Coordinates | null>();

function remember(key: string, value: Coordinates | null) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

/** undefined = échec temporaire (non mis en cache), null = aucun résultat. */
async function lookup({ query, country }: GeocodeAttempt, token: string): Promise<Coordinates | null | undefined> {
  const params = new URLSearchParams({ access_token: token, limit: '1' });
  if (country) params.set('country', country.toLowerCase());

  try {
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(query)}.json?${params}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;

    const data: { features?: { center?: Coordinates }[] } = await response.json();
    return data.features?.[0]?.center ?? null;
  } catch (error) {
    console.error('Erreur de géocodage pour', query, error);
    return undefined;
  }
}

async function resolveTarget(target: GeocodeTarget, token: string): Promise<Coordinates | null | undefined> {
  let hadFailure = false;

  for (const attempt of target) {
    const key = attemptKey(attempt);
    let result = cache.get(key);
    if (result === undefined) {
      result = await lookup(attempt, token);
      if (result === undefined) {
        hadFailure = true;
        continue;
      }
      remember(key, result);
    }
    if (result) return result;
  }

  return hadFailure ? undefined : null;
}

/**
 * Géocode plusieurs cibles en parallèle (doublons fusionnés, cache consulté).
 * Le résultat est indexé par targetKey ; une cible sans résultat est absente ou associée à null.
 */
export async function geocode(
  targets: Iterable<GeocodeTarget>,
  token: string
): Promise<Map<string, Coordinates | null>> {
  const unique = new Map<string, GeocodeTarget>();
  for (const target of targets) unique.set(targetKey(target), target);

  const results = new Map<string, Coordinates | null>();
  await Promise.all(
    [...unique].map(async ([key, target]) => {
      const coordinates = await resolveTarget(target, token);
      if (coordinates !== undefined) results.set(key, coordinates);
    })
  );
  return results;
}
