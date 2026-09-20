import { COUNTRIES } from './countries';
import { geocode, targetKey, type GeocodeTarget } from './geocode';
import { resolveLocation } from './locations';
import {
  extractEstimatedDelivery,
  mapStatus,
  mergeEvents,
  readCoordinates,
  type RawAddress,
  type RawTrackInfo,
} from './track17';
import type { Coordinates, Destination, TrackingData, TrackingEvent } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
// Délais typiques utilisés quand le transporteur ne fournit pas de date estimée
const INTERNATIONAL_DELIVERY_DAYS = 12;
const DOMESTIC_DELIVERY_DAYS = 5;

interface DestinationPlan {
  label: string;
  coordinates?: Coordinates;
  cityTarget?: GeocodeTarget;
  fallbackTarget?: GeocodeTarget;
}

/** Prépare la résolution de la destination : coordonnées directes, sinon ville, sinon pays. */
function planDestination(address: RawAddress | null | undefined): DestinationPlan | null {
  const countryCode = address?.country?.trim() || '';
  const country = COUNTRIES[countryCode];
  const city = address?.city?.trim() || '';
  const hasCity = city.length > 1;

  if (!hasCity && !country) return null;

  return {
    label: hasCity ? [city, country?.label ?? countryCode].filter(Boolean).join(', ') : country.label,
    coordinates: readCoordinates(address),
    cityTarget: hasCity
      ? [
          ...(COUNTRIES[countryCode] ? [{ query: city, country: countryCode }] : []),
          { query: [city, country?.name ?? countryCode].filter(Boolean).join(', ') },
        ]
      : undefined,
    fallbackTarget: country ? [{ query: country.fallbackQuery }] : undefined,
  };
}

function estimateDelivery(
  info: RawTrackInfo,
  oldestEventIso: string | undefined
): Pick<TrackingData, 'estimatedDelivery' | 'estimatedDeliveryApproximate'> {
  const fromCarrier = extractEstimatedDelivery(info);
  if (fromCarrier) return { estimatedDelivery: fromCarrier };
  if (!oldestEventIso) return {};

  const originCountry = info.shipping_info?.shipper_address?.country;
  const destinationCountry = info.shipping_info?.recipient_address?.country;
  const isInternational = !!originCountry && !!destinationCountry && originCountry !== destinationCountry;
  const days = isInternational ? INTERNATIONAL_DELIVERY_DAYS : DOMESTIC_DELIVERY_DAYS;

  return {
    estimatedDelivery: new Date(Date.parse(oldestEventIso) + days * DAY_MS).toISOString(),
    estimatedDeliveryApproximate: true,
  };
}

/** Transforme la réponse brute de 17TRACK en données prêtes pour l'interface. */
export async function buildTrackingData(trackingNumber: string, info: RawTrackInfo): Promise<TrackingData> {
  const providers = info.tracking?.providers ?? [];
  const carrier = providers[0]?.provider?.name || 'Transporteur détecté automatiquement';
  const status = mapStatus(info.latest_status?.status, info.latest_status?.sub_status);

  const parcelCountries = [
    info.shipping_info?.shipper_address?.country,
    info.shipping_info?.recipient_address?.country,
  ];

  const resolved = mergeEvents(providers).map(({ raw, iso, providerCountry }) => ({
    iso,
    description: raw.description,
    directCoordinates: readCoordinates(raw.address),
    ...resolveLocation(raw.location, raw.address, { providerCountry, parcelCountries }),
  }));

  // La destination n'est affichée que tant que le colis est en route
  const isFinished = status === 'Delivered' || status === 'Returned';
  const destinationPlan = isFinished ? null : planDestination(info.shipping_info?.recipient_address);

  // Tous les appels de géocodage nécessaires partent en parallèle
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const targets: GeocodeTarget[] = [];
  if (mapboxToken) {
    for (const event of resolved) {
      if (!event.directCoordinates && event.geocodeTarget) targets.push(event.geocodeTarget);
    }
    if (destinationPlan && !destinationPlan.coordinates && destinationPlan.cityTarget) {
      targets.push(destinationPlan.cityTarget);
    }
  }
  const geocoded = mapboxToken ? await geocode(targets, mapboxToken) : new Map<string, Coordinates | null>();

  const events: TrackingEvent[] = resolved.map((event) => ({
    date: event.iso,
    location: event.displayName || 'En transit',
    description: event.description || 'Mise à jour du statut',
    coordinates:
      event.directCoordinates ?? (event.geocodeTarget ? geocoded.get(targetKey(event.geocodeTarget)) : null) ?? undefined,
  }));

  // Sans aucune position d'événement, un repère sur la capitale du pays serait trompeur
  const hasRoute = events.some((event) => event.coordinates);

  let destination: Destination | undefined;
  if (destinationPlan) {
    let coordinates =
      destinationPlan.coordinates ??
      (destinationPlan.cityTarget ? geocoded.get(targetKey(destinationPlan.cityTarget)) : null) ??
      undefined;

    // Ville introuvable : on se replie sur le pays
    if (!coordinates && mapboxToken && hasRoute && destinationPlan.fallbackTarget) {
      const fallback = await geocode([destinationPlan.fallbackTarget], mapboxToken);
      coordinates = fallback.get(targetKey(destinationPlan.fallbackTarget)) ?? undefined;
    }
    if (coordinates) destination = { label: destinationPlan.label, coordinates };
  }

  // Seul un colis encore en acheminement a une arrivée estimée
  const isEnRoute = status === 'In Transit' || status === 'Pending';
  const estimate = isEnRoute ? estimateDelivery(info, resolved.at(-1)?.iso) : {};

  return { trackingNumber, carrier, status, ...estimate, events, destination };
}
