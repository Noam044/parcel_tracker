import type { Locale } from './locale-script';

const INTL_TAG: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB' };

// Formateurs construits une fois par langue et réutilisés (Intl.* est coûteux à instancier).
function memoized<T>(build: (tag: string) => T): (locale: Locale) => T {
  const cache = new Map<Locale, T>();
  return (locale) => {
    let value = cache.get(locale);
    if (!value) {
      value = build(INTL_TAG[locale]);
      cache.set(locale, value);
    }
    return value;
  };
}

const eventFormat = memoized(
  (tag) => new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
);
const popupFormat = memoized((tag) => new Intl.DateTimeFormat(tag, { dateStyle: 'short', timeStyle: 'medium' }));
const longDateFormat = memoized(
  (tag) => new Intl.DateTimeFormat(tag, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
);
const dayFormat = memoized(
  (tag) => new Intl.DateTimeFormat(tag, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
);
const timeFormat = memoized((tag) => new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' }));

// en-CA donne AAAA-MM-JJ dans les deux langues : sert de clé de regroupement par jour (fuseau du navigateur)
const dayKeyFormat = memoized(() => new Intl.DateTimeFormat('en-CA'));

const numberFormat = memoized((tag) => new Intl.NumberFormat(tag));
const relativeFormat = memoized((tag) => new Intl.RelativeTimeFormat(tag, { numeric: 'auto' }));

function format(formatter: (locale: Locale) => Intl.DateTimeFormat, iso: string, locale: Locale): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatter(locale).format(date);
}

export const formatEventDate = (iso: string, locale: Locale) => format(eventFormat, iso, locale);
export const formatPopupDate = (iso: string, locale: Locale) => format(popupFormat, iso, locale);
export const formatLongDate = (iso: string, locale: Locale) => format(longDateFormat, iso, locale);
export const formatDay = (iso: string, locale: Locale) => format(dayFormat, iso, locale);
export const formatTime = (iso: string, locale: Locale) => format(timeFormat, iso, locale);
export const dayKey = (iso: string, locale: Locale) => format(dayKeyFormat, iso, locale);

export const formatDistance = (km: number, locale: Locale) => `${numberFormat(locale).format(km)} km`;

const DURATION_TEXT: Record<Locale, { lessThanOneDay: string; day: string; days: string }> = {
  fr: { lessThanOneDay: "Moins d'un jour", day: 'jour', days: 'jours' },
  en: { lessThanOneDay: 'Less than a day', day: 'day', days: 'days' },
};

export function formatDuration(days: number, locale: Locale): string {
  const text = DURATION_TEXT[locale];
  if (days < 1) return text.lessThanOneDay;
  return `${numberFormat(locale).format(days)} ${days === 1 ? text.day : text.days}`;
}

/** « il y a 3 jours », « hier »… `now` est passé en paramètre pour garder la fonction pure. */
export function formatRelative(iso: string, now: number, locale: Locale): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';

  const minutes = Math.round((time - now) / 60_000);
  const abs = Math.abs(minutes);
  const rf = relativeFormat(locale);

  if (abs < 60) return rf.format(minutes, 'minute');
  if (abs < 60 * 24) return rf.format(Math.round(minutes / 60), 'hour');
  if (abs < 60 * 24 * 45) return rf.format(Math.round(minutes / (60 * 24)), 'day');
  if (abs < 60 * 24 * 365) return rf.format(Math.round(minutes / (60 * 24 * 30)), 'month');
  return rf.format(Math.round(minutes / (60 * 24 * 365)), 'year');
}
