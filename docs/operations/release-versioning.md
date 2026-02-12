# Build artifacts & stratégie de versionning

## Objectif

Standardiser la production d'artefacts et la publication de version avant un déploiement `staging` ou `prod`.

## Artifacts de build

Commande:

```bash
npm run build:artifacts
```

Effets:
- Génère `artifacts/build/*.tgz` pour les applications et packages critiques.
- Génère `artifacts/manifest.json` (horodatage, commit, fichiers).

## Stratégie de versionning

Nemoris suit **SemVer**:
- `major`: rupture de contrat API/export ou incompatibilité.
- `minor`: ajout fonctionnel rétrocompatible.
- `patch`: correctif sans rupture.

Planification:

```bash
npm run version:plan -- patch
npm run version:plan -- minor
npm run version:plan -- major
```

Le script affiche la version suivante, le tag Git attendu (`vX.Y.Z`) et les règles de bump.

## Process release recommandé

1. Valider CI verte (typecheck/tests/docs contractuelles).
2. Produire les artefacts.
3. Déterminer le bump SemVer.
4. Tagger (`git tag vX.Y.Z`) puis publier selon l'environnement cible.
5. Archiver `artifacts/manifest.json` comme trace de build.
