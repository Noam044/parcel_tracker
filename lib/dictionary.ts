import type { Locale } from './locale-script';
import type { TrackingStatus } from './types';

/**
 * Tous les textes du site, dans les deux langues. Ce fichier ne dépend pas de React : il est importé
 * aussi bien par les composants (via lib/locale.ts) que par la route API et le client 17TRACK, pour
 * localiser un message d'erreur sans dupliquer les chaînes.
 *
 * Les données de suivi elles-mêmes (lieux, descriptions d'événements fournis par le transporteur,
 * destination) restent volontairement neutres côté serveur — voir lib/tracking.ts — et sont mises en
 * mots ici uniquement pour les cas où 17TRACK ne fournit rien (colis sans lieu connu, transporteur non
 * identifié…). Le texte brut d'un transporteur (« NANCY CHRONOPOST », « 已妥投 »…) n'est jamais traduit.
 */
export interface Dictionary {
  header: {
    navAria: string;
    statuses: string;
    goodToKnow: string;
    darkMode: string;
    language: string;
  };
  footer: {
    trackingBy: string;
    mapsBy: string;
    afterMaps: string;
    positionsNote: string;
    createdBy: string;
    portfolioNewTab: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  form: {
    numberLabel: string;
    submitIdle: string;
    submitLoading: string;
    missingNumber: string;
    hint: string;
  };
  banner: {
    errorTag: string;
    noticeTag: string;
  };
  progress: {
    newNumberEyebrow: string;
    searchEyebrow: string;
    newNumberTitle: string;
    searchTitle: string;
    newNumberHint: string;
  };
  specimen: {
    title: string;
    explanation: string;
  };
  parcelNumber: {
    service: string;
    serial: string;
    origin: string;
  };
  parcelHeader: {
    summaryAria: string;
    statusLabel: string;
    progressAria: string;
    steps: string;
    stepsDetail: string;
    duration: string;
    durationDetailFinished: string;
    durationDetailOngoing: string;
    distance: string;
    distanceDetail: string;
    lastScan: string;
    eta: string;
    etaDetailApprox: string;
    etaDetailCarrier: string;
  };
  progressSteps: {
    registered: string;
    inTransit: string;
    delivered: string;
    returned: string;
    exception: string;
  };
  timeline: {
    title: string;
    legendOnMap: string;
    legendUnknown: string;
    inTransitFallback: string;
    statusUpdateFallback: string;
  };
  map: {
    destinationTitle: string;
    legendPast: string;
    legendRemaining: string;
    legendLatest: string;
    noPositionTitle: string;
    noPositionText: string;
    tokenMissing: string;
  };
  recent: {
    title: string;
    clear: string;
    refresh: string;
    removeAria: (number: string) => string;
  };
  guide: {
    statusTitle: string;
    goodToKnowTitle: string;
    goodToKnow: { label: string; text: string }[];
  };
  status: Record<TrackingStatus, { label: string; description: string }>;
  autoDetectedCarrier: string;
  errors: {
    invalidNumber: string;
    keyNotConfigured: string;
    internalError: string;
    networkError: string;
    upstreamHttpError: (status: number) => string;
    upstreamGenericError: (message: string) => string;
    unexpectedResponse: string;
    httpErrorGeneric: (status: number) => string;
    searchGenericError: string;
    parcelNotYetAvailable: string;
    rejection: Record<string, string>;
    rejectionFallback: string;
  };
}

const fr: Dictionary = {
  header: {
    navAria: 'Aide',
    statuses: 'Statuts',
    goodToKnow: 'Bon à savoir',
    darkMode: 'Mode sombre',
    language: 'Langue',
  },
  footer: {
    trackingBy: 'Suivi fourni par',
    mapsBy: ', cartes par',
    afterMaps: '© OpenStreetMap.',
    positionsNote: 'Les positions sont indicatives : elles sont déduites des noms de lieux.',
    createdBy: 'Site créé par',
    portfolioNewTab: "(portfolio, s'ouvre dans un nouvel onglet)",
  },
  hero: {
    eyebrow: 'Suivi de colis international',
    title: 'Où en est votre colis ?',
    subtitle:
      "Collez un numéro de suivi : le transporteur est reconnu automatiquement et l'itinéraire du colis est reconstitué sur la carte.",
  },
  form: {
    numberLabel: 'Numéro de suivi',
    submitIdle: 'Suivre le colis',
    submitLoading: 'Recherche…',
    missingNumber: 'Saisissez un numéro de suivi, puis cliquez sur « Suivre le colis ».',
    hint: 'Tous les transporteurs, sans compte. Le transporteur est reconnu automatiquement.',
  },
  banner: {
    errorTag: 'Erreur',
    noticeTag: 'Introuvable',
  },
  progress: {
    newNumberEyebrow: 'Nouveau numéro',
    searchEyebrow: 'Recherche',
    newNumberTitle: 'Le colis est recherché dans le réseau mondial…',
    searchTitle: 'Recherche du colis…',
    newNumberHint:
      'Un numéro tout juste expédié peut mettre quelques minutes à apparaître. La page se met à jour toute seule.',
  },
  specimen: {
    title: 'Exemple de numéro',
    explanation:
      "Les colis postaux internationaux suivent la norme S10 : deux lettres pour le service, neuf chiffres, puis le code du pays d'origine. Les numéros de DHL, UPS ou Colissimo ont d'autres formats et fonctionnent aussi.",
  },
  parcelNumber: {
    service: 'Service',
    serial: 'Série',
    origin: 'Origine',
  },
  parcelHeader: {
    summaryAria: 'Résumé du colis',
    statusLabel: 'Statut',
    progressAria: 'Progression du colis',
    steps: 'Étapes',
    stepsDetail: 'événements enregistrés',
    duration: 'Durée du trajet',
    durationDetailFinished: 'du premier au dernier scan',
    durationDetailOngoing: 'depuis le premier scan',
    distance: 'Distance',
    distanceDetail: "à vol d'oiseau",
    lastScan: 'Dernier scan',
    eta: 'Arrivée estimée',
    etaDetailApprox: 'estimation indicative',
    etaDetailCarrier: 'selon le transporteur',
  },
  progressSteps: {
    registered: 'Enregistré',
    inTransit: 'En acheminement',
    delivered: 'Livré',
    returned: 'Retourné',
    exception: 'Incident',
  },
  timeline: {
    title: 'Historique',
    legendOnMap: 'Sur la carte',
    legendUnknown: 'Lieu inconnu',
    inTransitFallback: 'En transit',
    statusUpdateFallback: 'Mise à jour du statut',
  },
  map: {
    destinationTitle: 'Destination',
    legendPast: 'Trajet parcouru',
    legendRemaining: 'Trajet restant',
    legendLatest: 'Dernière position',
    noPositionTitle: 'Position indisponible',
    noPositionText: "Le transporteur n'indique pas les lieux de passage de ce colis.",
    tokenMissing: "La carte est indisponible : la variable NEXT_PUBLIC_MAPBOX_TOKEN n'est pas configurée.",
  },
  recent: {
    title: 'Derniers colis suivis',
    clear: "Effacer l'historique",
    refresh: 'Actualiser',
    removeAria: (number) => `Retirer ${number} de l'historique`,
  },
  guide: {
    statusTitle: 'Ce que signifient les statuts',
    goodToKnowTitle: 'Bon à savoir',
    goodToKnow: [
      {
        label: 'Positions',
        text: 'Les lieux sont convertis en points sur la carte. Ils indiquent une zone (une ville, un centre de tri), jamais une adresse. Certains transporteurs ne donnent aucun lieu.',
      },
      {
        label: 'Nouveau numéro',
        text: 'Un colis tout juste expédié peut mettre quelques minutes à apparaître. La recherche se relance toute seule.',
      },
      {
        label: 'Confidentialité',
        text: 'Vos derniers numéros restent dans ce navigateur. Vous pouvez les retirer à tout moment.',
      },
    ],
  },
  status: {
    Pending: {
      label: 'En attente',
      description:
        "Le numéro existe mais aucun scan n'a encore été enregistré. C'est fréquent dans les premières heures qui suivent l'expédition.",
    },
    'In Transit': {
      label: 'En transit',
      description:
        'Le colis est pris en charge et avance vers sa destination. Il change souvent de transporteur en route, chacun ajoutant ses propres étapes.',
    },
    Delivered: {
      label: 'Livré',
      description: 'Le colis a été remis : au destinataire, dans une boîte aux lettres ou dans un point de retrait.',
    },
    Returned: {
      label: "Retourné à l'expéditeur",
      description: "Le colis n'a pas été retiré à temps ou a été refusé : il repart chez l'expéditeur.",
    },
    Exception: {
      label: 'Incident de livraison',
      description:
        "Adresse introuvable, colis abîmé, retenu en douane… Le transporteur précise la cause dans l'historique.",
    },
  },
  autoDetectedCarrier: 'Transporteur détecté automatiquement',
  errors: {
    invalidNumber: 'Numéro de suivi manquant ou invalide.',
    keyNotConfigured: "La clé API 17TRACK n'est pas configurée (variable d'environnement TRACK17_API_KEY).",
    internalError: 'Une erreur interne est survenue.',
    networkError: 'Impossible de joindre 17TRACK, veuillez réessayer.',
    upstreamHttpError: (status) => `Erreur lors de la communication avec 17TRACK (${status})`,
    upstreamGenericError: (message) => `Erreur 17TRACK: ${message}`,
    unexpectedResponse: 'Réponse inattendue du serveur.',
    httpErrorGeneric: (status) => `Erreur ${status}`,
    searchGenericError: 'Une erreur est survenue',
    parcelNotYetAvailable: "Ce colis n'est pas encore disponible auprès des transporteurs. Réessayez dans quelques minutes.",
    rejection: {
      '-18019903': "17TRACK ne reconnaît pas le transporteur de ce numéro. Vérifiez qu'il est correct.",
      '-18019911': 'Le suivi de ce transporteur est momentanément indisponible chez 17TRACK. Réessayez plus tard.',
      '-18010012': "Le format de ce numéro de suivi n'est pas valide.",
      '-18010018': 'Ce transporteur exige un code postal que ce site ne demande pas encore.',
      '-18010019': 'Ce transporteur exige un code postal que ce site ne demande pas encore.',
      '-18010020': 'Ce transporteur exige un numéro de téléphone que ce site ne demande pas encore.',
    },
    rejectionFallback: '17TRACK a refusé ce numéro de suivi.',
  },
};

const en: Dictionary = {
  header: {
    navAria: 'Help',
    statuses: 'Statuses',
    goodToKnow: 'Good to know',
    darkMode: 'Dark mode',
    language: 'Language',
  },
  footer: {
    trackingBy: 'Tracking provided by',
    mapsBy: ', maps by',
    afterMaps: '© OpenStreetMap.',
    positionsNote: 'Positions are indicative: they are inferred from place names.',
    createdBy: 'Site built by',
    portfolioNewTab: '(portfolio, opens in a new tab)',
  },
  hero: {
    eyebrow: 'International parcel tracking',
    title: "Where's your parcel?",
    subtitle: 'Paste a tracking number: the carrier is recognised automatically and the route is drawn on the map.',
  },
  form: {
    numberLabel: 'Tracking number',
    submitIdle: 'Track parcel',
    submitLoading: 'Searching…',
    missingNumber: 'Enter a tracking number, then click "Track parcel".',
    hint: 'Every carrier, no account needed. The carrier is recognised automatically.',
  },
  banner: {
    errorTag: 'Error',
    noticeTag: 'Not found',
  },
  progress: {
    newNumberEyebrow: 'New number',
    searchEyebrow: 'Searching',
    newNumberTitle: 'The parcel is being searched for across the global network…',
    searchTitle: 'Searching for the parcel…',
    newNumberHint: 'A number that was just shipped can take a few minutes to appear. This page updates itself.',
  },
  specimen: {
    title: 'Example number',
    explanation:
      'International postal parcels follow the S10 standard: two letters for the service, nine digits, then the origin country code. DHL, UPS or Colissimo numbers use other formats and work too.',
  },
  parcelNumber: {
    service: 'Service',
    serial: 'Serial',
    origin: 'Origin',
  },
  parcelHeader: {
    summaryAria: 'Parcel summary',
    statusLabel: 'Status',
    progressAria: 'Parcel progress',
    steps: 'Steps',
    stepsDetail: 'events recorded',
    duration: 'Journey time',
    durationDetailFinished: 'from the first to the last scan',
    durationDetailOngoing: 'since the first scan',
    distance: 'Distance',
    distanceDetail: 'as the crow flies',
    lastScan: 'Last scan',
    eta: 'Estimated arrival',
    etaDetailApprox: 'rough estimate',
    etaDetailCarrier: "per the carrier",
  },
  progressSteps: {
    registered: 'Registered',
    inTransit: 'In transit',
    delivered: 'Delivered',
    returned: 'Returned',
    exception: 'Exception',
  },
  timeline: {
    title: 'History',
    legendOnMap: 'On the map',
    legendUnknown: 'Unknown place',
    inTransitFallback: 'In transit',
    statusUpdateFallback: 'Status update',
  },
  map: {
    destinationTitle: 'Destination',
    legendPast: 'Route so far',
    legendRemaining: 'Remaining route',
    legendLatest: 'Latest position',
    noPositionTitle: 'Position unavailable',
    noPositionText: "The carrier doesn't report this parcel's locations.",
    tokenMissing: 'The map is unavailable: the NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set.',
  },
  recent: {
    title: 'Recently tracked parcels',
    clear: 'Clear history',
    refresh: 'Refresh',
    removeAria: (number) => `Remove ${number} from history`,
  },
  guide: {
    statusTitle: 'What the statuses mean',
    goodToKnowTitle: 'Good to know',
    goodToKnow: [
      {
        label: 'Positions',
        text: "Places are converted into points on the map. They show an area (a city, a sorting centre), never an address. Some carriers give no place at all.",
      },
      {
        label: 'New number',
        text: 'A parcel that was just shipped can take a few minutes to appear. The search retries by itself.',
      },
      {
        label: 'Privacy',
        text: 'Your recent numbers stay in this browser. You can remove them at any time.',
      },
    ],
  },
  status: {
    Pending: {
      label: 'Pending',
      description:
        "The number exists but no scan has been recorded yet. This is common in the first hours after shipping.",
    },
    'In Transit': {
      label: 'In transit',
      description:
        'The parcel has been picked up and is heading to its destination. It often changes carrier along the way, each one adding its own steps.',
    },
    Delivered: {
      label: 'Delivered',
      description: 'The parcel has been handed over: to the recipient, in a mailbox, or at a pickup point.',
    },
    Returned: {
      label: 'Returned to sender',
      description: "The parcel wasn't collected in time or was refused: it is going back to the sender.",
    },
    Exception: {
      label: 'Delivery issue',
      description:
        'Address not found, damaged parcel, held in customs… The carrier gives the reason in the history.',
    },
  },
  autoDetectedCarrier: 'Automatically detected carrier',
  errors: {
    invalidNumber: 'Tracking number missing or invalid.',
    keyNotConfigured: 'The 17TRACK API key is not configured (TRACK17_API_KEY environment variable).',
    internalError: 'An internal error occurred.',
    networkError: 'Could not reach 17TRACK, please try again.',
    upstreamHttpError: (status) => `Error communicating with 17TRACK (${status})`,
    upstreamGenericError: (message) => `17TRACK error: ${message}`,
    unexpectedResponse: 'Unexpected response from the server.',
    httpErrorGeneric: (status) => `Error ${status}`,
    searchGenericError: 'Something went wrong',
    parcelNotYetAvailable: "This parcel isn't available from carriers yet. Try again in a few minutes.",
    rejection: {
      '-18019903': "17TRACK doesn't recognise the carrier for this number. Check that it's correct.",
      '-18019911': 'Tracking for this carrier is temporarily unavailable at 17TRACK. Try again later.',
      '-18010012': 'The format of this tracking number is not valid.',
      '-18010018': "This carrier requires a postal code that this site doesn't ask for yet.",
      '-18010019': "This carrier requires a postal code that this site doesn't ask for yet.",
      '-18010020': "This carrier requires a phone number that this site doesn't ask for yet.",
    },
    rejectionFallback: '17TRACK rejected this tracking number.',
  },
};

export const DICTIONARY: Record<Locale, Dictionary> = { fr, en };
