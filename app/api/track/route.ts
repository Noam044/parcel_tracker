import type { NextRequest } from 'next/server';
import { buildTrackingData } from '@/lib/tracking';
import { DICTIONARY } from '@/lib/dictionary';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/locale-script';
import { assertRegistrationBudget } from '@/lib/quota';
import { clientIp, createRateLimiter } from '@/lib/rate-limit';
import {
  API_KEY_PLACEHOLDER,
  getTrackInfo,
  registerNumber,
  RegistrationsPausedError,
  UpstreamError,
} from '@/lib/track17';
import type { ApiError, ApiPending, TrackingData } from '@/lib/types';

// 17TRACK accepte des numéros de 5 à 50 caractères. Un numéro de suivi contient toujours au moins un
// chiffre : exiger un chiffre écarte d'emblée les saisies absurdes, qui pourraient coûter un enregistrement.
const TRACKING_NUMBER_PATTERN = /^(?=.*\d)[A-Z0-9_-]{5,50}$/;
// Largement assez pour { trackingNumber, locale } : au-delà, la requête n'est pas légitime
const MAX_BODY_BYTES = 1_024;

// Une recherche en attente relance la route toutes les 5 s pendant une minute (voir lib/api.ts) : 13 requêtes
const requestLimiter = createRateLimiter(30, 60_000);
// Chaque enregistrement coûte une unité de quota 17TRACK
const registerLimiter = createRateLimiter(3, 60 * 60_000);

// Données de suivi récentes, par numéro : un colis ne bouge pas à la minute, inutile de réinterroger
// 17TRACK (limité à 3 requêtes par seconde) ni Mapbox à chaque rafraîchissement
const READY_TTL_MS = 3 * 60_000;
const MAX_CACHED = 200;
const readyCache = new Map<string, { data: TrackingData; expires: number }>();
// Numéros enregistrés par cette instance : 17TRACK peut mettre un moment à les reconnaître, on ne les
// réenregistre pas entre-temps
const REGISTERED_TTL_MS = 60 * 60_000;
const recentlyRegistered = new Map<string, number>();

// Recherches en cours : deux requêtes simultanées pour le même numéro partagent le même appel à 17TRACK
const inFlight = new Map<string, Promise<Outcome>>();

type Outcome = { kind: 'ready'; data: TrackingData } | { kind: 'pending' };

const fail = (error: string, status: number, headers?: HeadersInit) =>
  Response.json({ error } satisfies ApiError, { status, headers });

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

interface ParsedRequest {
  trackingNumber: string | null;
  locale: Locale;
}

function parseBody(text: string): ParsedRequest {
  try {
    const body = JSON.parse(text);
    // Les espaces sont souvent copiés avec le numéro (ex: "1Z 999 AA1 ..."). La casse est normalisée pour
    // qu'un même colis saisi en minuscules partage le cache et ne soit jamais enregistré deux fois.
    const raw = typeof body?.trackingNumber === 'string' ? body.trackingNumber.replace(/\s+/g, '').toUpperCase() : '';
    return {
      trackingNumber: TRACKING_NUMBER_PATTERN.test(raw) ? raw : null,
      // La langue vient du client (voir lib/api.ts) ; un client hors-jeu ou absent retombe sur le français
      locale: isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE,
    };
  } catch {
    return { trackingNumber: null, locale: DEFAULT_LOCALE };
  }
}

async function resolve(trackingNumber: string, locale: Locale, apiKey: string, ip: string): Promise<Outcome> {
  const result = await getTrackInfo(apiKey, trackingNumber, locale);

  if (result.status === 'ready') {
    const data = await buildTrackingData(trackingNumber, result.info);
    evictExpired(readyCache, ({ expires }) => expires <= Date.now());
    if (readyCache.size >= MAX_CACHED) readyCache.delete(readyCache.keys().next().value!);
    readyCache.set(trackingNumber, { data, expires: Date.now() + READY_TTL_MS });
    return { kind: 'ready', data };
  }

  // Numéro inconnu de 17TRACK : on l'enregistre pour qu'il commence à le suivre (coûte une unité de quota)
  evictExpired(recentlyRegistered, (registeredAt) => registeredAt <= Date.now() - REGISTERED_TTL_MS);
  if (result.status === 'unregistered' && !recentlyRegistered.has(trackingNumber)) {
    const { allowed, retryAfter } = registerLimiter.consume(ip);
    if (!allowed) throw new RateLimited(retryAfter);

    await assertRegistrationBudget(apiKey, locale);
    await registerNumber(apiKey, trackingNumber, locale);
    recentlyRegistered.set(trackingNumber, Date.now());
  }
  return { kind: 'pending' };
}

class RateLimited extends Error {
  constructor(readonly retryAfter: number) {
    super('rate limited');
  }
}

export async function POST(request: NextRequest) {
  if (isCrossSite(request)) {
    return fail(DICTIONARY[DEFAULT_LOCALE].errors.forbidden, 403);
  }
  // Une requête « simple » (text/plain) échappe au contrôle CORS du navigateur : on exige du JSON
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return fail(DICTIONARY[DEFAULT_LOCALE].errors.forbidden, 415);
  }
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return fail(DICTIONARY[DEFAULT_LOCALE].errors.forbidden, 413);
  }

  const text = await request.text().catch(() => '');
  const { trackingNumber, locale } = parseBody(text.length > MAX_BODY_BYTES ? '' : text);
  const errors = DICTIONARY[locale].errors;

  const ip = clientIp(request.headers);
  const { allowed, retryAfter } = requestLimiter.consume(ip);
  if (!allowed) {
    return fail(errors.tooManyRequests, 429, { 'Retry-After': String(retryAfter) });
  }

  if (!trackingNumber) {
    return fail(errors.invalidNumber, 400);
  }

  const cached = readyCache.get(trackingNumber);
  if (cached && cached.expires > Date.now()) {
    return Response.json(cached.data);
  }

  const apiKey = process.env.TRACK17_API_KEY;
  if (!apiKey || apiKey === API_KEY_PLACEHOLDER) {
    console.error("TRACK17_API_KEY n'est pas configurée");
    return fail(errors.keyNotConfigured, 500);
  }

  const flightKey = `${trackingNumber}|${locale}`;
  let flight = inFlight.get(flightKey);
  if (!flight) {
    flight = resolve(trackingNumber, locale, apiKey, ip).finally(() => inFlight.delete(flightKey));
    inFlight.set(flightKey, flight);
  }

  try {
    const outcome = await flight;
    if (outcome.kind === 'ready') return Response.json(outcome.data);
    // Le client réessaiera lui-même : ce n'est pas une erreur
    return Response.json({ pending: true } satisfies ApiPending, { status: 202 });
  } catch (error) {
    if (error instanceof RateLimited) {
      return fail(errors.tooManyRequests, 429, { 'Retry-After': String(error.retryAfter) });
    }
    if (error instanceof RegistrationsPausedError) {
      return Response.json(
        { error: error.message, code: 'registrations_paused' } satisfies ApiError,
        { status: error.status }
      );
    }
    if (error instanceof UpstreamError) {
      return fail(error.message, error.status);
    }
    console.error('Erreur dans /api/track:', error);
    return fail(errors.internalError, 500);
  }
}
