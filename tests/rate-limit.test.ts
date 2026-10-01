import { describe, expect, it } from 'vitest';
import { clientIp, createRateLimiter } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  it('accepte jusqu’à la limite puis refuse, avec le délai restant avant la prochaine place', () => {
    const limiter = createRateLimiter(2, 60_000);

    expect(limiter.consume('ip', 0)).toEqual({ allowed: true, retryAfter: 0 });
    expect(limiter.consume('ip', 1_000)).toEqual({ allowed: true, retryAfter: 0 });
    // La plus ancienne requête (t=0) libère sa place à t=60 s
    expect(limiter.consume('ip', 2_000)).toEqual({ allowed: false, retryAfter: 58 });
  });

  it('libère une place quand la plus ancienne requête sort de la fenêtre glissante', () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter.consume('ip', 0);
    limiter.consume('ip', 1_000);

    expect(limiter.consume('ip', 60_000).allowed).toBe(true);
    // t=1 s et t=60 s occupent maintenant les deux places
    expect(limiter.consume('ip', 60_500).allowed).toBe(false);
  });

  it('ne compte pas les requêtes refusées', () => {
    const limiter = createRateLimiter(1, 10_000);
    limiter.consume('ip', 0);
    for (let t = 1_000; t < 10_000; t += 1_000) expect(limiter.consume('ip', t).allowed).toBe(false);

    expect(limiter.consume('ip', 10_000).allowed).toBe(true);
  });

  it('attend au moins une seconde, même quand la place se libère dans moins d’une seconde', () => {
    const limiter = createRateLimiter(1, 1_000);
    limiter.consume('ip', 0);

    expect(limiter.consume('ip', 999)).toEqual({ allowed: false, retryAfter: 1 });
  });

  it('compte chaque clé séparément', () => {
    const limiter = createRateLimiter(1, 60_000);

    expect(limiter.consume('a', 0).allowed).toBe(true);
    expect(limiter.consume('b', 0).allowed).toBe(true);
    expect(limiter.consume('a', 1).allowed).toBe(false);
  });
});

describe('clientIp', () => {
  it('préfère l’en-tête posé par Netlify, que le client ne peut pas falsifier', () => {
    const headers = new Headers({
      'x-nf-client-connection-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1, 203.0.113.9',
    });
    expect(clientIp(headers)).toBe('203.0.113.7');
  });

  it('prend le dernier élément de x-forwarded-for, ajouté par le proxy, pas le premier', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9 ' }))).toBe('203.0.113.9');
  });

  it('se replie sur x-real-ip, puis sur « unknown »', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '203.0.113.5' }))).toBe('203.0.113.5');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
