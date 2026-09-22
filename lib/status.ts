import type { TrackingStatus } from './types';

interface StatusClasses {
  /** Classes Tailwind écrites en entier pour que la génération CSS les repère */
  stamp: string;
  segment: string;
  marker: string;
}

// Le label et la description de chaque statut vivent dans lib/dictionary.ts (t.status), pour rester
// dans la langue choisie ; seules les classes visuelles, indépendantes de la langue, restent ici.
export const STATUS_CLASSES: Record<TrackingStatus, StatusClasses> = {
  Pending: { stamp: 'border-ink-soft text-ink-soft', segment: 'bg-ink-soft', marker: 'bg-ink-soft' },
  'In Transit': { stamp: 'border-customs text-customs', segment: 'bg-customs', marker: 'bg-customs' },
  Delivered: { stamp: 'border-ink text-ink', segment: 'bg-ink', marker: 'bg-ink' },
  Returned: { stamp: 'border-signal text-ink', segment: 'bg-signal', marker: 'bg-signal' },
  Exception: { stamp: 'border-alert text-alert', segment: 'bg-alert', marker: 'bg-alert' },
};

/** Ordre d'affichage dans le glossaire. */
export const STATUS_ORDER: TrackingStatus[] = ['Pending', 'In Transit', 'Delivered', 'Returned', 'Exception'];

/** Index (0-2) de l'étape active dans la barre de progression à trois temps. */
export function progressStepIndex(status: TrackingStatus): number {
  return { Pending: 0, 'In Transit': 1, Exception: 1, Delivered: 2, Returned: 2 }[status];
}
