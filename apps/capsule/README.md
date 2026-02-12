# @capsule/app

Application exposée (surface produit) de Capsule.

## Responsabilités

- Composition des flux UX et des cas d'usage.
- Orchestration des dépendances `@capsule/core` et `@capsule/ui`.

## Frontières

- ✅ Peut dépendre de `@capsule/core` et `@capsule/ui`.
- ❌ Ne doit pas être importé par `packages/*`.

## API publique

Application finale (pas de contrat de réutilisation inter-package).
