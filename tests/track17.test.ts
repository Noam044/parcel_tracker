import { beforeEach, describe, expect, it } from 'vitest';
import {
  carrierHint,
  extractEstimatedDelivery,
  getTrackInfo,
  mapStatus,
  mergeEvents,
  readCoordinates,
  registerNumber,
  RegistrationsPausedError,
  UpstreamError,
} from '@/lib/track17';
import { mock17track, NOT_REGISTERED_REPLY, sentBody, silenceConsole } from './helpers';

describe('mapStatus', () => {
  it.each([
    ['Delivered', 'Delivered'],
    ['InTransit', 'In Transit'],
    ['OutForDelivery', 'In Transit'],
    ['AvailableForPickup', 'In Transit'],
    ['Transit', 'In Transit'],
    ['Exception', 'Exception'],
    ['DeliveryFailure', 'Exception'],
    ['Expired', 'Exception'],
    ['Returned', 'Returned'],
    ['NotFound', 'Pending'],
    ['InfoReceived', 'Pending'],
    [null, 'Pending'],
  ])('%s → %s', (raw, expected) => {
    expect(mapStatus(raw)).toBe(expected);
  });

  it('classe un retour à l’expéditeur en « Returned », même si 17TRACK le range en Exception', () => {
    expect(mapStatus('Exception', 'Exception_Returned')).toBe('Returned');
    expect(mapStatus('Exception', 'Exception_Returning')).toBe('Returned');
    expect(mapStatus('Exception', 'Exception_Other')).toBe('Exception');
  });
});

describe('readCoordinates', () => {
  it('lit les coordonnées, y compris sous forme de texte, dans l’ordre [lng, lat]', () => {
    expect(readCoordinates({ coordinates: { longitude: '2.35', latitude: 48.85 } })).toEqual([2.35, 48.85]);
  });

  it.each([
    ['(0, 0), valeur par défaut quand la position est inconnue', { coordinates: { longitude: 0, latitude: 0 } }],
    ['une latitude hors limites', { coordinates: { longitude: 2, latitude: 91 } }],
    ['une valeur non numérique', { coordinates: { longitude: 'n/a', latitude: 48 } }],
    ['des coordonnées nulles', { coordinates: { longitude: null, latitude: null } }],
    ['une adresse sans coordonnées', { city: 'Paris' }],
    ['aucune adresse', null],
  ])('ignore %s', (_, address) => {
    expect(readCoordinates(address)).toBeUndefined();
  });
});

describe('carrierHint', () => {
  it('désigne Chronopost pour les numéros en …TS que 17TRACK ne reconnaît pas seul', () => {
    expect(carrierHint('XW123456789TS')).toBe(100273);
  });

  it('laisse 17TRACK détecter le transporteur pour les autres formats', () => {
    expect(carrierHint('LP123456789CN')).toBeUndefined();
  });
});

