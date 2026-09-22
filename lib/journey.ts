import { countryName } from './countries';
import { dayKey, formatDay, formatRelative } from './format';
import type { Locale } from './locale-script';
import type { Coordinates, TrackingData, TrackingEvent } from './types';

export interface S10Number {
  /** Type de service (ex: "LP") */
  service: string;
  /** Série de 9 chiffres, clé de contrôle comprise */
  serial: string;
  /** Code ISO du pays d'origine (ex: "CN") */
  origin: string;
}

/**
 * Décompose un numéro postal international au format S10 (UPU), null pour tout autre format.
 * Les deux dernières lettres doivent être un vrai code pays : « XW570275354TS » (Chronopost) a la même forme
 * mais « TS » n'est pas un pays, ce n'est donc pas un numéro S10.
 */
export function parseS10(trackingNumber: string): S10Number | null {
  const match = /^([A-Z]{2})(\d{9})([A-Z]{2})$/i.exec(trackingNumber.trim());
  if (!match) return null;

  const origin = match[3].toUpperCase();
  // « ZZ » est le code réservé « région inconnue » : Intl le nomme, mais ce n'est pas un pays
  if (origin === 'ZZ' || !countryName(origin)) return null;

  return { service: match[1].toUpperCase(), serial: match[2], origin };
}

const EARTH_RADIUS_KM = 6371;

/** Distance à vol d'oiseau entre deux points [lng, lat], en kilomètres. */
export function haversineKm([lng1, lat1]: Coordinates, [lng2, lat2]: Coordinates): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export interface JourneyStats {
  steps: number;
  /** Nombre entier de jours entre le premier scan et la fin (ou maintenant), null si les dates sont inconnues */
  days: number | null;
  /** Somme des distances entre positions successives, null s'il y a moins de deux positions distinctes */
  distanceKm: number | null;
  lastScan: string | null;
  lastScanRelative: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Chiffres clés du trajet, calculés à partir des événements. `now` est fourni par l'appelant. */
export function summarizeJourney(data: TrackingData, now: number, locale: Locale): JourneyStats {
  const { events, status } = data;
  const newest = events[0]?.date ?? null;
  const oldest = events.at(-1)?.date ?? null;

  const path: Coordinates[] = [];
  for (const { coordinates } of [...events].reverse()) {
    if (!coordinates) continue;
    const last = path.at(-1);
    if (!last || last[0] !== coordinates[0] || last[1] !== coordinates[1]) path.push(coordinates);
  }
  const distanceKm =
    path.length < 2
      ? null
      : Math.round(path.slice(1).reduce((total, point, i) => total + haversineKm(path[i], point), 0));

  // Un colis livré ou retourné a fini son trajet ; sinon il est toujours en route
  const isFinished = status === 'Delivered' || status === 'Returned';
  const end = isFinished && newest ? Date.parse(newest) : now;
  const start = oldest ? Date.parse(oldest) : NaN;
  const days = Number.isNaN(start) || Number.isNaN(end) ? null : Math.max(0, Math.round((end - start) / DAY_MS));

  return {
    steps: events.length,
    days,
    distanceKm,
    lastScan: newest,
    lastScanRelative: newest ? formatRelative(newest, now, locale) : '',
  };
}

export interface DayGroup {
  key: string;
  label: string;
  items: { event: TrackingEvent; index: number }[];
}

/** Regroupe les événements (déjà triés du plus récent au plus ancien) par jour. */
export function groupEventsByDay(events: TrackingEvent[], locale: Locale): DayGroup[] {
  const groups: DayGroup[] = [];
  events.forEach((event, index) => {
    const key = dayKey(event.date, locale);
    const last = groups.at(-1);
    if (last?.key === key) {
      last.items.push({ event, index });
    } else {
      groups.push({ key, label: formatDay(event.date, locale), items: [{ event, index }] });
    }
  });
  return groups;
}
