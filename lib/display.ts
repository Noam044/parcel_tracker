import { countryLabel } from './countries';
import type { Dictionary } from './dictionary';
import type { Locale } from './locale-script';
import type { Destination, TrackingEvent } from './types';

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
