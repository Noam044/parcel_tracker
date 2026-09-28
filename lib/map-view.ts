import type { Theme } from './theme';
import type { Coordinates, TrackingEvent } from './types';

/**
 * Cadrage de la carte, partagé par l'aperçu statique (API Static Images de Mapbox) et la carte
 * interactive (mapbox-gl) : les deux affichent exactement la même vue, si bien que passer de l'un à
 * l'autre ne fait ni sauter la carte ni recharger d'autres tuiles.
 */

// Les styles Mapbox utilisent des tuiles de 512 px : au zoom z, le monde fait 512 × 2^z pixels de large
// en projection Web Mercator, pour l'image statique comme pour mapbox-gl.
const TILE_SIZE = 512;
const MAX_LATITUDE = 85.0511;

export const MAP_PADDING = 70;
const MAX_ZOOM = 10;
const SINGLE_POINT_ZOOM = 8;

// Mapbox ne lit pas les variables CSS : les couleurs du tracé reprennent --color-customs et
// --color-ink-soft de chaque thème (voir globals.css).
export const MAP_THEMES = {
  light: { style: 'mapbox/light-v11', route: '#00794c', remaining: '#4b5561' },
  dark: { style: 'mapbox/dark-v11', route: '#34c88a', remaining: '#97a3ae' },
} satisfies Record<Theme, { style: string; route: string; remaining: string }>;

export interface MapView {
  center: Coordinates;
  zoom: number;
}

/** Position dans le monde en projection Web Mercator, de 0 à 1 sur chaque axe. */
function mercator([lng, lat]: Coordinates): [number, number] {
  const sin = Math.sin((Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat)) * Math.PI) / 180);
  return [(lng + 180) / 360, 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)];
}

function fromMercator([x, y]: [number, number]): Coordinates {
  return [x * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI];
}

/** Coordonnées dans l'ordre chronologique, sans doublons consécutifs. */
export function chronologicalPath(events: TrackingEvent[]): Coordinates[] {
  const path: Coordinates[] = [];
  for (const { coordinates } of [...events].reverse()) {
    if (!coordinates) continue;
    const last = path[path.length - 1];
    if (!last || last[0] !== coordinates[0] || last[1] !== coordinates[1]) path.push(coordinates);
  }
  return path;
}

/**
 * Vue qui montre tous les points avec une marge (équivalent de map.fitBounds). Centre et zoom sont
 * arrondis : l'URL de l'image statique reste courte et la carte interactive reprend les mêmes valeurs.
 */
export function fitView(points: Coordinates[], width: number, height: number): MapView {
  if (points.length === 1) return { center: points[0], zoom: SINGLE_POINT_ZOOM };

  const projected = points.map(mercator);
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];

  const fitWidth = Math.max(width - 2 * MAP_PADDING, 1) / (Math.max(maxX - minX, 1e-9) * TILE_SIZE);
  const fitHeight = Math.max(height - 2 * MAP_PADDING, 1) / (Math.max(maxY - minY, 1e-9) * TILE_SIZE);
  const zoom = Math.max(0, Math.min(MAX_ZOOM, Math.log2(Math.min(fitWidth, fitHeight))));
  const [lng, lat] = fromMercator([(minX + maxX) / 2, (minY + maxY) / 2]);

  return { center: [round(lng, 5), round(lat, 5)], zoom: round(zoom, 2) };
}

/** Position en pixels d'un point dans une image de `width` × `height` centrée sur la vue. */
export function toPixel(point: Coordinates, view: MapView, width: number, height: number): [number, number] {
  const scale = TILE_SIZE * 2 ** view.zoom;
  const [centerX, centerY] = mercator(view.center);
  const [x, y] = mercator(point);
  return [width / 2 + (x - centerX) * scale, height / 2 + (y - centerY) * scale];
}

/**
 * Image de fond de carte (sans tracé : il est dessiné par-dessus en SVG, aux couleurs du site), en double
 * résolution seulement pour les écrans qui en profitent : sur un écran standard, elle pèserait trois fois plus
 * pour rien. (Le paramètre format=webp de la documentation est ignoré sur cet endpoint : PNG dans tous les cas.)
 */
export function staticMapUrl(
  theme: Theme,
  view: MapView,
  { width, height, retina }: { width: number; height: number; retina: boolean },
  token: string
): string {
  const [lng, lat] = view.center;
  const scale = retina ? '@2x' : '';
  return `https://api.mapbox.com/styles/v1/${MAP_THEMES[theme].style}/static/${lng},${lat},${view.zoom},0/${width}x${height}${scale}?access_token=${token}`;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
