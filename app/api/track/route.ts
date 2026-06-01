import { NextRequest } from 'next/server';

interface TrackingEvent {
  date: string;
  location: string;
  description: string;
  coordinates?: [number, number]; // [lng, lat]
}

interface TrackingData {
  trackingNumber: string;
  carrier: string;
  status: 'In Transit' | 'Delivered' | 'Pending' | 'Exception';
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

// Fonction utilitaire pour éviter que Mapbox ne place des codes postaux chinois en Malaisie
function enrichLocationQuery(loc: string, desc: string, carrierName: string): string | null {
  let query = loc.trim();
  if (!query) return null;

  const locUpper = query.toUpperCase();

  // 1. Si c'est un code aéroportuaire/UN LOCODE (ex: CNCAND = China, Guangzhou)
  if (/^[A-Z]{2}[A-Z0-9]{3,4}$/.test(locUpper)) {
    const cc = locUpper.substring(0, 2);
    if (cc === 'CN') return `${query}, China`;
    if (cc === 'KR') return `${query}, South Korea`;
    if (cc === 'FR') return `${query}, France`;
    if (cc === 'US') return `${query}, United States`;
    if (cc === 'GB') return `${query}, United Kingdom`;
    if (cc === 'DE') return `${query}, Germany`;
    if (cc === 'JP') return `${query}, Japan`;
    return query;
  }

  // 2. Si ce n'est composé que de chiffres ou que la chaîne est très courte (ex: "ZA")
  if (/^\d+$/.test(query) || query.length <= 4) {
    const countryMatch = desc.match(/country\s*[:\-]?\s*,?\s*([A-Za-z]+)/i);
    
    if (countryMatch && countryMatch[1]) {
      if (/[\u4e00-\u9fa5]/.test(desc) || carrierName.toLowerCase().includes('china')) {
        return `${query}, China`;
      }
      return `${query}, ${countryMatch[1]}`;
    }
    
    if (/[\u4e00-\u9fa5]/.test(desc)) {
      return `${query}, China`;
    }
    
    // Si c'est trop court ou juste des chiffres et qu'on n'a trouvé aucun pays, c'est trop risqué.
    // Par exemple "ZA" va être géocodé en Afrique du Sud.
    if (carrierName.toLowerCase().includes('korea') || carrierName.toLowerCase().includes('epost')) {
      // Même là, c'est risqué si c'est le point de départ en Chine. 
      // On préfère retourner null pour ne pas afficher de point erroné sur la carte.
      return null;
    }
    return null;
  }

  return query;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const trackingNumber = body.trackingNumber;

    if (!trackingNumber || typeof trackingNumber !== 'string') {
      return Response.json(
        { error: "Numéro de suivi manquant ou invalide." },
        { status: 400 }
      );
    }

    const token17Track = process.env['17TRACK_API_KEY'];
    
    if (!token17Track || token17Track === 'votre_cle_17track_ici') {
      return Response.json(
        { error: "La clé API 17TRACK n'est pas configurée dans .env.local." },
        { status: 500 }
      );
    }

    const headers = {
      '17token': token17Track,
      'Content-Type': 'application/json'
    };

    // 1. Enregistrer le numéro de suivi auprès de 17TRACK (obligatoire avant de récupérer les infos)
    await fetch('https://api.17track.net/track/v2.2/register', {
      method: 'POST',
      headers,
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    // 2. Récupérer les informations de suivi
    const response = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
      method: 'POST',
      headers,
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    if (!response.ok) {
      return Response.json(
        { error: `Erreur lors de la communication avec 17TRACK (${response.status})` },
        { status: 502 }
      );
    }

    const json = await response.json();

    if (json.code !== 0) {
      return Response.json(
        { error: `Erreur 17TRACK: ${json.message || "Impossible de récupérer les informations."}` },
        { status: 502 }
      );
    }

    const trackInfo = json.data?.accepted?.[0]?.track_info;
    
    if (!trackInfo || !trackInfo.tracking) {
      // Si le colis vient d'être enregistré, 17TRACK peut prendre un peu de temps pour interroger le transporteur
      return Response.json(
        { error: "Le colis est en cours de recherche dans le réseau mondial. Veuillez réessayer dans quelques minutes." },
        { status: 202 }
      );
    }

    const tracking = trackInfo.tracking;

    // Mapping des statuts (17TRACK utilise des codes ou des chaînes)
    let status: TrackingData['status'] = 'Pending';
    const shippingStatus = trackInfo.latest_status?.status || '';
    if (shippingStatus === 'Delivered') status = 'Delivered';
    else if (['InTransit', 'Transit', 'PickUp', 'Undelivered'].includes(shippingStatus)) status = 'In Transit';
    else if (['Exception', 'Alert', 'Expired', 'Returned'].includes(shippingStatus)) status = 'Exception';

    // Extraire les événements du premier provider trouvé (souvent le provider principal)
    const provider = tracking.providers?.[0];
    const carrierName = provider?.provider?.name || 'Transporteur détecté automatiquement';
    const rawEvents = provider?.events || [];

    const events: TrackingEvent[] = [];
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    for (const event of rawEvents) {
      const locationString = event.location;
      let coordinates: [number, number] | undefined = undefined;

      const query = enrichLocationQuery(locationString || '', event.description || '', carrierName);

      // Géocodage si on a une requête valide
      if (query && mapboxToken) {
        try {
          const geoRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.features && geoData.features.length > 0) {
              coordinates = geoData.features[0].center as [number, number];
            }
          }
        } catch (e) {
          console.error("Erreur de géocodage pour", query, e);
        }
      }

      events.push({
        date: event.time_iso,
        location: locationString || "En transit",
        description: event.description || "Mise à jour du statut",
        coordinates
      });
    }

    const result: TrackingData = {
      trackingNumber,
      carrier: carrierName,
      status,
      events
    };

    return Response.json(result);
  } catch (error) {
    console.error('Erreur dans /api/track:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}
