# Incident runbook (incluant rollback & restauration)

## 1. Détection et qualification

1. Identifier la source d'alerte (monitoring, logs, support).
2. Classer la sévérité:
   - Sev1: indisponibilité majeure / perte de données probable.
   - Sev2: fonctionnalité MVP critique dégradée.
   - Sev3: dégradation mineure.
3. Ouvrir un canal incident + ticket horodaté.

## 2. Stabilisation immédiate

- Geler les déploiements en cours.
- Basculer en mode dégradé si disponible.
- Isoler le périmètre impacté (API, export, observabilité, auth).

## 3. Procédure de rollback

Préconditions:
- Version précédente connue et artefacts disponibles.
- Validation owner on-call (Produit + Tech pour Sev1/Sev2).

Étapes:
1. Identifier la dernière version stable (`vX.Y.Z`).
2. Déployer l'artefact précédent.
3. Vérifier smoke tests: auth, CRUD, export JSON/PDF, dashboard observabilité.
4. Communiquer l'état (rollback fait / impact restant).

## 4. Procédure de restauration de données

Quand appliquer: corruption/suppression confirmée.

Pré-requis opératoires:
- Arrêter les écritures API (maintenance ou scale-to-zero).
- Positionner les backends en SQLite pour toutes les briques concernées.

```bash
export CAPSULE_AUTH_STORE_BACKEND=sqlite
export CAPSULE_DATA_STORE_BACKEND=sqlite
export CAPSULE_EXPORT_STORE_BACKEND=sqlite
export CAPSULE_AUTH_DB_PATH=./capsule-auth.sqlite
export CAPSULE_DATA_DB_PATH=./capsule-data.sqlite
export CAPSULE_EXPORT_DB_PATH=./capsule-export.sqlite
```

Sauvegarde (local/CI):

```bash
node scripts/persistence-backup.mjs backup --dir ./.backups/incident-$(date +%Y%m%d-%H%M%S)
```

Restauration (local/CI):

```bash
node scripts/persistence-backup.mjs restore --dir ./.backups/incident-YYYYMMDD-HHMMSS
```

Validation post-restauration:

```bash
npm run -w @capsule/api test
```

## 5. Validation de reprise

- KPI techniques revenus dans les seuils.
- Tests critiques passants.
- Confirmation de non-régression produit sur le scope MVP.

## 6. Post-mortem (≤ 48h)

- Chronologie complète.
- Cause racine.
- Actions correctives/préventives priorisées.
- Mise à jour du runbook si un gap process est identifié.
