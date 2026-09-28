import type { NextRequest } from 'next/server';
import { buildTrackingData } from '@/lib/tracking';
import { DICTIONARY } from '@/lib/dictionary';
import { DEFAULT_LOCALE } from '@/lib/locale-script';
import { assertRegistrationBudget } from '@/lib/quota';
import { clientIp, createRateLimiter } from '@/lib/rate-limit';
import { API_KEY_PLACEHOLDER, getTrackInfo, registerNumber, UpstreamError } from '@/lib/track17';
import { isValidTrackingNumber, normalizeTrackingNumber } from '@/lib/tracking-number';
import { CLIENT_HEADER, type ApiError, type ApiErrorCode, type ApiPending, type TrackingData } from '@/lib/types';

/**
 * GET /api/track/{numéro}
 *
 * Le numéro est dans le chemin, et non dans le corps ou la query string : une réponse prête peut ainsi
 * être gardée par le CDN de Netlify, dont la clé de cache contient toujours le chemin. Les consultations
 * répétées d'un même colis ne réveillent alors ni la fonction serveur, ni 17TRACK, ni Mapbox.
 *
 * Les messages d'erreur sont rédigés dans la langue par défaut ; le client les réécrit dans la langue
 * affichée à partir de `code` (voir lib/display.ts:apiErrorText).
 */

// Une recherche en attente relance la route au plus 8 fois en une minute (voir lib/api.ts)
const requestLimiter = createRateLimiter(30, 60_000);
// Chaque enregistrement coûte une unité de quota 17TRACK
const registerLimiter = createRateLimiter(3, 60 * 60_000);

// Données de suivi récentes, par numéro : un colis ne bouge pas à la minute, inutile de réinterroger
// 17TRACK (limité à 3 requêtes par seconde) ni Mapbox à chaque rafraîchissement
const READY_TTL_S = 180;
const MAX_CACHED = 200;
const readyCache = new Map<string, { data: TrackingData; expires: number }>();
// Numéros enregistrés par cette instance : 17TRACK peut mettre un moment à les reconnaître, on ne les
// réenregistre pas entre-temps
const REGISTERED_TTL_MS = 60 * 60_000;
const recentlyRegistered = new Map<string, number>();

// Recherches en cours : deux requêtes simultanées pour le même numéro partagent le même appel à 17TRACK
const inFlight = new Map<string, Promise<Outcome>>();

type Outcome = { kind: 'ready'; data: TrackingData } | { kind: 'pending' };

// Rien d'autre qu'un suivi prêt ne doit être gardé en cache : ni une attente, ni une erreur
const NO_STORE = { 'Cache-Control': 'no-store' };

/** Suivi prêt : gardé 3 minutes par le CDN (partagé entre ses nœuds), jamais par le navigateur. */
const ready = (data: TrackingData) =>
  Response.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${READY_TTL_S}, stale-while-revalidate=60`,
    },
  });

interface FailOptions {
  detail?: number;
  headers?: Record<string, string>;
}

const fail = (error: string, code: ApiErrorCode, status: number, { detail, headers }: FailOptions = {}) =>
  Response.json({ error, code, detail } satisfies ApiError, { status, headers: { ...NO_STORE, ...headers } });

function evictExpired<V>(map: Map<string, V>, isExpired: (value: V) => boolean) {
  for (const [key, value] of map) if (isExpired(value)) map.delete(key);
}

/** Requête envoyée par une autre origine (ex: un site tiers qui ferait chercher des numéros à ses visiteurs). */
function isCrossSite(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site !== 'same-origin' && site !== 'none';

  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.headers.get('host');
  } catch {
    return true;
  }
}

async function resolve(trackingNumber: string, apiKey: string, ip: string): Promise<Outcome> {
  const result = await getTrackInfo(apiKey, trackingNumber, DEFAULT_LOCALE);

  if (result.status === 'ready') {
    const data = await buildTrackingData(trackingNumber, result.info);
    evictExpired(readyCache, ({ expires }) => expires <= Date.now());
    if (readyCache.size >= MAX_CACHED) readyCache.delete(readyCache.keys().next().value!);
    readyCache.set(trackingNumber, { data, expires: Date.now() + READY_TTL_S * 1000 });
    return { kind: 'ready', data };
  }

  // Numéro inconnu de 17TRACK : on l'enregistre pour qu'il commence à le suivre (coûte une unité de quota)
  evictExpired(recentlyRegistered, (registeredAt) => registeredAt <= Date.now() - REGISTERED_TTL_MS);
  if (result.status === 'unregistered' && !recentlyRegistered.has(trackingNumber)) {
    const { allowed, retryAfter } = registerLimiter.consume(ip);
    if (!allowed) throw new RateLimited(retryAfter);

    await assertRegistrationBudget(apiKey, DEFAULT_LOCALE);
    await registerNumber(apiKey, trackingNumber, DEFAULT_LOCALE);
    recentlyRegistered.set(trackingNumber, Date.now());
  }
  return { kind: 'pending' };
}

class RateLimited extends Error {
  constructor(readonly retryAfter: number) {
    super('rate limited');
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const errors = DICTIONARY[DEFAULT_LOCALE].errors;

  if (request.headers.get(CLIENT_HEADER) !== '1' || isCrossSite(request)) {
    return fail(errors.forbidden, 'forbidden', 403);
  }

  const ip = clientIp(request.headers);
  const { allowed, retryAfter } = requestLimiter.consume(ip);
  if (!allowed) {
    return fail(errors.tooManyRequests, 'rate_limited', 429, { headers: { 'Retry-After': String(retryAfter) } });
  }

  const trackingNumber = normalizeTrackingNumber((await params).number);
  if (!isValidTrackingNumber(trackingNumber)) {
    return fail(errors.invalidNumber, 'invalid_number', 400);
  }

  const cached = readyCache.get(trackingNumber);
  if (cached && cached.expires > Date.now()) {
    return ready(cached.data);
  }

  const apiKey = process.env.TRACK17_API_KEY;
  if (!apiKey || apiKey === API_KEY_PLACEHOLDER) {
    console.error("TRACK17_API_KEY n'est pas configurée");
    return fail(errors.keyNotConfigured, 'not_configured', 500);
  }

  let flight = inFlight.get(trackingNumber);
  if (!flight) {
    flight = resolve(trackingNumber, apiKey, ip).finally(() => inFlight.delete(trackingNumber));
    inFlight.set(trackingNumber, flight);
  }

  try {
    const outcome = await flight;
    if (outcome.kind === 'ready') return ready(outcome.data);
    // Le client réessaiera lui-même : ce n'est pas une erreur
    return Response.json({ pending: true } satisfies ApiPending, { status: 202, headers: NO_STORE });
  } catch (error) {
    if (error instanceof RateLimited) {
      return fail(errors.tooManyRequests, 'rate_limited', 429, { headers: { 'Retry-After': String(error.retryAfter) } });
    }
    if (error instanceof UpstreamError) {
      return fail(error.message, error.code, error.status, { detail: error.detail });
    }
    console.error('Erreur dans /api/track:', error);
    return fail(errors.internalError, 'internal', 500);
  }
}
