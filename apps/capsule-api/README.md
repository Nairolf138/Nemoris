# @capsule/api

API HTTP de Capsule, basée sur `CapsuleApiApp`.

## Prérequis

- Node.js 20+
- Dépendances installées à la racine (`npm install`)

## Lancement local

Depuis la racine du monorepo:

```bash
npm run -w @capsule/api start:dev
```

Ce script compile TypeScript puis lance le serveur Node avec `--watch` sur `dist/server.js`.

Par défaut, l'API écoute sur le port `3000`. Vous pouvez le modifier:

```bash
PORT=4000 npm run -w @capsule/api start:dev
```

## Lancement production

```bash
npm run -w @capsule/api start
```

Ce script compile puis exécute `dist/server.js`.

## Endpoints d'infrastructure

- `GET /health` : check de liveness, retourne `200 {"status":"ok"}`.
- `GET /ready` : check de readiness, retourne:
  - `200 {"status":"ready"}` quand le serveur accepte des requêtes,
  - `503 {"status":"stopping"}` pendant l'arrêt gracieux.

## Arrêt propre

Le serveur intercepte `SIGINT` et `SIGTERM`:

- passe en mode *draining* (`/ready` renvoie `503`),
- n'accepte plus de nouvelles requêtes applicatives,
- ferme proprement le serveur HTTP,
- force la sortie après 10s si nécessaire.

## Requêtes applicatives

Le serveur:

- normalise les headers entrants,
- valide query/body au niveau HTTP,
- parse le body JSON (`application/json`),
- mappe vers `RequestLike`,
- délègue à `CapsuleApiApp.handle`.
