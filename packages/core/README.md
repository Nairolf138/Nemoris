# @capsule/core

Couche métier et technique transverse de Capsule.

## Responsabilités

- Modèles de domaine (ex: entités, types métiers).
- Crypto, signatures, export/import (à implémenter dans ce package).
- Fonctions pures et règles métier post-mortem.

## Frontières

- ✅ Peut être consommé par `apps/*` et d'autres `packages/*`.
- ❌ Ne dépend jamais de `apps/*`.

## API publique

Exporter uniquement via `src/index.ts`.
