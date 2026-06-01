export interface TrackingEvent {
  date: string;
  location: string;
  description: string;
  coordinates?: [number, number]; // [lng, lat]
}

export interface TrackingData {
  trackingNumber: string;
  carrier: string;
  status: 'In Transit' | 'Delivered' | 'Pending' | 'Exception';
  estimatedDelivery?: string;
  events: TrackingEvent[];
  destination?: {
    label: string;
    coordinates: [number, number];
  };
  origin?: {
    label: string;
    coordinates: [number, number];
  };
}

export async function fetchTrackingData(trackingNumber: string): Promise<TrackingData> {
  const response = await fetch('/api/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trackingNumber }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erreur ${response.status}`);
  }

  return data as TrackingData;
}
