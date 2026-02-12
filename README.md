# Nemoris

**Nemoris** est un produit de capsule numérique centré sur la structuration d’un héritage cognitif personnel.
Le périmètre MVP est défini de manière canonique dans `docs/product-capsule/scope-fonctionnel.md`.

## Proposition de valeur

Nemoris aide un utilisateur à structurer ses contenus clés pour les rendre clairs, reliés et exportables :
- centraliser des éléments de mémoire et de réflexion,
- relier convictions, leçons et valeurs,
- exporter un corpus lisible et portable.

## Périmètre MVP (shipping)

Référence canonique : `docs/product-capsule/scope-fonctionnel.md`.

- Authentification : inscription, connexion, déconnexion, session basique.
- Modules de contenu : mémoire, convictions, leçons, valeurs.
- Liens manuels inter-objets.
- Exports PDF et JSON.

## Hors périmètre MVP

- Recherche avancée (sémantique/filtres complexes).
- IA complexe conversationnelle/générative.
- Workflows juridiques post-mortem complets.
- Transmission post-mortem automatisée.
- Graphe narratif interactif avancé.

Vision long terme (séparée) : `docs/vision-cognitive/VISION.md`.

## Documents de référence

- `docs/product-capsule/scope-fonctionnel.md` — **source canonique du scope MVP**.
- `docs/mvp-scope.md` — synthèse de périmètre alignée.
- `docs/architecture-mvp.md` — architecture cible strictement dans le scope MVP.
- `docs/product-capsule/ROADMAP.md` — roadmap produit alignée sur le scope canonique.
- `docs/product-capsule/roadmap-shipping.md` — lots de delivery et gate de scope.
- `docs/operations/go-no-go-checklist.md` — checklist Go/No-Go alignée roadmap shipping.
- `docs/operations/incident-runbook.md` — runbook incident, rollback et restauration.
- `docs/operations/env-secrets-management.md` — configuration par environnement et secrets.
- `docs/operations/release-versioning.md` — build artifacts et stratégie SemVer.

## Tooling release

- `npm run build:artifacts` — génère les artefacts versionnables + manifeste.
- `npm run version:plan -- <major|minor|patch>` — propose la prochaine version SemVer.
- `npm run docs:contract:check` — valide les documents contractuels minimum.

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Réalignement de la documentation sur `docs/product-capsule/scope-fonctionnel.md` comme source unique. |
