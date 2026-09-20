export interface CountryInfo {
  /** Nom français, affiché dans l'interface */
  label: string;
  /** Nom anglais, utilisé comme contexte de géocodage */
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
