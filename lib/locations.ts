import { COUNTRIES, countryName } from './countries';
import type { GeocodeAttempt, GeocodeTarget } from './geocode';
import type { RawAddress } from './track17';

// Codes UN/LOCODE courants → noms de lieux géocodables
const UNLOCODE_MAP: Record<string, string> = {
  // Chine
  'CNCAND': 'Guangzhou Baiyun Airport, China',
  'CNCANA': 'Guangzhou, China',
  'CNCAN': 'Guangzhou, China',
  'CNSHA': 'Shanghai, China',
  'CNSHK': 'Shekou, Shenzhen, China',
  'CNSZX': 'Shenzhen, China',
  'CNPEK': 'Beijing, China',
  'CNTAO': 'Qingdao, China',
  'CNNKG': 'Nanjing, China',
  'CNHGH': 'Hangzhou, China',
  'CNCKG': 'Chongqing, China',
  'CNXMN': 'Xiamen, China',
  'CNWUH': 'Wuhan, China',
  'CNDLC': 'Dalian, China',
  'CNTSN': 'Tianjin, China',
  'CNCTU': 'Chengdu, China',
  'CNKMG': 'Kunming, China',
  'CNCSX': 'Changsha, China',
  'CNZHA': 'Zhanjiang, China',
  'CNFOC': 'Fuzhou, China',
  'CNNNG': 'Nanning, China',
  'CNSWA': 'Shantou, China',
  // Corée du Sud
  'KRSEL': 'Seoul, South Korea',
  'KRICN': 'Incheon, South Korea',
  'KRPUS': 'Busan, South Korea',
  'KRTAE': 'Daegu, South Korea',
  'KRCJJ': 'Jeju, South Korea',
  'KRKWJ': 'Gwangju, South Korea',
  // Japon
  'JPNRT': 'Narita Airport, Japan',
  'JPTYO': 'Tokyo, Japan',
  'JPOSA': 'Osaka, Japan',
  'JPKIX': 'Kansai Airport, Japan',
  'JPNGO': 'Nagoya, Japan',
  'JPFUK': 'Fukuoka, Japan',
  // États-Unis
  'USLAX': 'Los Angeles, United States',
  'USJFK': 'JFK Airport, New York, United States',
  'USSFO': 'San Francisco, United States',
  'USORD': 'Chicago, United States',
  // Europe
  'FRPAR': 'Paris, France',
  'FRCDG': 'Charles de Gaulle Airport, France',
  'DEHAM': 'Hamburg, Germany',
  'DEFRA': 'Frankfurt, Germany',
  'GBLON': 'London, United Kingdom',
  'GBLHR': 'Heathrow Airport, United Kingdom',
  'NLRTM': 'Rotterdam, Netherlands',
};

// Préfixes de codes postaux chinois → villes
const CN_POSTAL_PREFIX: Record<string, string> = {
  '100': 'Beijing, China',
  '200': 'Shanghai, China',
  '300': 'Tianjin, China',
  '310': 'Hangzhou, China',
  '330': 'Nanchang, China',
  '350': 'Fuzhou, China',
  '361': 'Xiamen, China',
  '400': 'Chongqing, China',
  '410': 'Changsha, China',
  '430': 'Wuhan, China',
  '450': 'Zhengzhou, China',
  '510': 'Guangzhou, China',
  '516': 'Huizhou, China',
  '518': 'Shenzhen, China',
  '530': 'Nanning, China',
  '550': 'Guiyang, China',
  '570': 'Haikou, China',
  '610': 'Chengdu, China',
  '650': 'Kunming, China',
  '710': 'Xi\'an, China',
  '730': 'Lanzhou, China',
  '810': 'Xining, China',
};

// Pays pour lesquels on tente de deviner un lieu à partir d'un UN/LOCODE inconnu
const LOCODE_GUESS_COUNTRIES = new Set(['CN', 'KR', 'JP', 'FR', 'US', 'DE', 'GB']);

const HAN_CHARACTERS = /[\u4e00-\u9fa5]/;
const HANGUL_CHARACTERS = /[\uAC00-\uD7AF]/;

// Mots qui décrivent un site postal plutôt qu'un lieu ("Goyang Mail Center" → "Goyang").
// Sans les retirer, le géocodeur s'accroche à ces mots (ex: "INTERNATIONAL POST OFFICE" → "Po-dong").
const GENERIC_PLACE_WORDS =
  /\b(international|mail|post|postal|office|center|centre|hub|depot|facility|sorting|distribution|logistics|exchange|inward|outward|terminal|branch|station|warehouse|delivery|processing|customs)\b/gi;

