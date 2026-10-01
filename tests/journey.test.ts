import { describe, expect, it } from 'vitest';
import { groupEventsByDay, haversineKm, parseS10, summarizeJourney } from '@/lib/journey';
import { progressStepIndex } from '@/lib/status';
import type { Coordinates, TrackingData, TrackingEvent } from '@/lib/types';

const PARIS: Coordinates = [2.3522, 48.8566];
const LONDON: Coordinates = [-0.1276, 51.5072];
const LYON: Coordinates = [4.8357, 45.764];

const event = (date: string, coordinates?: Coordinates): TrackingEvent => ({
  date,
  location: '',
  description: '',
  coordinates,
});

const parcel = (status: TrackingData['status'], events: TrackingEvent[]): TrackingData => ({
  trackingNumber: 'LP123456789CN',
  carrier: '',
  status,
  events,
});

describe('parseS10', () => {
  it('décompose un numéro postal international, quelle que soit la casse', () => {
    expect(parseS10(' lp123456789cn ')).toEqual({ service: 'LP', serial: '123456789', origin: 'CN' });
  });

  it.each([
    ['« TS » n’est pas un pays (Chronopost)', 'XW123456789TS'],
    ['« ZZ » est le code « région inconnue »', 'LP123456789ZZ'],
    ['8 chiffres au lieu de 9', 'LP12345678CN'],
    ['format transporteur (UPS)', '1Z999AA10123456784'],
  ])('renvoie null : %s', (_, number) => {
    expect(parseS10(number)).toBeNull();
  });
});

describe('haversineKm', () => {
  it('calcule la distance à vol d’oiseau Paris–Londres (≈ 344 km)', () => {
    expect(haversineKm(PARIS, LONDON)).toBeGreaterThan(340);
    expect(haversineKm(PARIS, LONDON)).toBeLessThan(348);
  });

  it('est symétrique et nulle pour un même point', () => {
    expect(haversineKm(PARIS, LYON)).toBeCloseTo(haversineKm(LYON, PARIS), 6);
    expect(haversineKm(PARIS, PARIS)).toBe(0);
  });
});

describe('summarizeJourney', () => {
  const now = Date.parse('2026-09-20T12:00:00Z');

  it('compte la durée jusqu’au dernier scan pour un colis livré', () => {
    const stats = summarizeJourney(
      parcel('Delivered', [event('2026-09-10T10:00:00Z', PARIS), event('2026-09-03T10:00:00Z', LONDON)]),
      now,
      'fr'
    );
    expect(stats.days).toBe(7);
    expect(stats.steps).toBe(2);
    expect(stats.lastScan).toBe('2026-09-10T10:00:00Z');
  });

  it('compte la durée jusqu’à maintenant pour un colis encore en route', () => {
    const stats = summarizeJourney(parcel('In Transit', [event('2026-09-10T12:00:00Z')]), now, 'fr');
    expect(stats.days).toBe(10);
    expect(stats.lastScanRelative).toBe('il y a 10 jours');
  });

  it('additionne les étapes en ignorant les positions répétées d’un scan à l’autre', () => {
    const withRepeat = summarizeJourney(
      parcel('In Transit', [
        event('2026-09-04T00:00:00Z', LYON),
        event('2026-09-03T00:00:00Z', PARIS),
        event('2026-09-02T00:00:00Z', PARIS),
        event('2026-09-01T00:00:00Z', LONDON),
      ]),
      now,
      'fr'
    );
    const expected = Math.round(haversineKm(LONDON, PARIS) + haversineKm(PARIS, LYON));
    expect(withRepeat.distanceKm).toBe(expected);
  });

  it('ne donne ni distance ni durée quand les données manquent', () => {
    const stats = summarizeJourney(parcel('Pending', [event('date invalide', PARIS)]), now, 'fr');
    expect(stats.distanceKm).toBeNull();
    expect(stats.days).toBeNull();

    const empty = summarizeJourney(parcel('Pending', []), now, 'fr');
    expect(empty).toMatchObject({ steps: 0, days: null, distanceKm: null, lastScan: null, lastScanRelative: '' });
  });
});

describe('groupEventsByDay', () => {
  it('regroupe les événements consécutifs du même jour en gardant leur index d’origine', () => {
    const groups = groupEventsByDay(
      [event('2026-09-02T18:00:00Z'), event('2026-09-02T08:00:00Z'), event('2026-09-01T23:00:00Z')],
      'fr'
    );
    expect(groups.map((group) => group.key)).toEqual(['2026-09-02', '2026-09-01']);
    expect(groups[0].items.map((item) => item.index)).toEqual([0, 1]);
    expect(groups[1].label).toBe('mar. 1 septembre 2026');
  });
});

describe('progressStepIndex', () => {
  it('place chaque statut sur la barre à trois étapes', () => {
    expect(progressStepIndex('Pending')).toBe(0);
    expect(progressStepIndex('In Transit')).toBe(1);
    expect(progressStepIndex('Exception')).toBe(1);
    expect(progressStepIndex('Delivered')).toBe(2);
    expect(progressStepIndex('Returned')).toBe(2);
  });
});
