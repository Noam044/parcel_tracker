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

| Variable                       | Rôle                                                                        |
| ------------------------------ | --------------------------------------------------------------------------- |
| `TRACK17_API_KEY`              | Clé API 17TRACK (utilisée côté serveur uniquement)                          |
| `NEXT_PUBLIC_MAPBOX_TOKEN`     | Token public Mapbox (carte côté client, et géocodage à défaut du suivant)   |
| `MAPBOX_GEOCODING_TOKEN`       | Facultatif : token Mapbox secret réservé au géocodage côté serveur          |
| `TRACK17_DAILY_REGISTER_LIMIT` | Nouveaux numéros enregistrés par jour, tous visiteurs confondus (défaut 5)  |
| `TRACK17_QUOTA_RESERVE`        | Unités de quota 17TRACK gardées en réserve (défaut 20)                      |

## Protection des quotas

Chaque numéro que 17TRACK ne connaît pas encore est enregistré (`register`), ce qui coûte une unité de
quota ; consulter un numéro déjà enregistré (`gettrackinfo`) est gratuit. La route `GET /api/track/{numéro}` limite donc :

- **les nouveaux enregistrements** : avant chacun, le quota est vérifié auprès de 17TRACK (`getquota`) et
  l'enregistrement est refusé si la limite du jour ou la réserve est atteinte (en cas de doute, il est refusé) ;
- **le débit par IP** : 30 requêtes par minute et 3 enregistrements par heure (en mémoire, par instance) ;
- **les appels répétés** : un suivi prêt est gardé 3 minutes par le CDN de Netlify (sans réveiller la fonction
  serveur) et en mémoire, et les recherches simultanées d'un même numéro partagent le même appel ;
- **les requêtes d'autres sites** : refusées (en-tête `x-parcel-tracker` exigé, `Sec-Fetch-Site`/`Origin` vérifiés).

Deux réglages à faire hors du code :

- Dans le tableau de bord 17TRACK, régler la limite quotidienne du compte (`max_track_daily`) : c'est la
  seule limite que 17TRACK applique lui-même, quoi qu'il arrive côté site.
- Dans le tableau de bord Mapbox, restreindre `NEXT_PUBLIC_MAPBOX_TOKEN` aux URL du site (il est lisible
  par tous dans le navigateur) et fournir `MAPBOX_GEOCODING_TOKEN`, sans restriction d'URL, pour le géocodage.

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
  api/track/[number]/  Route GET /api/track/{numéro} (validation, protections, cache, orchestration)
  page.tsx             Page d'accueil
components/            Formulaire, résumé, timeline, carte
lib/
  track17.ts           Client 17TRACK, fusion des événements, statuts
  quota.ts             Garde-fou du quota 17TRACK avant chaque enregistrement
  rate-limit.ts        Limiteur de débit par IP
  map-view.ts          Cadrage partagé par l'aperçu statique et la carte interactive
  tracking.ts          Transformation des données 17TRACK → données de l'interface
  locations.ts         Résolution des lieux (UN/LOCODE, codes postaux, villes)
  geocode.ts           Géocodage Mapbox parallélisé avec cache
  countries.ts         Table des pays
  types.ts             Types partagés client/serveur
```