/** Nettoie un nom de site en gardant le lieu ; chaîne vide s'il ne reste rien d'exploitable. */
function cleanPlaceName(name: string): string {
  const cleaned = name.replace(GENERIC_PLACE_WORDS, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 2 ? cleaned : '';
}

const isCountryCode = (code: string) => /^[A-Z]{2}$/.test(code);

export interface LocationContext {
  /** Pays du transporteur qui rapporte l'événement */
  providerCountry?: string | null;
  /** Pays d'expédition et de destination du colis */
  parcelCountries?: (string | null | undefined)[];
}

export interface ResolvedLocation {
  /** Texte affiché dans la timeline */
  displayName: string;
  /** Cible à envoyer au géocodeur, null si trop ambigu pour être fiable */
  geocodeTarget: GeocodeTarget | null;
}

const withText = (query: string, country?: string): GeocodeTarget => [{ query, country }];

/**
 * Tentatives pour un nom de lieu sans pays : d'abord dans le pays de l'événement, puis dans les pays
 * du colis, avec une variante sans tiret ("MA-PO" → "MAPO"). Sans ce filtre, un nom court comme "MA-PO"
 * est placé n'importe où dans le monde (Inde, Mali...).
 */
function plainNameTarget(name: string, address: RawAddress | null | undefined, context: LocationContext): GeocodeTarget {
  const eventCountry = (address?.country || context.providerCountry || '').trim().toUpperCase();
  const parcelCountries = [context.providerCountry, ...(context.parcelCountries ?? [])]
    .map((code) => (code || '').trim().toUpperCase())
    .filter(isCountryCode);

  const tiers = [eventCountry, [...new Set(parcelCountries)].join(',')].filter(
    (tier, index, all) => tier && all.indexOf(tier) === index
  );
  if (tiers.length === 0) return [{ query: name }];

  const names = [name, name.replace(/-/g, '')].filter((n, index, all) => all.indexOf(n) === index);
  return tiers.flatMap((country): GeocodeAttempt[] => names.map((query) => ({ query, country })));
}

/**
 * Résoudre un lieu à partir des données d'événement 17TRACK.
 * Priorité : address.city > pays seul > UN/LOCODE > code postal chinois > texte brut
 */
export function resolveLocation(
  location: string | null | undefined,
  address: RawAddress | null | undefined,
  context: LocationContext = {}
): ResolvedLocation {
  const loc = (location || '').trim();
  const city = address?.city?.trim() || '';
  const country = address?.country?.trim() || '';

  // 1. Nom de ville fourni par 17TRACK (ex: "广州市")
  if (city.length > 1) {
    const countryContext = COUNTRIES[country]?.name ?? country;
    const target: GeocodeTarget = [];
    if (isCountryCode(country)) target.push({ query: city, country });
    target.push({ query: countryContext ? `${city}, ${countryContext}` : city });
    return { displayName: city, geocodeTarget: target };
  }

  // 2. Seul le pays est connu (ex: La Poste renvoie "FR") : rien de précis à placer sur la carte
  const locUpper = loc.toUpperCase();
  const onlyCountry = countryName(loc) ?? (loc ? undefined : countryName(country));
  if (onlyCountry) return { displayName: onlyCountry, geocodeTarget: null };

  // 3. UN/LOCODE connu
  if (UNLOCODE_MAP[locUpper]) {
    return { displayName: loc, geocodeTarget: withText(UNLOCODE_MAP[locUpper]) };
  }

  // 4. Ressemble à un UN/LOCODE (2 lettres pays + 3-4 caractères) : on devine à partir du pays
  if (/^[A-Z]{2}[A-Z0-9]{3,4}$/.test(locUpper)) {
    const countryCode = locUpper.substring(0, 2);
    if (LOCODE_GUESS_COUNTRIES.has(countryCode)) {
      return {
        displayName: loc,
        geocodeTarget: withText(`${locUpper.substring(2)}, ${COUNTRIES[countryCode].name}`, countryCode),
      };
    }
    // Pays inconnu : trop risqué de géocoder
    return { displayName: loc, geocodeTarget: null };
  }

  // 5. Code postal (que des chiffres) : seuls les codes chinois connus sont exploitables
  if (/^\d{5,8}$/.test(loc)) {
    const chineseCity = loc.length >= 6 ? CN_POSTAL_PREFIX[loc.substring(0, 3)] : undefined;
    return { displayName: loc, geocodeTarget: chineseCity ? withText(chineseCity) : null };
  }

  // 6. Chaîne trop courte pour être fiable
  if (loc.length <= 3) {
    return { displayName: loc || 'En transit', geocodeTarget: null };
  }

  // 7. Écritures asiatiques : contexte pays explicite
  if (HAN_CHARACTERS.test(loc)) return { displayName: loc, geocodeTarget: withText(`${loc}, China`, 'CN') };
  if (HANGUL_CHARACTERS.test(loc)) return { displayName: loc, geocodeTarget: withText(`${loc}, South Korea`, 'KR') };

  // 8. Nom lisible : on retire les mots de site postal, puis on géocode dans les pays plausibles
  const name = cleanPlaceName(loc);
  return { displayName: loc, geocodeTarget: name ? plainNameTarget(name, address, context) : null };
}
