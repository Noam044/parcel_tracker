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

// Dictionnaire des codes UN/LOCODE courants vers des noms de villes géocodables
const UNLOCODE_MAP: Record<string, string> = {
  // Chine
  'CNCAND': 'Guangzhou Baiyun Airport, China',
  'CNCANA': 'Guangzhou, China',
  'CNCAN': 'Guangzhou, China',
  'CNSHA': 'Shanghai, China',
  'CNSHK': 'Shekou, Shenzhen, China',
  'CNSZX': 'Shenzhen, China',
  'CNPEK': 'Beijing, China',
  'CNTAO': 'Qingdao, China',
  'CNNKG': 'Nanjing, China',
  'CNHGH': 'Hangzhou, China',
  'CNCKG': 'Chongqing, China',
  'CNXMN': 'Xiamen, China',
  'CNWUH': 'Wuhan, China',
  'CNDLC': 'Dalian, China',
  'CNTSN': 'Tianjin, China',
  'CNCTU': 'Chengdu, China',
  'CNKMG': 'Kunming, China',
  'CNCSX': 'Changsha, China',
  'CNZHA': 'Zhanjiang, China',
  'CNFOC': 'Fuzhou, China',
  'CNNNG': 'Nanning, China',
  'CNSWA': 'Shantou, China',
  // Corée du Sud
  'KRSEL': 'Seoul, South Korea',
  'KRICN': 'Incheon, South Korea',
  'KRPUS': 'Busan, South Korea',
  'KRTAE': 'Daegu, South Korea',
  'KRCJJ': 'Jeju, South Korea',
  'KRKWJ': 'Gwangju, South Korea',
  // Japon
  'JPNRT': 'Narita Airport, Japan',
  'JPTYO': 'Tokyo, Japan',
  'JPOSA': 'Osaka, Japan',
  'JPKIX': 'Kansai Airport, Japan',
  'JPNGO': 'Nagoya, Japan',
  'JPFUK': 'Fukuoka, Japan',
  // États-Unis
  'USLAX': 'Los Angeles, United States',
  'USJFK': 'JFK Airport, New York, United States',
  'USSFO': 'San Francisco, United States',
  'USORD': 'Chicago, United States',
  // Europe
  'FRPAR': 'Paris, France',
  'FRCDG': 'Charles de Gaulle Airport, France',
  'DEHAM': 'Hamburg, Germany',
  'DEFRA': 'Frankfurt, Germany',
  'GBLON': 'London, United Kingdom',
  'GBLHR': 'Heathrow Airport, United Kingdom',
  'NLRTM': 'Rotterdam, Netherlands',
};

// Préfixes de codes postaux chinois → villes
const CN_POSTAL_PREFIX: Record<string, string> = {
  '100': 'Beijing, China',
  '200': 'Shanghai, China',
  '300': 'Tianjin, China',
  '310': 'Hangzhou, China',
  '330': 'Nanchang, China',
  '350': 'Fuzhou, China',
  '361': 'Xiamen, China',
  '400': 'Chongqing, China',
  '410': 'Changsha, China',
  '430': 'Wuhan, China',
  '450': 'Zhengzhou, China',
  '510': 'Guangzhou, China',
  '516': 'Huizhou, China',
  '518': 'Shenzhen, China',
  '530': 'Nanning, China',
  '550': 'Guiyang, China',
  '570': 'Haikou, China',
  '610': 'Chengdu, China',
  '650': 'Kunming, China',
  '710': 'Xi\'an, China',
  '730': 'Lanzhou, China',
  '810': 'Xining, China',
};

/**
 * Résoudre un lieu à partir des données d'événement 17TRACK.
 * Priorité : address.city > UN/LOCODE lookup > code postal chinois > texte brut
 */
