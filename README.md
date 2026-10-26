# Console IoT – supervision d'équipements en temps réel

Application fullstack TypeScript : un tableau de bord qui affiche sur une carte des équipements connectés (capteurs, balises, relais) et leurs mesures en temps réel.

![Aperçu](docs/apercu.png)

**Démo en ligne** : _(lien Vercel à ajouter)_ · compte de test `admin@demo.fr` / `demo1234`

## Stack

| Couche | Technologies |
|---|---|
| Front | Next.js 15 (App Router), React 19, TypeScript, Leaflet / OpenStreetMap |
| API | NestJS 11, REST, WebSockets (Socket.IO), JWT, class-validator, Helmet |
| Données | PostgreSQL, Prisma (schéma, migrations, seed) |
| Infra | Docker, docker-compose, Google Cloud Run (API), Vercel (front), Neon (base) |

## Fonctionnalités

- Connexion par JWT, rôles `ADMIN`, `OPERATOR`, `VIEWER`
- Liste des équipements (API REST protégée)
- Mesures simulées poussées par WebSocket toutes les 3 s (connexion authentifiée par le token)
- Carte des équipements, couleur selon l'état

## Lancer en local

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate      # crée les tables
npm run db:seed         # comptes de démo + 4 équipements
npm run dev:api         # http://localhost:4000
npm run dev:web         # http://localhost:3000
```

Ou tout en conteneurs : `docker compose up --build` (puis le seed : `docker compose exec api npx ts-node prisma/seed.ts`, ou depuis l'hôte avec `npm run db:seed`).

## Déploiement (gratuit)

1. **Base Neon** : créer un projet sur neon.tech, copier l'URL de connexion (`...?sslmode=require`).
   Depuis le poste : `DATABASE_URL=<url neon> npm run db:seed -w api` après le premier déploiement (les migrations tournent au démarrage de l'API).
2. **API sur Cloud Run** :
   ```bash
   gcloud run deploy iot-api --source apps/api --region europe-west1 \
     --allow-unauthenticated --max-instances 1 --timeout 3600 \
     --set-env-vars DATABASE_URL=<url neon>,JWT_SECRET=<secret>,WEB_ORIGIN=https://<projet>.vercel.app
   ```
   `--max-instances 1` limite le coût (et évite d'avoir besoin de sessions « collantes » pour Socket.IO). Ajouter un budget avec alertes dans la facturation GCP.
3. **Front sur Vercel** : importer le dépôt GitHub, dossier racine `apps/web`, variable `NEXT_PUBLIC_API_URL=<url cloud run>`.

## Pistes suivantes

- Historique des mesures et graphiques par équipement
- Gestion des utilisateurs (écran admin, droits par rôle)
- Maquettes Figma des écrans
- Tests (Jest côté API, Playwright côté front) et CI GitHub Actions
- Sécurité : scan OWASP ZAP, limitation de débit, journal d'audit
