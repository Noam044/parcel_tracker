/**
 * Limiteur de débit en mémoire, par clé (ex: adresse IP), sur une fenêtre glissante.
 *
 * La mémoire n'est pas partagée entre les instances serveur (Netlify en démarre plusieurs sous forte
 * charge) : c'est une première barrière contre un abus ponctuel, pas une garantie globale. La limite
 * qui protège vraiment le quota 17TRACK est dans lib/quota.ts.
 */

const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Secondes à attendre avant qu'une nouvelle requête soit acceptée (0 si acceptée) */
  retryAfter: number;
}

export function createRateLimiter(limit: number, windowMs: number) {
  // Horodatages des requêtes acceptées dans la fenêtre, par clé
  const hits = new Map<string, number[]>();

  function prune(now: number) {
    for (const [key, times] of hits) {
      if (times[times.length - 1] <= now - windowMs) hits.delete(key);
    }
    // Encore trop de clés (inondation depuis beaucoup d'IP) : on oublie les plus anciennes
    for (const key of hits.keys()) {
      if (hits.size < MAX_TRACKED_KEYS) break;
      hits.delete(key);
    }
  }

  return {
    /** Compte une requête pour `key` si la limite le permet. */
    consume(key: string, now = Date.now()): RateLimitResult {
      const recent = (hits.get(key) ?? []).filter((time) => time > now - windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
      }

      if (!hits.has(key) && hits.size >= MAX_TRACKED_KEYS) prune(now);
      recent.push(now);
      hits.set(key, recent);
      return { allowed: true, retryAfter: 0 };
    },
  };
}

/**
 * Adresse IP du client. Sur Netlify, x-nf-client-connection-ip est posé par la plateforme et ne peut
 * pas être falsifié par le client, contrairement au premier élément de x-forwarded-for.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-nf-client-connection-ip') ||
    headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
