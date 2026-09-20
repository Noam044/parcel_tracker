import type { NextRequest } from 'next/server';
import { buildTrackingData } from '@/lib/tracking';
import { API_KEY_PLACEHOLDER, getTrackInfo, registerNumber, UpstreamError } from '@/lib/track17';
import type { ApiError, ApiPending } from '@/lib/types';

// 17TRACK accepte des numéros de 5 à 50 caractères
const TRACKING_NUMBER_PATTERN = /^[A-Za-z0-9_-]{5,50}$/;

const fail = (error: string, status: number) => Response.json({ error } satisfies ApiError, { status });

async function readTrackingNumber(request: NextRequest): Promise<string | null> {
  try {
    const body = await request.json();
    // Les espaces sont souvent copiés avec le numéro (ex: "1Z 999 AA1 ...")
    const trackingNumber = typeof body?.trackingNumber === 'string' ? body.trackingNumber.replace(/\s+/g, '') : '';
    return TRACKING_NUMBER_PATTERN.test(trackingNumber) ? trackingNumber : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const trackingNumber = await readTrackingNumber(request);
  if (!trackingNumber) {
    return fail('Numéro de suivi manquant ou invalide.', 400);
  }

  const apiKey = process.env['17TRACK_API_KEY'];
  if (!apiKey || apiKey === API_KEY_PLACEHOLDER) {
    return fail("La clé API 17TRACK n'est pas configurée dans .env.local.", 500);
  }

  try {
    const result = await getTrackInfo(apiKey, trackingNumber);

    if (result.status === 'ready') {
      return Response.json(await buildTrackingData(trackingNumber, result.info));
    }

    // Numéro inconnu de 17TRACK : on l'enregistre pour qu'il commence à le suivre
    if (result.status === 'unregistered') {
      await registerNumber(apiKey, trackingNumber);
    }
    // Le client réessaiera lui-même : ce n'est pas une erreur
    return Response.json({ pending: true } satisfies ApiPending, { status: 202 });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return fail(error.message, 502);
    }
    console.error('Erreur dans /api/track:', error);
    return fail('Une erreur interne est survenue.', 500);
  }
}
