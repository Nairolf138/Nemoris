# @capsule/ui

Composants UI réutilisables et neutres métier.

## Responsabilités

- Composants de présentation.
- Design tokens et primitives d'interface.

## Frontières

- ✅ Peut être utilisé par `apps/*`.
- ⚠️ Peut consommer des types partagés si nécessaire, mais ne doit pas contenir de logique métier post-mortem.
- ❌ N'embarque pas de règles métier domaine.

## API publique

Exporter les composants via `src/index.ts`.
