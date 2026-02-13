# Checklist Go/No-Go (alignée roadmap shipping)

Référence d'alignement: `docs/product-capsule/roadmap-shipping.md`.

## Gate de scope (obligatoire)

- [ ] Aucun item out-of-scope n'est embarqué.
- [ ] Le lot contribue à la DoD MVP (auth, contenus, liens, export).
- [ ] Validation Produit + Tech explicite du périmètre.
- [ ] Dépendances non-MVP reportées en backlog.
- [ ] Decision log mis à jour si décision de scope.

## Lot 0 — Cadrage

- [ ] Gate de scope validée.
- [ ] Critères d'acceptation lot documentés et signés.
- [ ] Modèle de données cœur validé.
- [ ] Définition of Done MVP gelée.

## Lot 1 — Fondations produit

- [ ] Gate de scope validée.
- [ ] Auth/session et isolation de données testées.
- [ ] CRUD mémoire/convictions/leçons/valeurs validé.
- [ ] Liens manuels inter-objets validés.

## Lot 2 — Valeur utilisateur

- [ ] Gate de scope validée.
- [ ] Consultation chronologique testée.
- [ ] Exports PDF/JSON conformes au contrat.
- [ ] KPI MVP exposés dans l'observabilité.

## Lot 3 — Hardening avant release

- [ ] Gate de scope validée.
- [ ] Parcours in-scope stabilisés (aucun bug bloquant ouvert).
- [ ] Validation DoD MVP faite par Produit + Tech.
- [ ] Critères opérationnels validés (runbook, rollback, restauration).

## Go / No-Go final

- [ ] CI complète au vert (typecheck, tests, checks docs contractuelles).
- [ ] Artefacts de build générés et tracés (`artifacts/manifest.json`).
- [ ] Version SemVer décidée et tag prêt.
- [ ] Go confirmé par Product Owner + Tech Lead + On-call.

## Workflow de validation release readiness

Avant le Go / No-Go final, exécuter localement la vérification consolidée:

```bash
npm run release:readiness:check
```

Ce contrôle valide la présence des documents contractuels, la présence de `docs/operations/release-recette-report.md`, et la cohérence de version avec `artifacts/manifest.json` si ce manifeste est disponible.
