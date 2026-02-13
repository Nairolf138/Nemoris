# Lot 1 — Cartographie routes/services CRUD

## Périmètre API (`apps/capsule-api/src/`)

La classe `CapsuleApiApp` route les flux CRUD de données dans `handleDataRoute` via `/data/:collection` et `/data/:collection/:id`.

| Entité | Création | Édition | Suppression / Archivage | Notes |
| --- | --- | --- | --- | --- |
| memories | `POST /data/memories` | `PATCH /data/memories/:id` | `DELETE /data/memories/:id` | Suppression logique métier via `deleteMemory` (cascade liens). |
| beliefs | `POST /data/beliefs` | `PATCH /data/beliefs/:id` | `DELETE /data/beliefs/:id` | Suppression métier via `deleteBelief`. |
| lessons | `POST /data/lessons` | `PATCH /data/lessons/:id` | `DELETE /data/lessons/:id` | Suppression métier via `deleteLesson`. |
| value_profiles | `POST /data/value_profiles` | `PATCH /data/value_profiles/:id` | `DELETE /data/value_profiles/:id` | Suppression métier via `deleteValueProfile`. |
| legacy_messages | `POST /data/legacy_messages` | `PATCH /data/legacy_messages/:id` | `DELETE /data/legacy_messages/:id` | Cycle de vie complémentaire: `/legacy-messages/:id/{arm,trigger,revoke,deliver}`. |
| beneficiaries | `POST /data/beneficiaries` | `PATCH /data/beneficiaries/:id` | `DELETE /data/beneficiaries/:id` | Suppression directe repository. |
| narrative_nodes | `POST /data/narrative_nodes` | `PATCH /data/narrative_nodes/:id` | `DELETE /data/narrative_nodes/:id` | Validation ownership des références amont. |
| narrative_edges | `POST /data/narrative_edges` | `PATCH /data/narrative_edges/:id` | `DELETE /data/narrative_edges/:id` | Validation anti-boucle + ownership des références. |

## Périmètre services front (`apps/capsule/src/services/`)

| Service | Entités couvertes | Opérations |
| --- | --- | --- |
| `CapsuleCrudService` | memories, beliefs, lessons, valueProfiles, legacyMessages | `create`, `update`, `delete`, `loadAllCrudScreens` |
| `TimelineService` | narrativeNodes, narrativeEdges, memories | chargement (`listCollection`) + création de lien manuel (`createCollectionItem` sur `narrativeEdges`) |
| `CapsuleExportService` | exports | création export + suivi statut (hors CRUD data core) |
| `FrontAuthService` | auth/session | register/login/logout/refresh (hors CRUD data core) |

## Confirmation création/édition/suppression (ou archivage)

- Les modules data exposent une logique **création + édition + suppression** (pas de route d'archivage dédiée dans ce périmètre Lot 1).
- Le module legacy message combine CRUD data (`/data/legacy_messages`) + orchestration métier (`arm/trigger/revoke/deliver`).
- Les tests d'intégration couvrent désormais explicitement les régressions CRUD sur toutes les entités data, y compris `narrative_edges`.
