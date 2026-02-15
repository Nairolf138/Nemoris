# Nemoris

**Nemoris = capsule numérique à transmettre à ses proches.**

Le produit aide à structurer, sécuriser et rendre transmissible ce qui compte (souvenirs, convictions, leçons, valeurs), avec un périmètre MVP défini de manière canonique dans `docs/product-capsule/scope-fonctionnel.md`.

## Proposition de valeur

Nemoris propose une **capsule familiale transmissible** : un espace unique pour préparer, à l’avance, ce que vos proches devront recevoir au bon moment.

Promesse cœur produit :
- rédiger des **messages** personnels,
- déposer des **documents** utiles,
- expliciter des **instructions** concrètes,
- désigner les **bénéficiaires** concernés,
- conserver un ensemble clair, exportable et révisable.

## Fonctionnalités — Disponibilité

Référence canonique : `docs/product-capsule/scope-fonctionnel.md`.

- **[Disponible maintenant]** Authentification : inscription, connexion, déconnexion, session basique.
- **[Disponible maintenant]** Capsule familiale : messages transmissibles, documents de référence et instructions destinées aux proches.
- **[Disponible maintenant]** Bénéficiaires : création, association des contenus et pilotage des destinataires.
- **[Disponible maintenant]** Modules de structuration (mémoire, convictions, leçons, valeurs) pour enrichir la capsule.
- **[Disponible maintenant]** Liens manuels inter-objets pour relier les contenus.
- **[Disponible maintenant]** Exports PDF et JSON.

## Avancé / plus tard

- **[Prévu plus tard]** Recherche avancée (sémantique/filtres complexes).
- **[Recherche]** IA complexe conversationnelle/générative (piste cognitive secondaire).
- **[Recherche]** Workflows juridiques post-mortem complets.
- **[Prévu plus tard]** Transmission post-mortem automatisée.
- **[Prévu plus tard]** Graphe narratif interactif avancé.

La vision cognitive reste une trajectoire **secondaire** à long terme, séparée de l’entrée produit capsule familiale transmissible. Les éléments de cette piste sont marqués **[Recherche]** ou **[Prévu plus tard]** dans leur documentation dédiée : `docs/vision-cognitive/VISION.md`.

## Documents de référence

- `docs/Capsule_Numerique_*` — ensemble des livrables de référence capsule (business, marché, finance, sécurité, UX/UI).
- `docs/product-capsule/*` — corpus produit canonique (scope, architecture, roadmap, contrats, sécurité, KPI, OpenAPI).
- `docs/Capsule_Numerique_-_Dossier_Complet.pdf` — dossier maître capsule numérique.
- `docs/Capsule_Numerique_-_Pitch_Investisseurs_Complete.pptx` — pitch investisseurs.
- `docs/Capsule_Numerique_Architecture.pdf` — architecture produit capsule.
- `docs/Capsule_Numerique_BusinessPlan.pdf` — business plan.
- `docs/Capsule_Numerique_Dossier_Confiance_Ethique_et_Perenite.pdf` — confiance, éthique et pérennité.
- `docs/Capsule_Numerique_Etude_Marche.pdf` — étude de marché.
- `docs/Capsule_Numerique_Financier_36mois.xlsx` — modèle financier 36 mois.
- `docs/Capsule_Numerique_Financier_Graphiques.pdf` — graphiques financiers.
- `docs/Capsule_Numerique_Secu_Pentest_RGPD.pdf` — sécurité, pentest et RGPD.
- `docs/Capsule_Numerique_UX_UI.pdf` — référentiel UX/UI.
- `docs/product-capsule/README.md` — index des documents de référence capsule (produit).
- `docs/product-capsule/scope-fonctionnel.md` — **source canonique du scope MVP**.
- `docs/mvp-scope.md` — synthèse de périmètre alignée.
- `docs/architecture-mvp.md` — architecture cible strictement dans le scope MVP.
- `docs/product-capsule/ROADMAP.md` — roadmap produit alignée sur le scope canonique.
- `docs/product-capsule/roadmap-shipping.md` — lots de delivery et gate de scope.
- `docs/product-capsule/pricing-go-to-market.md` — offre MVP, pricing micro-abonnement et KPI business de lancement.
- `docs/product-capsule/pricing-offer-mvp.md` — cadrage de l’offre MVP, positionnement à 0,60€/mois et KPI business de lancement.
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
