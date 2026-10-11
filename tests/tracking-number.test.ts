import { describe, expect, it } from 'vitest';
import {
  isValidTrackingNumber,
  normalizeQuery,
  normalizeTrackingNumber,
  parseTrackingInput,
  queryProblem,
} from '@/lib/tracking-number';

describe('normalizeTrackingNumber', () => {
  it('retire les espaces copiés avec le numéro et passe en majuscules', () => {
    expect(normalizeTrackingNumber(' 1z 999 aa1\t01 ')).toBe('1Z999AA101');
  });

  it('donne la même clé pour un numéro saisi en minuscules ou en majuscules', () => {
    expect(normalizeTrackingNumber('lp123456789cn')).toBe(normalizeTrackingNumber('LP123456789CN'));
  });
});

describe('isValidTrackingNumber', () => {
  it.each(['LP123456789CN', 'XW123456789TS', '1Z999AA10123456784', 'AB12-34_5', '12345'])('accepte %s', (number) => {
    expect(isValidTrackingNumber(number)).toBe(true);
  });

  it.each([
    ['sans aucun chiffre', 'ABCDEFGH'],
    ['trop court', '1234'],
    ['trop long', '1'.repeat(51)],
    ['avec un espace (non normalisé)', 'LP 123456789CN'],
    ['en minuscules (non normalisé)', 'lp123456789cn'],
    ['avec un caractère interdit', 'LP123/456789'],
    ['vide', ''],
  ])('refuse un numéro %s', (_, number) => {
    expect(isValidTrackingNumber(number)).toBe(false);
  });

  it('accepte exactement 50 caractères', () => {
    expect(isValidTrackingNumber('1'.repeat(50))).toBe(true);
  });
});

describe('parseTrackingInput', () => {
  it('normalise un numéro seul, sans transporteur', () => {
    expect(parseTrackingInput(' lp 1234 5678 9cn ')).toEqual({ number: 'LP123456789CN' });
  });

  it('lit le numéro et le code postal d’un lien Mondial Relay', () => {
    expect(
      parseTrackingInput('https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=12345678&codePostal=75001')
    ).toEqual({ number: '12345678', carrier: 'mondial-relay', postalCode: '75001' });
  });

  it('accepte un lien Mondial Relay sans « https:// », d’un autre pays, aux paramètres en casse libre', () => {
    expect(parseTrackingInput('mondialrelay.be/fr-be/suivi-de-colis?NumeroExpedition=12345678&CodePostal=1000')).toEqual({
      number: '12345678',
      carrier: 'mondial-relay',
      postalCode: '1000',
    });
  });

  it('garde le transporteur d’un lien Mondial Relay sans code postal (demandé ensuite si besoin)', () => {
    const query = parseTrackingInput('https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=12345678')!;
    expect(query).toEqual({ number: '12345678', carrier: 'mondial-relay' });
    expect(queryProblem(query)).toBeNull();
  });

  it('lit le numéro d’un lien Vinted Go', () => {
    expect(parseTrackingInput('https://vintedgo.com/fr/tracking/1234567890123456?country=fr&region=europe')).toEqual({
      number: '1234567890123456',
      carrier: 'vinted-go',
    });
  });

  it.each([
    ['d’un autre site', 'https://www.laposte.fr/outils/suivre-vos-envois?code=LP123456789CN'],
    ['qui imite un domaine connu', 'https://mondialrelay.fr.example.com/?numeroExpedition=12345678&codePostal=75001'],
    ['Mondial Relay sans numéro', 'https://www.mondialrelay.fr/suivi-de-colis/'],
    ['Vinted Go sans numéro', 'https://vintedgo.com/fr/tracking'],
  ])('refuse un lien %s', (_, link) => {
    expect(parseTrackingInput(link)).toBeNull();
  });
});

describe('queryProblem', () => {
  it('accepte un numéro seul ou accompagné d’un transporteur et d’un code postal valides', () => {
    expect(queryProblem({ number: 'LP123456789CN' })).toBeNull();
    expect(queryProblem({ number: '12345678', carrier: 'mondial-relay', postalCode: '75001' })).toBeNull();
    expect(queryProblem({ number: '1234567890123456', carrier: 'vinted-go' })).toBeNull();
  });

  it('refuse un numéro invalide ou un code postal impossible', () => {
    expect(queryProblem({ number: 'ABC' })).toBe('invalid_number');
    expect(queryProblem({ number: '12345678', carrier: 'mondial-relay', postalCode: '75/01' })).toBe('invalid_postal_code');
  });
});

describe('normalizeQuery', () => {
  it('normalise le numéro et le code postal, et retire un code postal vide', () => {
    expect(normalizeQuery({ number: 'ab 123 45', carrier: 'vinted-go', postalCode: '' })).toEqual({
      number: 'AB12345',
      carrier: 'vinted-go',
    });
    expect(normalizeQuery({ number: '12345678', postalCode: '1000 aa' })).toEqual({ number: '12345678', postalCode: '1000AA' });
  });
});
