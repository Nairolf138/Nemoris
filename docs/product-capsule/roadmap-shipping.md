# Roadmap shipping — Capsule v1

Référence canonique : `docs/product-capsule/scope-fonctionnel.md`.

## Règle de tri backlog

- Tout tri backlog doit utiliser **uniquement** `docs/product-capsule/scope-fonctionnel.md` comme référence de périmètre.
- Toute demande out-of-scope est **explicitement refusée** puis reclassée en **[Prévu plus tard]** ou **[Recherche]**.
- Chaque arbitrage (acceptation MVP, report, refus) est consigné dans le Decision log ci-dessous.

## Gate de scope (à valider avant chaque lot)

- [ ] Le lot ne contient **aucun** item marqué out-of-scope dans le document canonique.
- [ ] Le lot contribue directement à la DoD MVP (auth, contenus, liens, export).
- [ ] Produit + Tech ont validé le périmètre du lot sans ajout implicite.
- [ ] Les dépendances non-MVP sont explicitement reportées au backlog **[Prévu plus tard]**/**[Recherche]**.
- [ ] Le Decision log est mis à jour si une décision de périmètre a été prise.

## [Disponible maintenant] In scope (Capsule v1)

### Lot 0 — Cadrage

**Gate de scope (pré-lot)**
- [ ] Gate validée.

- Stabiliser périmètre MVP et critères d’acceptation.
- Confirmer modèle de données cœur et politiques d’accès minimales.
- Geler la définition de Done MVP.

### Lot 1 — Fondations produit

**Gate de scope (pré-lot)**
- [ ] Gate validée.

- Auth, session, isolation basique des données utilisateur.
- CRUD mémoire/convictions/leçons/valeurs.
- Liaisons manuelles inter-objets.

### Lot 2 — Valeur utilisateur

**Gate de scope (pré-lot)**
- [ ] Gate validée.

- Consultation chronologique simple.
- Exports PDF/JSON.
- Instrumentation KPI MVP.

### Lot 3 — Hardening avant release

**Gate de scope (pré-lot)**
- [ ] Gate validée.

- Stabilisation des parcours in-scope.
- Gel des nouvelles features pendant toute la fenêtre hardening.
- Validation DoD MVP (Produit + Tech).
- Go/No-Go basé sur conformité au scope canonique.

## [Prévu plus tard] / [Recherche] Hors scope (MVP)

- Recherche avancée, IA contextuelle complexe.
- Automatisations juridiques post-mortem.
- Transmission post-mortem automatisée.
- Graphe narratif interactif avancé.

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Ajout d’un gate de scope obligatoire avant chaque lot de delivery. |
| 2026-02-13 | Product + Tech | Le tri backlog doit désormais se baser exclusivement sur `scope-fonctionnel.md` comme référence unique. |
| 2026-02-13 | Product + Tech | Refus explicite imposé pour toute demande hors scope MVP (IA avancée, recherche complexe, workflows juridiques post-mortem), avec reclassement en **[Prévu plus tard]**/**[Recherche]**. |
| 2026-02-13 | Product + Tech | Les templates ticket/PR incluent la checklist “In scope MVP” (auth, contenus, liens, export) pour tracer les arbitrages. |
| 2026-02-13 | Product + Tech | Pendant la fenêtre hardening MVP, aucun développement de nouvelle feature n'est autorisé; seules les corrections in-scope (auth, CRUD, liens, export) sont acceptées. |
