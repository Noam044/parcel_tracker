import type { TrackingStatus } from './types';

interface StatusMeta {
  label: string;
  /** Explication affichée dans le glossaire */
  description: string;
  /** Classes Tailwind écrites en entier pour que la génération CSS les repère */
  stamp: string;
  segment: string;
  marker: string;
}

export const STATUS_META: Record<TrackingStatus, StatusMeta> = {
  Pending: {
    label: 'En attente',
    description:
      "Le numéro existe mais aucun scan n'a encore été enregistré. C'est fréquent dans les premières heures qui suivent l'expédition.",
    stamp: 'border-ink-soft text-ink-soft',
    segment: 'bg-ink-soft',
    marker: 'bg-ink-soft',
  },
  'In Transit': {
    label: 'En transit',
    description:
      'Le colis est pris en charge et avance vers sa destination. Il change souvent de transporteur en route, chacun ajoutant ses propres étapes.',
    stamp: 'border-customs text-customs',
    segment: 'bg-customs',
    marker: 'bg-customs',
  },
  Delivered: {
    label: 'Livré',
    description: 'Le colis a été remis : au destinataire, dans une boîte aux lettres ou dans un point de retrait.',
    stamp: 'border-ink text-ink',
    segment: 'bg-ink',
    marker: 'bg-ink',
  },
  Returned: {
    label: "Retourné à l'expéditeur",
    description: "Le colis n'a pas été retiré à temps ou a été refusé : il repart chez l'expéditeur.",
    stamp: 'border-signal text-ink',
    segment: 'bg-signal',
    marker: 'bg-signal',
  },
  Exception: {
    label: 'Incident de livraison',
    description:
      "Adresse introuvable, colis abîmé, retenu en douane… Le transporteur précise la cause dans l'historique.",
    stamp: 'border-alert text-alert',
    segment: 'bg-alert',
    marker: 'bg-alert',
  },
};

/** Ordre d'affichage dans le glossaire. */
export const STATUS_ORDER: TrackingStatus[] = ['Pending', 'In Transit', 'Delivered', 'Returned', 'Exception'];

/** Un colis passe par trois étapes ; ces libellés s'adaptent quand il dévie (retour, incident). */
export function progressSteps(status: TrackingStatus): { labels: [string, string, string]; active: number } {
  const labels: [string, string, string] = ['Enregistré', 'En acheminement', 'Livré'];
  if (status === 'Returned') labels[2] = 'Retourné';
  if (status === 'Exception') labels[1] = 'Incident';

  const active = { Pending: 0, 'In Transit': 1, Exception: 1, Delivered: 2, Returned: 2 }[status];
  return { labels, active };
}
