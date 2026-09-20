# Parcel Tracker

Application web de suivi de colis : saisissez un numéro de suivi pour voir la chronologie des étapes,
l'arrivée estimée et l'itinéraire sur une carte.

- **Next.js** (App Router) + React + Tailwind CSS
- **[17TRACK](https://api.17track.net/)** pour les informations de suivi
- **[Mapbox](https://www.mapbox.com/)** pour la carte et le géocodage des lieux

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les deux clés
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

| Variable                   | Rôle                                                 |
| -------------------------- | ---------------------------------------------------- |
| `17TRACK_API_KEY`          | Clé API 17TRACK (utilisée côté serveur uniquement)   |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token public Mapbox (carte côté client + géocodage)  |

## Scripts

| Commande            | Description                    |
| ------------------- | ------------------------------ |
| `npm run dev`       | Serveur de développement       |
| `npm run build`     | Build de production            |
| `npm run start`     | Lance le build de production   |
| `npm run lint`      | ESLint                         |
| `npm run typecheck` | Vérification des types         |

## Structure

```
app/
  api/track/route.ts   Route POST /api/track (validation + orchestration)
  page.tsx             Page d'accueil
components/            Formulaire, résumé, timeline, carte
lib/
  track17.ts           Client 17TRACK, fusion des événements, statuts
  tracking.ts          Transformation des données 17TRACK → données de l'interface
  locations.ts         Résolution des lieux (UN/LOCODE, codes postaux, villes)
  geocode.ts           Géocodage Mapbox parallélisé avec cache
  countries.ts         Table des pays
  types.ts             Types partagés client/serveur
```