function resolveLocation(
  location: string | null,
  description: string | null,
  address: { city?: string; country?: string; postal_code?: string } | null
): { displayName: string; geocodeQuery: string | null } {
  const loc = (location || '').trim();
  const city = address?.city?.trim() || '';
  const country = address?.country?.trim() || '';

  // 1. Si on a un nom de ville dans address (ex: "广州市"), l'utiliser directement
  if (city && city.length > 1) {
    const countryContext = country === 'CN' ? 'China'
      : country === 'KR' ? 'South Korea'
      : country === 'JP' ? 'Japan'
      : country === 'FR' ? 'France'
      : country === 'US' ? 'United States'
      : country === 'DE' ? 'Germany'
      : country === 'GB' ? 'United Kingdom'
      : country || '';
    
    const displayName = city;
    const geocodeQuery = countryContext ? `${city}, ${countryContext}` : city;
    return { displayName, geocodeQuery };
  }

  // 2. Si c'est un code UN/LOCODE connu, utiliser le dictionnaire
  const locUpper = loc.toUpperCase();
  if (UNLOCODE_MAP[locUpper]) {
    return { displayName: loc, geocodeQuery: UNLOCODE_MAP[locUpper] };
  }

  // 3. Si ça ressemble à un UN/LOCODE (2 lettres pays + 3-4 lettres), tenter de deviner
  if (/^[A-Z]{2}[A-Z0-9]{3,4}$/.test(locUpper)) {
    const cc = locUpper.substring(0, 2);
    const locationCode = locUpper.substring(2);
    const countryName = cc === 'CN' ? 'China'
      : cc === 'KR' ? 'South Korea'
      : cc === 'JP' ? 'Japan'
      : cc === 'FR' ? 'France'
      : cc === 'US' ? 'United States'
      : cc === 'DE' ? 'Germany'
      : cc === 'GB' ? 'United Kingdom'
      : null;
    
    if (countryName) {
      // Envoyer seulement le code de localité (sans le pays) + contexte pays
      return { displayName: loc, geocodeQuery: `${locationCode}, ${countryName}` };
    }
    // Code pays inconnu — ne pas géocoder, trop risqué
    return { displayName: loc, geocodeQuery: null };
  }

  // 4. Si c'est un code postal (que des chiffres)
  if (/^\d{5,8}$/.test(loc)) {
    // Vérifier les codes postaux chinois (6 chiffres, commençant par un préfixe connu)
    if (loc.length >= 6) {
      const prefix3 = loc.substring(0, 3);
      if (CN_POSTAL_PREFIX[prefix3]) {
        return { displayName: loc, geocodeQuery: CN_POSTAL_PREFIX[prefix3] };
      }
    }
    // Code postal inconnu — trop risqué de géocoder un nombre aléatoire
    return { displayName: loc, geocodeQuery: null };
  }

  // 5. Si la chaîne est très courte (≤ 3 chars), trop ambiguë
  if (loc.length <= 3) {
    return { displayName: loc || 'En transit', geocodeQuery: null };
  }

  // 6. Texte normal (nom de ville lisible) — géocoder tel quel
  // Si on détecte des caractères chinois, ajouter ", China" en contexte
  if (/[\u4e00-\u9fa5]/.test(loc)) {
    return { displayName: loc, geocodeQuery: `${loc}, China` };
  }
  // Si on détecte des caractères coréens, ajouter ", South Korea"
  if (/[\uAC00-\uD7AF]/.test(loc)) {
    return { displayName: loc, geocodeQuery: `${loc}, South Korea` };
  }

  return { displayName: loc, geocodeQuery: loc };
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
      return Response.json(
        { error: "Le colis est en cours de recherche dans le réseau mondial. Veuillez réessayer dans quelques minutes." },
        { status: 202 }
      );
    }

    const tracking = trackInfo.tracking;

    // Mapping des statuts
    let status: TrackingData['status'] = 'Pending';
    const shippingStatus = trackInfo.latest_status?.status || '';
    if (shippingStatus === 'Delivered') status = 'Delivered';
    else if (['InTransit', 'Transit', 'PickUp', 'Undelivered'].includes(shippingStatus)) status = 'In Transit';
    else if (['Exception', 'Alert', 'Expired', 'Returned'].includes(shippingStatus)) status = 'Exception';

    // Fusionner les événements de TOUS les providers pour avoir les meilleures données
    const providers = tracking.providers || [];
    const carrierName = providers[0]?.provider?.name || 'Transporteur détecté automatiquement';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRawEvents: any[] = [];
    for (const prov of providers) {
      for (const evt of (prov.events || [])) {
        allRawEvents.push({
          ...evt,
          _providerName: prov.provider?.name || '',
          _providerCountry: prov.provider?.country || '',
        });
      }
    }

    // Dédupliquer par time_utc (garder l'événement avec la meilleure info de localisation)
    const eventsByTime = new Map<string, typeof allRawEvents[0]>();
    for (const evt of allRawEvents) {
      const key = evt.time_utc || evt.time_iso || '';
      if (!key) continue;
      const existing = eventsByTime.get(key);
      if (!existing) {
        eventsByTime.set(key, evt);
      } else {
        // Préférer l'événement qui a une adresse.city renseignée
        const existingCity = existing.address?.city || '';
        const newCity = evt.address?.city || '';
        if (!existingCity && newCity) {
          eventsByTime.set(key, evt);
        }
      }
    }

    // Trier par date décroissante (plus récent d'abord)
    const mergedEvents = Array.from(eventsByTime.values())
      .sort((a, b) => {
        const ta = new Date(a.time_utc || a.time_iso || 0).getTime();
        const tb = new Date(b.time_utc || b.time_iso || 0).getTime();
        return tb - ta;
      });

    const events: TrackingEvent[] = [];
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Cache de géocodage pour éviter les appels dupliqués
    const geocodeCache = new Map<string, [number, number] | null>();

    for (const event of mergedEvents) {
      const { displayName, geocodeQuery } = resolveLocation(
        event.location,
        event.description,
        event.address
      );

      let coordinates: [number, number] | undefined = undefined;

      if (geocodeQuery && mapboxToken) {
        // Vérifier le cache
        if (geocodeCache.has(geocodeQuery)) {
          const cached = geocodeCache.get(geocodeQuery);
          if (cached) coordinates = cached;
        } else {
          try {
            const geoRes = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geocodeQuery)}.json?access_token=${mapboxToken}&limit=1`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.features && geoData.features.length > 0) {
                const center = geoData.features[0].center as [number, number];
                geocodeCache.set(geocodeQuery, center);
                coordinates = center;
              } else {
                geocodeCache.set(geocodeQuery, null);
              }
            }
          } catch (e) {
            console.error("Erreur de géocodage pour", geocodeQuery, e);
            geocodeCache.set(geocodeQuery, null);
          }
        }
      }

      events.push({
        date: event.time_iso,
        location: displayName || "En transit",
        description: event.description || "Mise à jour du statut",
        coordinates
      });
    }

    // Géocoder l'origine et la destination à partir de shipping_info
    const shippingInfo = trackInfo.shipping_info;
    const countryToQuery: Record<string, { label: string; query: string }> = {
      'CN': { label: 'Chine', query: 'China' },
      'KR': { label: 'Corée du Sud', query: 'Seoul, South Korea' },
      'JP': { label: 'Japon', query: 'Tokyo, Japan' },
      'FR': { label: 'France', query: 'Paris, France' },
      'US': { label: 'États-Unis', query: 'United States' },
      'DE': { label: 'Allemagne', query: 'Frankfurt, Germany' },
      'GB': { label: 'Royaume-Uni', query: 'London, United Kingdom' },
      'AU': { label: 'Australie', query: 'Sydney, Australia' },
      'CA': { label: 'Canada', query: 'Toronto, Canada' },
      'SG': { label: 'Singapour', query: 'Singapore' },
      'TH': { label: 'Thaïlande', query: 'Bangkok, Thailand' },
      'MY': { label: 'Malaisie', query: 'Kuala Lumpur, Malaysia' },
      'TW': { label: 'Taïwan', query: 'Taipei, Taiwan' },
      'HK': { label: 'Hong Kong', query: 'Hong Kong' },
      'VN': { label: 'Vietnam', query: 'Hanoi, Vietnam' },
      'PH': { label: 'Philippines', query: 'Manila, Philippines' },
      'ID': { label: 'Indonésie', query: 'Jakarta, Indonesia' },
      'NL': { label: 'Pays-Bas', query: 'Amsterdam, Netherlands' },
      'ES': { label: 'Espagne', query: 'Madrid, Spain' },
      'IT': { label: 'Italie', query: 'Rome, Italy' },
      'BR': { label: 'Brésil', query: 'São Paulo, Brazil' },
      'RU': { label: 'Russie', query: 'Moscow, Russia' },
      'IN': { label: 'Inde', query: 'New Delhi, India' },
    };

    let origin: { label: string; coordinates: [number, number] } | undefined;
    let destination: { label: string; coordinates: [number, number] } | undefined;

    if (mapboxToken) {
      // Géocoder l'origine
      const originCountry = shippingInfo?.shipper_address?.country;
      if (originCountry && countryToQuery[originCountry]) {
        const { label, query } = countryToQuery[originCountry];
        // Utiliser les coordonnées du premier événement (chronologique) si disponible, sinon géocoder
        const oldestEvent = events[events.length - 1];
        if (oldestEvent?.coordinates) {
          origin = { label, coordinates: oldestEvent.coordinates };
        } else if (!geocodeCache.has(query)) {
          try {
            const geoRes = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.features?.length > 0) {
                const center = geoData.features[0].center as [number, number];
                geocodeCache.set(query, center);
                origin = { label, coordinates: center };
              }
            }
          } catch (e) { console.error("Erreur géocodage origine:", e); }
        } else {
          const cached = geocodeCache.get(query);
          if (cached) origin = { label, coordinates: cached };
        }
      }

      // Géocoder la destination
      const destCountry = shippingInfo?.recipient_address?.country;
      if (destCountry && countryToQuery[destCountry]) {
        const { label, query } = countryToQuery[destCountry];
        if (!geocodeCache.has(query)) {
          try {
            const geoRes = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.features?.length > 0) {
                const center = geoData.features[0].center as [number, number];
                geocodeCache.set(query, center);
                destination = { label, coordinates: center };
              }
            }
          } catch (e) { console.error("Erreur géocodage destination:", e); }
        } else {
          const cached = geocodeCache.get(query);
          if (cached) destination = { label, coordinates: cached };
        }
      }
    }

    const result: TrackingData = {
      trackingNumber,
      carrier: carrierName,
      status,
      events,
      origin,
      destination,
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
