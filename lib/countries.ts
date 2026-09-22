import type { Locale } from './locale-script';

export interface CountryInfo {
  /** Nom français, affiché dans l'interface en français */
  label: string;
  /**
   * Nom anglais. Sert à la fois de contexte de géocodage (« Chine, China ») et de libellé affiché en
   * anglais : les deux usages coïncident pour tous les pays de cette table.
   */
  name: string;
  /** Requête de repli pour situer le pays sur la carte */
  fallbackQuery: string;
}

export const COUNTRIES: Record<string, CountryInfo> = {
  CN: { label: 'Chine', name: 'China', fallbackQuery: 'China' },
  KR: { label: 'Corée du Sud', name: 'South Korea', fallbackQuery: 'Seoul, South Korea' },
  JP: { label: 'Japon', name: 'Japan', fallbackQuery: 'Tokyo, Japan' },
  FR: { label: 'France', name: 'France', fallbackQuery: 'Paris, France' },
  US: { label: 'États-Unis', name: 'United States', fallbackQuery: 'United States' },
  DE: { label: 'Allemagne', name: 'Germany', fallbackQuery: 'Frankfurt, Germany' },
  GB: { label: 'Royaume-Uni', name: 'United Kingdom', fallbackQuery: 'London, United Kingdom' },
  AU: { label: 'Australie', name: 'Australia', fallbackQuery: 'Sydney, Australia' },
  CA: { label: 'Canada', name: 'Canada', fallbackQuery: 'Toronto, Canada' },
  SG: { label: 'Singapour', name: 'Singapore', fallbackQuery: 'Singapore' },
  TH: { label: 'Thaïlande', name: 'Thailand', fallbackQuery: 'Bangkok, Thailand' },
  MY: { label: 'Malaisie', name: 'Malaysia', fallbackQuery: 'Kuala Lumpur, Malaysia' },
  TW: { label: 'Taïwan', name: 'Taiwan', fallbackQuery: 'Taipei, Taiwan' },
  HK: { label: 'Hong Kong', name: 'Hong Kong', fallbackQuery: 'Hong Kong' },
  VN: { label: 'Vietnam', name: 'Vietnam', fallbackQuery: 'Hanoi, Vietnam' },
  PH: { label: 'Philippines', name: 'Philippines', fallbackQuery: 'Manila, Philippines' },
  ID: { label: 'Indonésie', name: 'Indonesia', fallbackQuery: 'Jakarta, Indonesia' },
  NL: { label: 'Pays-Bas', name: 'Netherlands', fallbackQuery: 'Amsterdam, Netherlands' },
  ES: { label: 'Espagne', name: 'Spain', fallbackQuery: 'Madrid, Spain' },
  IT: { label: 'Italie', name: 'Italy', fallbackQuery: 'Rome, Italy' },
  BR: { label: 'Brésil', name: 'Brazil', fallbackQuery: 'São Paulo, Brazil' },
  RU: { label: 'Russie', name: 'Russia', fallbackQuery: 'Moscow, Russia' },
  IN: { label: 'Inde', name: 'India', fallbackQuery: 'New Delhi, India' },
};

const regionNamesByLocale: Record<Locale, Intl.DisplayNames> = {
  fr: new Intl.DisplayNames(['fr'], { type: 'region', fallback: 'none' }),
  en: new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' }),
};

/** Nom d'un code pays ISO dans la langue donnée (ex: "FR" → "France" / "France"), undefined si invalide. */
export function countryName(code: string, locale: Locale = 'fr'): string | undefined {
  try {
    return /^[A-Z]{2}$/.test(code) ? regionNamesByLocale[locale].of(code) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Libellé d'un pays dans la langue donnée : d'abord notre table (identique sur tous les moteurs),
 * puis Intl.DisplayNames en repli pour les pays absents de la table (voir countryName pour la
 * réserve : ce repli dépend du navigateur et peut légèrement varier).
 */
export function countryLabel(code: string, locale: Locale): string | undefined {
  const table = COUNTRIES[code];
  if (table) return locale === 'fr' ? table.label : table.name;
  return countryName(code, locale);
}
