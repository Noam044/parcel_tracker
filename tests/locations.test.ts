import { describe, expect, it } from 'vitest';
import { resolveLocation, splitPlaceAndMessage } from '@/lib/locations';

describe('splitPlaceAndMessage', () => {
  it('sépare « LIEU, message » quand la description répète le champ lieu (Chronopost)', () => {
    expect(
      splitPlaceAndMessage('CHILLY MAZARIN, Colis en cours d’acheminement', 'CHILLY MAZARIN, Colis en cours d’acheminement')
    ).toEqual({ place: 'CHILLY MAZARIN', message: 'Colis en cours d’acheminement' });
  });

  it('laisse les champs intacts sinon', () => {
    expect(splitPlaceAndMessage('Paris, France', 'Arrivé au centre de tri')).toEqual({
      place: 'Paris, France',
      message: 'Arrivé au centre de tri',
    });
    expect(splitPlaceAndMessage(null, undefined)).toEqual({ place: '', message: '' });
  });
});

describe('resolveLocation', () => {
  it('privilégie la ville fournie par 17TRACK, avec le pays pour le géocodage', () => {
    expect(resolveLocation('CNCAN', { city: 'Guangzhou', country: 'CN' })).toEqual({
      displayName: 'Guangzhou',
      geocodeTarget: [{ query: 'Guangzhou', country: 'CN' }, { query: 'Guangzhou, China' }],
    });
  });

  it('renvoie le code pays brut, sans rien à géocoder, quand seul le pays est connu', () => {
    expect(resolveLocation('FR', null)).toEqual({ displayName: '', countryCode: 'FR', geocodeTarget: null });
    expect(resolveLocation('', { country: 'DE' })).toEqual({ displayName: '', countryCode: 'DE', geocodeTarget: null });
  });

  it('traduit un UN/LOCODE connu en lieu géocodable', () => {
    expect(resolveLocation('frcdg', null)).toEqual({
      displayName: 'frcdg',
      geocodeTarget: [{ query: 'Charles de Gaulle Airport, France', country: undefined }],
    });
  });

  it('ne géocode pas un code ou un texte trop ambigu', () => {
    expect(resolveLocation('75001', null).geocodeTarget).toBeNull();
    expect(resolveLocation('HUB', null).geocodeTarget).toBeNull();
  });

  it('géocode un nom lisible d’abord dans le pays de l’événement, puis dans ceux du colis', () => {
    const { geocodeTarget } = resolveLocation('MA-PO', { country: 'KR' }, { parcelCountries: ['KR', 'FR'] });
    expect(geocodeTarget).toEqual([
      { query: 'MA-PO', country: 'KR' },
      { query: 'MAPO', country: 'KR' },
      { query: 'MA-PO', country: 'KR,FR' },
      { query: 'MAPO', country: 'KR,FR' },
    ]);
  });

  it('ajoute le pays aux noms en écriture chinoise ou coréenne', () => {
    expect(resolveLocation('广州市白云区', null).geocodeTarget).toEqual([{ query: '广州市白云区, China', country: 'CN' }]);
    expect(resolveLocation('서울특별시', null).geocodeTarget).toEqual([{ query: '서울특별시, South Korea', country: 'KR' }]);
  });
});
