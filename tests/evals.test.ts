import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RawTrackInfo } from '@/lib/track17';
import { buildTrackingData } from '@/lib/tracking';

/**
 * Cas de référence de la transformation 17TRACK → données affichées (lib/tracking.ts:buildTrackingData).
 *
 * Chaque cas de evals/track17/ associe une réponse 17TRACK synthétique (<cas>.input.json) au résultat
 * attendu (<cas>.expected.json). Pour ajouter un cas : écrire l'entrée, lancer
 * `UPDATE_EVALS=1 npm test -- evals`, puis relire le fichier attendu généré avant de le commiter.
 *
 * Aucun token Mapbox n'est défini pendant les tests : seules les coordonnées fournies par 17TRACK sont
 * utilisées, sans géocodage.
 */

const DIR = join(import.meta.dirname, '..', 'evals', 'track17');
const UPDATE = process.env.UPDATE_EVALS === '1';

interface EvalInput {
  description: string;
  trackingNumber: string;
  trackInfo: RawTrackInfo;
}

const cases = readdirSync(DIR)
  .filter((file) => file.endsWith('.input.json'))
  .map((file) => file.replace(/\.input\.json$/, ''));

describe('evals 17TRACK → TrackingData', () => {
  it('contient des cas', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases)('%s', async (name) => {
    const input = JSON.parse(readFileSync(join(DIR, `${name}.input.json`), 'utf8')) as EvalInput;
    // Aller-retour JSON : compare exactement ce que la route renvoie au navigateur (sans les undefined)
    const actual = JSON.parse(JSON.stringify(await buildTrackingData(input.trackingNumber, input.trackInfo)));
    const expectedPath = join(DIR, `${name}.expected.json`);

    if (UPDATE) writeFileSync(expectedPath, `${JSON.stringify(actual, null, 2)}\n`);
    expect(existsSync(expectedPath), `${name}.expected.json manquant : lancer UPDATE_EVALS=1 npm test`).toBe(true);
    expect(actual).toEqual(JSON.parse(readFileSync(expectedPath, 'utf8')));
  });
});
