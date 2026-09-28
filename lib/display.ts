import { countryLabel } from './countries';
import type { Dictionary } from './dictionary';
import type { Locale } from './locale-script';
import type { ApiErrorCode, Destination, TrackingEvent } from './types';

/**
 * Composent, dans la langue choisie, les quelques textes que le serveur laisse volontairement bruts
 * (voir lib/tracking.ts) : un lieu réduit à son pays, une destination, un transporteur non identifié.
 * Le texte fourni par le transporteur lui-même (raw carrier text) n'est jamais traduit.
 */

export function eventLocationText(event: TrackingEvent, locale: Locale, t: Dictionary): string {
  if (event.location) return event.location;
  if (event.locationCountryCode) return countryLabel(event.locationCountryCode, locale) ?? event.locationCountryCode;
  return t.timeline.inTransitFallback;
}

export function eventDescriptionText(event: TrackingEvent, t: Dictionary): string {
  return event.description || t.timeline.statusUpdateFallback;
}

export function destinationLabel(destination: Destination, locale: Locale): string {
  const country = destination.countryCode
    ? (countryLabel(destination.countryCode, locale) ?? destination.countryCode)
    : undefined;
  if (destination.city && country) return `${destination.city}, ${country}`;
  return destination.city ?? country ?? '';
}

export function carrierText(carrier: string, t: Dictionary): string {
  return carrier || t.autoDetectedCarrier;
}

/** Message affichable pour un rejet 17TRACK ; le code est conservé pour qui doit investiguer. */
export function rejectionText(code: number | undefined, t: Dictionary): string {
  const known = code !== undefined ? t.errors.rejection[String(code)] : undefined;
  return `${known ?? t.errors.rejectionFallback} (code ${code})`;
}

/** Message d'une erreur de l'API, rédigé dans la langue affichée à partir de son code. */
export function apiErrorText(code: ApiErrorCode, detail: number | undefined, t: Dictionary): string {
  const errors = t.errors;
  switch (code) {
    case 'invalid_number':
      return errors.invalidNumber;
    case 'forbidden':
      return errors.forbidden;
    case 'rate_limited':
      return errors.tooManyRequests;
    case 'registrations_paused':
      return errors.registrationsPaused;
    case 'busy':
      return errors.busy;
    case 'network':
      return errors.networkError;
    case 'upstream_http':
      return errors.upstreamHttpError(detail ?? 502);
    case 'upstream':
      return errors.upstreamGenericError;
    case 'rejected':
      return rejectionText(detail, t);
    case 'not_configured':
      return errors.keyNotConfigured;
    case 'internal':
      return errors.internalError;
  }
}
