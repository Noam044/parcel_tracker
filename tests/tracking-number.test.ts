import { describe, expect, it } from 'vitest';
import { isValidTrackingNumber, normalizeTrackingNumber } from '@/lib/tracking-number';

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
