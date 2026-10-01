import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Les regroupements par jour dépendent du fuseau : on le fixe pour que les tests donnent le même
// résultat en local et en CI. Posé avant le démarrage des workers, qui héritent de l'environnement.
process.env.TZ = 'UTC';

// Tests unitaires de la logique serveur (lib/ et route API) : environnement Node, sans DOM.
// Les composants React ne sont pas couverts ici ; l'alias « @/ » reprend celui de tsconfig.json.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL('./', import.meta.url)) }],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Aucun test ne doit dépendre des clés réelles : chaque test pose lui-même ce dont il a besoin
    env: {
      TRACK17_API_KEY: '',
      MAPBOX_GEOCODING_TOKEN: '',
      NEXT_PUBLIC_MAPBOX_TOKEN: '',
    },
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
