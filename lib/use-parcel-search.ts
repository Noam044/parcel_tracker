import { useEffect, useMemo, useRef, useState } from 'react';
import { trackParcel } from './api';
import { rememberParcel } from './history';
import { summarizeJourney, type JourneyStats } from './journey';
import { useT } from './locale';
import type { TrackingData } from './types';

interface SearchState {
  data: TrackingData | null;
  /** Horodatage de la recherche réussie : sert de « maintenant » stable pour les stats du colis */
  fetchedAt: number | null;
  isLoading: boolean;
  /** true dès que 17TRACK n'a pas encore de données et que la recherche se poursuit */
  isWaiting: boolean;
  error: string | null;
  notice: string | null;
}

const INITIAL_STATE: SearchState = {
  data: null,
  fetchedAt: null,
  isLoading: false,
  isWaiting: false,
  error: null,
  notice: null,
};

export function useParcelSearch() {
  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const requestRef = useRef<AbortController | null>(null);
  const { locale, t } = useT();

  // Annule la requête en cours si la page est quittée
  useEffect(() => () => requestRef.current?.abort(), []);

  const search = async (trackingNumber: string) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setState({ ...INITIAL_STATE, isLoading: true });
    try {
      const data = await trackParcel(trackingNumber, locale, {
        signal: controller.signal,
        onPending: () => setState((current) => ({ ...current, isWaiting: true })),
      });

      if (!data) {
        setState({ ...INITIAL_STATE, notice: t.errors.parcelNotYetAvailable });
        return;
      }

      rememberParcel({
        number: data.trackingNumber,
        carrier: data.carrier,
        status: data.status,
        // Le tout dernier scan n'a pas toujours de lieu : on retient la dernière position connue
        lastLocation: (data.events.find((event) => event.coordinates) ?? data.events[0])?.location ?? '',
        lastLocationCountryCode: (data.events.find((event) => event.coordinates) ?? data.events[0])?.locationCountryCode,
        lastDate: data.events[0]?.date ?? '',
      });
      setState({ ...INITIAL_STATE, data, fetchedAt: Date.now() });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({ ...INITIAL_STATE, error: err instanceof Error ? err.message : t.errors.searchGenericError });
    }
  };

  // Les chiffres du trajet (dont « il y a 3 jours ») dépendent de la langue : recalculés sans nouvel
  // appel réseau si l'utilisateur change de langue après une recherche, à partir des mêmes données.
  const stats: JourneyStats | null = useMemo(
    () => (state.data && state.fetchedAt ? summarizeJourney(state.data, state.fetchedAt, locale) : null),
    [state.data, state.fetchedAt, locale]
  );

  return { ...state, stats, search };
}
