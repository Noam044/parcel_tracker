/** [longitude, latitude] */
export type Coordinates = [number, number];

export type TrackingStatus = 'In Transit' | 'Delivered' | 'Returned' | 'Pending' | 'Exception';

export interface TrackingEvent {
  date: string;
  /** Texte du transporteur, jamais traduit ; vide si aucun texte exploitable (voir locationCountryCode) */
  location: string;
  /** Quand seul le pays est connu (ex: La Poste renvoie "FR") : composé côté client, dans la langue choisie */
  locationCountryCode?: string;
  description: string;
  coordinates?: Coordinates;
}

export interface Destination {
  /** Ville, quand connue */
  city?: string;
  /** Code ISO du pays ; composé côté client avec la ville en un libellé complet */
  countryCode?: string;
  coordinates: Coordinates;
}

export interface TrackingData {
  trackingNumber: string;
  /** Nom du transporteur ; vide si non identifié (le client affiche un texte de repli traduit) */
  carrier: string;
  status: TrackingStatus;
  estimatedDelivery?: string;
  /** true quand la date est une estimation interne et non celle du transporteur */
  estimatedDeliveryApproximate?: boolean;
  /** Du plus récent au plus ancien */
  events: TrackingEvent[];
  destination?: Destination;
}

export interface ApiError {
  error: string;
}

/** Le numéro est connu de 17TRACK mais n'a pas encore de données de suivi. */
export interface ApiPending {
  pending: true;
}
