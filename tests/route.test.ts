import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calledEndpoints, mock17track, NOT_REGISTERED_REPLY, silenceConsole } from './helpers';

// La route garde des caches et des limiteurs au niveau du module : chaque test repart d'un module neuf
async function loadRoute() {
  vi.resetModules();
  return (await import('@/app/api/track/[number]/route')).GET;
}

let ipCounter = 0;

function request(number: string, headers: Record<string, string> = {}) {
  const req = new Request(`https://parcel.test/api/track/${encodeURIComponent(number)}`, {
    headers: {
      host: 'parcel.test',
      'x-parcel-tracker': '1',
      'sec-fetch-site': 'same-origin',
      // Une IP différente par test, pour ne pas partager les limiteurs par accident
      'x-nf-client-connection-ip': `203.0.113.${++ipCounter}`,
      ...headers,
    },
  });
  return [req as unknown as NextRequest, { params: Promise.resolve({ number }) }] as const;
}

const READY_REPLY = {
  code: 0,
  data: {
    accepted: [
      {
        track_info: {
          latest_status: { status: 'Delivered' },
          tracking: {
            providers: [
              { provider: { name: 'La Poste', country: 'FR' }, events: [{ time_iso: '2026-09-02T09:00:00Z', description: 'Livré' }] },
            ],
          },
        },
      },
    ],
    rejected: [],
  },
};

describe('GET /api/track/[number]', () => {
  beforeEach(() => {
    silenceConsole();
    vi.stubEnv('TRACK17_API_KEY', 'test-key');
  });

  it('refuse une requête sans l’en-tête de l’application', async () => {
    const GET = await loadRoute();
    const response = await GET(...request('LP123456789CN', { 'x-parcel-tracker': '' }));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'forbidden' });
  });

  it('refuse une requête venue d’un autre site', async () => {
    const GET = await loadRoute();
    const response = await GET(...request('LP123456789CN', { 'sec-fetch-site': 'cross-site' }));
    expect(response.status).toBe(403);
  });

  it('refuse une origine différente quand sec-fetch-site est absent', async () => {
    const GET = await loadRoute();
    const [req, context] = request('LP123456789CN', { origin: 'https://evil.test' });
    req.headers.delete('sec-fetch-site');

    expect((await GET(req, context)).status).toBe(403);
  });

  it('rejette un numéro invalide sans appeler 17TRACK', async () => {
    const GET = await loadRoute();
    const fetchMock = mock17track({});
    const response = await GET(...request('abc'));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'invalid_number' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signale une clé 17TRACK absente ou laissée à sa valeur d’exemple', async () => {
    vi.stubEnv('TRACK17_API_KEY', 'votre_cle_17track_ici');
    const GET = await loadRoute();
    const response = await GET(...request('LP123456789CN'));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: 'not_configured' });
  });

  it('limite chaque IP à 30 requêtes par minute', async () => {
    const GET = await loadRoute();
    const ip = { 'x-nf-client-connection-ip': '198.51.100.30' };
    for (let i = 0; i < 30; i++) expect((await GET(...request('abc', ip))).status).toBe(400);

    const response = await GET(...request('abc', ip));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('renvoie un suivi prêt, mis en cache par le CDN et par la fonction', async () => {
    const GET = await loadRoute();
    const fetchMock = mock17track({ gettrackinfo: [READY_REPLY] });

    const response = await GET(...request('lp 1234 5678 9cn'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Netlify-CDN-Cache-Control')).toContain('s-maxage=180');
    expect(await response.json()).toMatchObject({ trackingNumber: 'LP123456789CN', carrier: 'La Poste', status: 'Delivered' });

    // Deuxième consultation : servie depuis le cache, sans nouvel appel à 17TRACK
    expect((await GET(...request('LP123456789CN'))).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('enregistre un numéro inconnu une seule fois, après avoir vérifié le quota', async () => {
    const GET = await loadRoute();
    const fetchMock = mock17track({
      gettrackinfo: [NOT_REGISTERED_REPLY],
      getquota: [{ code: 0, data: { quota_remain: 100, today_used: 0, max_track_daily: 0 } }],
      register: [{ code: 0, data: { accepted: [{}], rejected: [] } }],
    });

    const first = await GET(...request('LP123456789CN'));
    expect(first.status).toBe(202);
    expect(first.headers.get('Cache-Control')).toBe('no-store');
    expect(await first.json()).toEqual({ pending: true });

    // 17TRACK ne reconnaît pas encore le numéro : on attend, sans le réenregistrer
    expect((await GET(...request('LP123456789CN'))).status).toBe(202);
    expect(calledEndpoints(fetchMock)).toEqual(['gettrackinfo', 'getquota', 'register', 'gettrackinfo']);
  });

  it('suspend les enregistrements quand le quota du jour est atteint, sans appeler register', async () => {
    const GET = await loadRoute();
    const fetchMock = mock17track({
      gettrackinfo: [NOT_REGISTERED_REPLY],
      getquota: [{ code: 0, data: { quota_remain: 100, today_used: 5 } }],
    });

    const response = await GET(...request('LP123456789CN'));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'registrations_paused' });
    expect(calledEndpoints(fetchMock)).not.toContain('register');
  });

  it('limite chaque IP à 3 enregistrements par heure', async () => {
    const GET = await loadRoute();
    mock17track({
      gettrackinfo: [NOT_REGISTERED_REPLY],
      getquota: [{ code: 0, data: { quota_remain: 100, today_used: 0 } }],
      register: [{ code: 0, data: { accepted: [{}], rejected: [] } }],
    });
    vi.stubEnv('TRACK17_DAILY_REGISTER_LIMIT', '100');
    const ip = { 'x-nf-client-connection-ip': '198.51.100.3' };

    for (const n of [1, 2, 3]) expect((await GET(...request(`LP00000000${n}CN`, ip))).status).toBe(202);
    expect((await GET(...request('LP000000004CN', ip))).status).toBe(429);
  });

  it('partage un seul appel à 17TRACK entre deux requêtes simultanées pour le même numéro', async () => {
    const GET = await loadRoute();
    const fetchMock = mock17track({ gettrackinfo: [READY_REPLY] });

    const responses = await Promise.all([GET(...request('LP123456789CN')), GET(...request('LP123456789CN'))]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ne met jamais une erreur en cache', async () => {
    const GET = await loadRoute();
    mock17track({ gettrackinfo: [new Response(null, { status: 500 })] });

    const response = await GET(...request('LP123456789CN'));
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ code: 'upstream_http', detail: 500 });
  });
});
