# Build artifacts & stratégie de versionning

## Objectif

Standardiser la planification de version, la production d'artefacts et le tagging Git avant un déploiement `staging` ou `prod`.

## Prérequis

- Branche à jour et CI verte.
- Dépendances installées:

```bash
npm ci
```

## 1) Plan de version (SemVer)

Nemoris suit **SemVer**:
- `major`: rupture de contrat API/export ou incompatibilité.
- `minor`: ajout fonctionnel rétrocompatible.
- `patch`: correctif sans rupture.

Calcul de la prochaine version:

```bash
npm run version:plan -- patch
npm run version:plan -- minor
npm run version:plan -- major
```

Le script affiche la version suivante, le tag attendu (`vX.Y.Z`) et les règles de bump.

## 2) Build des artefacts

Commande:

```bash
npm run build:artifacts
```

Effets attendus:
- Génère les archives `artifacts/build/*.tgz` pour les applications/packages critiques.
- Génère `artifacts/manifest.json` (horodatage, commit, fichiers).

Vérification locale explicite:

```bash
test -f artifacts/manifest.json
```

## 3) Tag de release

Créer et pousser le tag SemVer:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 4) Pipeline GitHub Actions associé

Le workflow `.github/workflows/release.yml` est déclenché à chaque push de tag `v*`.

Séquence exécutée automatiquement:
1. `actions/checkout@v4`
2. `npm ci`
3. `npm run build:artifacts`
4. Vérification de présence de `artifacts/manifest.json`
5. Publication des fichiers `artifacts/*` via `actions/upload-artifact@v4`

## Enchaînement complet recommandé

1. Vérifier la CI et choisir le bump (`patch|minor|major`) avec `npm run version:plan -- <bump>`.
2. Produire les artefacts avec `npm run build:artifacts`.
3. Valider la présence de `artifacts/manifest.json`.
4. Créer/pousser le tag `vX.Y.Z`.
5. Contrôler dans GitHub Actions que le workflow release publie bien les artefacts.
