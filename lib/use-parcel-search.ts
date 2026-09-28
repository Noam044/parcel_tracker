import { useEffect, useMemo, useRef, useState } from 'react';
import { trackParcel, TrackingError } from './api';
import type { Dictionary } from './dictionary';
import { rememberParcel } from './history';
import { summarizeJourney, type JourneyStats } from './journey';
import { useT } from './locale';
import { isValidTrackingNumber } from './tracking-number';
import type { TrackingData } from './types';

export type BannerTone = 'error' | 'notice' | 'limit';

interface Message {
  /** notice : colis introuvable pour l'instant ; limit : limite du jour atteinte (pas une panne) */
  tone: BannerTone;
  /** Rédigé à l'affichage, pour suivre la langue même si elle change après la recherche */
  describe: (t: Dictionary) => string;
}

interface SearchState {
  data: TrackingData | null;
  /** Horodatage de la recherche réussie : sert de « maintenant » stable pour les stats du colis */
  fetchedAt: number | null;
  isLoading: boolean;
  /** true dès que 17TRACK n'a pas encore de données et que la recherche se poursuit */
  isWaiting: boolean;
  message: Message | null;
}

const INITIAL_STATE: SearchState = {
  data: null,
  fetchedAt: null,
  isLoading: false,
  isWaiting: false,
  message: null,
};

function messageFor(err: unknown): Message {
  if (err instanceof TrackingError) {
    return { tone: err.code === 'registrations_paused' ? 'limit' : 'error', describe: err.describe };
  }
  return { tone: 'error', describe: (t) => t.errors.searchGenericError };
}

export function useParcelSearch() {
  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const requestRef = useRef<AbortController | null>(null);
  const { locale, t } = useT();

  // Annule la requête en cours si la page est quittée
  useEffect(() => () => requestRef.current?.abort(), []);

  /** Abandonne la recherche en cours et revient à l'état d'accueil. */
  const reset = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setState(INITIAL_STATE);
  };

  /** `trackingNumber` doit être normalisé (voir lib/tracking-number.ts). */
  const search = async (trackingNumber: string) => {
    requestRef.current?.abort();

    // Un numéro invalide (ex: arrivé par l'URL) n'a pas besoin d'aller jusqu'au serveur
    if (!isValidTrackingNumber(trackingNumber)) {
      requestRef.current = null;
      setState({ ...INITIAL_STATE, message: { tone: 'error', describe: (t) => t.errors.invalidNumber } });
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    setState({ ...INITIAL_STATE, isLoading: true });
    try {
      const data = await trackParcel(trackingNumber, {
        signal: controller.signal,
        onPending: () => setState((current) => ({ ...current, isWaiting: true })),
      });

      if (!data) {
        setState({ ...INITIAL_STATE, message: { tone: 'notice', describe: (t) => t.errors.parcelNotYetAvailable } });
        return;
      }

      // Le tout dernier scan n'a pas toujours de lieu : on retient la dernière position connue
      const lastKnown = data.events.find((event) => event.coordinates) ?? data.events[0];
      rememberParcel({
        number: data.trackingNumber,
        carrier: data.carrier,
        status: data.status,
        lastLocation: lastKnown?.location ?? '',
        lastLocationCountryCode: lastKnown?.locationCountryCode,
        lastDate: data.events[0]?.date ?? '',
      });
      setState({ ...INITIAL_STATE, data, fetchedAt: Date.now() });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({ ...INITIAL_STATE, message: messageFor(err) });
    }
  };

  // Les chiffres du trajet (dont « il y a 3 jours ») dépendent de la langue : recalculés sans nouvel
  // appel réseau si l'utilisateur change de langue après une recherche, à partir des mêmes données.
  const stats: JourneyStats | null = useMemo(
    () => (state.data && state.fetchedAt ? summarizeJourney(state.data, state.fetchedAt, locale) : null),
    [state.data, state.fetchedAt, locale]
  );

  const { message, ...rest } = state;
  const banner = message ? { tone: message.tone, text: message.describe(t) } : null;

  return { ...rest, stats, banner, search, reset };
}
