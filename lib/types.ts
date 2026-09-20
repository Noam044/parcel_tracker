/** [longitude, latitude] */
export type Coordinates = [number, number];

export type TrackingStatus = 'In Transit' | 'Delivered' | 'Returned' | 'Pending' | 'Exception';

export interface TrackingEvent {
  date: string;
  location: string;
  description: string;
  coordinates?: Coordinates;
}

export interface Destination {
  label: string;
  coordinates: Coordinates;
}

export interface TrackingData {
  trackingNumber: string;
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
