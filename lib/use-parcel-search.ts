import { useEffect, useRef, useState } from 'react';
import { trackParcel } from './api';
import { rememberParcel } from './history';
import { summarizeJourney, type JourneyStats } from './journey';
import type { TrackingData } from './types';

interface SearchState {
  data: TrackingData | null;
  stats: JourneyStats | null;
  isLoading: boolean;
  /** true dès que 17TRACK n'a pas encore de données et que la recherche se poursuit */
  isWaiting: boolean;
  error: string | null;
  notice: string | null;
}

const INITIAL_STATE: SearchState = {
  data: null,
  stats: null,
  isLoading: false,
  isWaiting: false,
  error: null,
  notice: null,
};

export function useParcelSearch() {
  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const requestRef = useRef<AbortController | null>(null);

  // Annule la requête en cours si la page est quittée
  useEffect(() => () => requestRef.current?.abort(), []);

  const search = async (trackingNumber: string) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setState({ ...INITIAL_STATE, isLoading: true });
    try {
      const data = await trackParcel(trackingNumber, {
        signal: controller.signal,
        onPending: () => setState((current) => ({ ...current, isWaiting: true })),
      });

      if (!data) {
        setState({
          ...INITIAL_STATE,
          notice: "Ce colis n'est pas encore disponible auprès des transporteurs. Réessayez dans quelques minutes.",
        });
        return;
      }

      rememberParcel({
        number: data.trackingNumber,
        carrier: data.carrier,
        status: data.status,
        // Le tout dernier scan n'a pas toujours de lieu : on retient la dernière position connue
        lastLocation: (data.events.find((event) => event.coordinates) ?? data.events[0])?.location ?? '',
        lastDate: data.events[0]?.date ?? '',
      });
      setState({ ...INITIAL_STATE, data, stats: summarizeJourney(data, Date.now()) });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({ ...INITIAL_STATE, error: err instanceof Error ? err.message : 'Une erreur est survenue' });
    }
  };

  return { ...state, search };
}