describe('mergeEvents', () => {
  it('fusionne les transporteurs du plus récent au plus ancien et ignore les dates invalides', () => {
    const merged = mergeEvents([
      { events: [{ time_iso: '2026-09-01T10:00:00Z', description: 'A' }, { time_iso: 'pas une date' }] },
      { events: [{ time_iso: '2026-09-03T10:00:00Z', description: 'C' }, { time_utc: '2026-09-02T10:00:00Z', description: 'B' }] },
    ]);
    expect(merged.map((event) => event.raw.description)).toEqual(['C', 'B', 'A']);
  });

  it('garde la version avec ville d’un événement rapporté à la même seconde par deux transporteurs', () => {
    const merged = mergeEvents([
      { provider: { country: 'CN' }, events: [{ time_iso: '2026-09-01T10:00:00Z', address: { city: null } }] },
      { provider: { country: 'FR' }, events: [{ time_iso: '2026-09-01T10:00:00Z', address: { city: 'Roissy' } }] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].raw.address?.city).toBe('Roissy');
    expect(merged[0].providerCountry).toBe('FR');
  });

  it('garde deux événements distincts d’un même transporteur à la même seconde', () => {
    const merged = mergeEvents([
      { events: [{ time_iso: '2026-09-01T10:00:00Z', description: 'Scan' }, { time_iso: '2026-09-01T10:00:00Z', description: 'Départ' }] },
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe('extractEstimatedDelivery', () => {
  it('prend la première date valide, par ordre de fiabilité', () => {
    expect(
      extractEstimatedDelivery({
        time_metrics: { estimated_delivery_date: 'bientôt' },
        latest_status: { estimated_delivery_date: { from: '2026-09-10T00:00:00Z', to: '2026-09-12T00:00:00Z' } },
        shipping_info: { estimated_delivery_date: '2026-09-01T00:00:00Z' },
      })
    ).toBe('2026-09-12T00:00:00Z');
  });

  it('se contente du début d’une plage sans fin', () => {
    expect(extractEstimatedDelivery({ time_metrics: { estimated_delivery_date: { from: '2026-09-10T00:00:00Z' } } })).toBe(
      '2026-09-10T00:00:00Z'
    );
  });

  it('renvoie undefined sans aucune date exploitable', () => {
    expect(extractEstimatedDelivery({})).toBeUndefined();
  });
});

describe('getTrackInfo', () => {
  beforeEach(silenceConsole);

  it('renvoie les données quand le suivi est prêt', async () => {
    const info = { tracking: { providers: [] }, latest_status: { status: 'InTransit' } };
    mock17track({ gettrackinfo: [{ code: 0, data: { accepted: [{ track_info: info }], rejected: [] } }] });

    await expect(getTrackInfo('key', 'LP123456789CN', 'fr')).resolves.toEqual({ status: 'ready', info });
  });

  it('signale un numéro jamais enregistré', async () => {
    mock17track({ gettrackinfo: [NOT_REGISTERED_REPLY] });
    await expect(getTrackInfo('key', 'LP123456789CN', 'fr')).resolves.toEqual({ status: 'unregistered' });
  });

  it('signale un numéro enregistré mais encore sans données', async () => {
    mock17track({ gettrackinfo: [{ code: 0, data: { accepted: [{ track_info: { tracking: null } }], rejected: [] } }] });
    await expect(getTrackInfo('key', 'LP123456789CN', 'fr')).resolves.toEqual({ status: 'pending' });
  });

  it('transmet le code de refus de 17TRACK sans relayer son message', async () => {
    mock17track({ gettrackinfo: [{ code: 0, data: { rejected: [{ error: { code: -18019903, message: 'détails internes' } }] } }] });

    const error = await getTrackInfo('key', 'LP123456789CN', 'fr').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({ code: 'rejected', status: 502, detail: -18019903 });
    expect((error as Error).message).not.toContain('détails internes');
  });

  it.each([
    ['limite de débit 17TRACK (429)', new Response(null, { status: 429 }), { code: 'busy', status: 503 }],
    ['erreur HTTP', new Response(null, { status: 500 }), { code: 'upstream_http', status: 502, detail: 500 }],
    ['clé refusée (code ≠ 0)', { code: 401, message: 'compte suspendu' }, { code: 'upstream', status: 502 }],
    ['réponse illisible', new Response('<html>', { status: 200 }), { code: 'upstream', status: 502 }],
  ])('convertit une %s en erreur typée', async (_, reply, expected) => {
    mock17track({ gettrackinfo: [reply] });
    await expect(getTrackInfo('key', 'LP123456789CN', 'fr')).rejects.toMatchObject(expected);
  });

  it('convertit une panne réseau en erreur « network »', async () => {
    const fetchMock = mock17track({});
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(getTrackInfo('key', 'LP123456789CN', 'fr')).rejects.toMatchObject({ code: 'network', status: 502 });
  });
});

describe('registerNumber', () => {
  beforeEach(silenceConsole);

  it('désigne le transporteur quand le format du numéro est connu', async () => {
    const fetchMock = mock17track({ register: [{ code: 0, data: { accepted: [{}], rejected: [] } }] });
    await registerNumber('key', 'XW123456789TS', 'fr');

    expect(sentBody(fetchMock, 0)).toEqual([{ number: 'XW123456789TS', carrier: 100273 }]);
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ '17token': 'key' });
  });

  it('n’envoie pas de transporteur sinon', async () => {
    const fetchMock = mock17track({ register: [{ code: 0, data: { accepted: [{}], rejected: [] } }] });
    await registerNumber('key', 'LP123456789CN', 'fr');

    expect(sentBody(fetchMock, 0)).toEqual([{ number: 'LP123456789CN' }]);
  });

  it('accepte un numéro déjà enregistré (deux onglets sur le même colis)', async () => {
    mock17track({ register: [{ code: 0, data: { rejected: [{ error: { code: -18019901 } }] } }] });
    await expect(registerNumber('key', 'LP123456789CN', 'fr')).resolves.toBeUndefined();
  });

  it.each([-18019907, -18019908])('suspend les enregistrements quand le quota est épuisé (code %i)', async (code) => {
    mock17track({ register: [{ code: 0, data: { rejected: [{ error: { code } }] } }] });
    await expect(registerNumber('key', 'LP123456789CN', 'fr')).rejects.toBeInstanceOf(RegistrationsPausedError);
  });
});
