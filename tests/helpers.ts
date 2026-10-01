import { vi } from 'vitest';

type Endpoint = 'register' | 'gettrackinfo' | 'getquota';

/** Réponse simulée : un corps JSON (HTTP 200), ou une réponse complète pour tester les erreurs HTTP. */
type Reply = unknown | Response;

/**
 * Remplace fetch par un faux 17TRACK. Chaque endpoint répond avec la file de réponses fournie, dans
 * l'ordre ; la dernière est réutilisée. Tout appel vers un autre hôte fait échouer le test.
 */
export function mock17track(replies: Partial<Record<Endpoint, Reply[]>>) {
  const queues = new Map(Object.entries(replies));
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith('https://api.17track.net/')) throw new Error(`Appel réseau inattendu : ${url}`);

    const endpoint = url.split('/').at(-1)!;
    const queue = queues.get(endpoint);
    if (!queue?.length) throw new Error(`Aucune réponse simulée pour ${endpoint}`);

    const reply = queue.length > 1 ? queue.shift() : queue[0];
    return reply instanceof Response ? reply.clone() : Response.json(reply);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

type FetchMock = ReturnType<typeof mock17track>;

/** Endpoints appelés, dans l'ordre. */
export const calledEndpoints = (fetchMock: FetchMock) =>
  fetchMock.mock.calls.map(([input]) => String(input).split('/').at(-1));

/** Corps JSON envoyé lors du n-ième appel. */
export const sentBody = (fetchMock: FetchMock, call: number): unknown =>
  JSON.parse(String(fetchMock.mock.calls[call][1]?.body));

/** Réponse gettrackinfo pour un numéro jamais enregistré. */
export const NOT_REGISTERED_REPLY = {
  code: 0,
  data: { accepted: [], rejected: [{ number: 'X', error: { code: -18019902, message: 'not registered' } }] },
};

/** Coupe les logs attendus (avertissements 17TRACK, refus de quota) pour garder la sortie des tests lisible. */
export function silenceConsole() {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
}
