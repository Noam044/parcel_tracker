import type { NextRequest } from 'next/server';
import { buildTrackingData } from '@/lib/tracking';
import { DICTIONARY } from '@/lib/dictionary';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/locale-script';
import { API_KEY_PLACEHOLDER, getTrackInfo, registerNumber, UpstreamError } from '@/lib/track17';
import type { ApiError, ApiPending } from '@/lib/types';

// 17TRACK accepte des numéros de 5 à 50 caractères
const TRACKING_NUMBER_PATTERN = /^[A-Za-z0-9_-]{5,50}$/;

const fail = (error: string, status: number) => Response.json({ error } satisfies ApiError, { status });

interface ParsedRequest {
  trackingNumber: string | null;
  locale: Locale;
}

async function readRequest(request: NextRequest): Promise<ParsedRequest> {
  try {
    const body = await request.json();
    // Les espaces sont souvent copiés avec le numéro (ex: "1Z 999 AA1 ...")
    const raw = typeof body?.trackingNumber === 'string' ? body.trackingNumber.replace(/\s+/g, '') : '';
    return {
      trackingNumber: TRACKING_NUMBER_PATTERN.test(raw) ? raw : null,
      // La langue vient du client (voir lib/api.ts) ; un client hors-jeu ou absent retombe sur le français
      locale: isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE,
    };
  } catch {
    return { trackingNumber: null, locale: DEFAULT_LOCALE };
  }
}

export async function POST(request: NextRequest) {
  const { trackingNumber, locale } = await readRequest(request);
  const errors = DICTIONARY[locale].errors;

  if (!trackingNumber) {
    return fail(errors.invalidNumber, 400);
  }

  const apiKey = process.env.TRACK17_API_KEY;
  if (!apiKey || apiKey === API_KEY_PLACEHOLDER) {
    return fail(errors.keyNotConfigured, 500);
  }

  try {
    const result = await getTrackInfo(apiKey, trackingNumber, locale);

    if (result.status === 'ready') {
      return Response.json(await buildTrackingData(trackingNumber, result.info));
    }

    // Numéro inconnu de 17TRACK : on l'enregistre pour qu'il commence à le suivre
    if (result.status === 'unregistered') {
      await registerNumber(apiKey, trackingNumber, locale);
    }
    // Le client réessaiera lui-même : ce n'est pas une erreur
    return Response.json({ pending: true } satisfies ApiPending, { status: 202 });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return fail(error.message, 502);
    }
    console.error('Erreur dans /api/track:', error);
    return fail(errors.internalError, 500);
  }
}
