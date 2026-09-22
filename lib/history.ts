import { useMemo, useSyncExternalStore } from 'react';
import type { TrackingStatus } from './types';

// Historique des derniers colis, conservé uniquement dans le navigateur

export interface HistoryEntry {
  number: string;
  /** Vide si non identifié par 17TRACK : le client affiche un texte de repli traduit */
  carrier: string;
  status: TrackingStatus;
  /** Texte du transporteur, jamais traduit ; vide si seul le pays est connu (voir lastLocationCountryCode) */
  lastLocation: string;
  lastLocationCountryCode?: string;
  lastDate: string;
}

const STORAGE_KEY = 'parcel-tracker:history';
const CHANGE_EVENT = 'parcel-tracker:history-change';
const MAX_ENTRIES = 6;

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  const hasRequiredStrings = ['number', 'carrier', 'status', 'lastLocation', 'lastDate'].every(
    (key) => typeof entry[key] === 'string'
  );
  return hasRequiredStrings && (entry.lastLocationCountryCode === undefined || typeof entry.lastLocationCountryCode === 'string');
}

function parse(raw: string): HistoryEntry[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isEntry) : [];
  } catch {
    return [];
  }
}

// Le « snapshot » est le texte brut : une chaîne est stable d'un rendu à l'autre, contrairement à un tableau
function readRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function write(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Stockage indisponible (navigation privée, quota) : l'historique est simplement ignoré
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Place le colis en tête de l'historique (sans doublon). */
export function rememberParcel(entry: HistoryEntry) {
  write([entry, ...parse(readRaw()).filter((existing) => existing.number !== entry.number)]);
}

export function useHistory() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '');
  const entries = useMemo(() => parse(raw), [raw]);

  return {
    entries,
    remove: (number: string) => write(parse(readRaw()).filter((entry) => entry.number !== number)),
    clear: () => write([]),
  };
}
