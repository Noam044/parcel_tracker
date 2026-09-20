const eventFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const popupFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const longDateFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

// en-CA donne AAAA-MM-JJ : sert de clé de regroupement par jour (dans le fuseau du navigateur)
const dayKeyFormat = new Intl.DateTimeFormat('en-CA');

const numberFormat = new Intl.NumberFormat('fr-FR');
const relativeFormat = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

function format(formatter: Intl.DateTimeFormat, iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
}

export const formatEventDate = (iso: string) => format(eventFormat, iso);
export const formatPopupDate = (iso: string) => format(popupFormat, iso);
export const formatLongDate = (iso: string) => format(longDateFormat, iso);
export const formatDay = (iso: string) => format(dayFormat, iso);
export const formatTime = (iso: string) => format(timeFormat, iso);
export const dayKey = (iso: string) => format(dayKeyFormat, iso);

export const formatDistance = (km: number) => `${numberFormat.format(km)} km`;

export function formatDuration(days: number): string {
  if (days < 1) return "Moins d'un jour";
  return `${numberFormat.format(days)} ${days === 1 ? 'jour' : 'jours'}`;
}

/** « il y a 3 jours », « hier »… `now` est passé en paramètre pour garder la fonction pure. */
export function formatRelative(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';

  const minutes = Math.round((time - now) / 60_000);
  const abs = Math.abs(minutes);

  if (abs < 60) return relativeFormat.format(minutes, 'minute');
  if (abs < 60 * 24) return relativeFormat.format(Math.round(minutes / 60), 'hour');
  if (abs < 60 * 24 * 45) return relativeFormat.format(Math.round(minutes / (60 * 24)), 'day');
  if (abs < 60 * 24 * 365) return relativeFormat.format(Math.round(minutes / (60 * 24 * 30)), 'month');
  return relativeFormat.format(Math.round(minutes / (60 * 24 * 365)), 'year');
}
