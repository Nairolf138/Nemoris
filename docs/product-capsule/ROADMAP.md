# ROADMAP — Product Capsule

> Cette roadmap est alignée sur le scope canonique : `docs/product-capsule/scope-fonctionnel.md`.

## Légende de statut

- **Now** : en cours d’exécution sur le cycle actuel.
- **Next** : prêt à démarrer après validation des prérequis.
- **Later** : planifié, sans engagement de cycle court.
- **Research** : nécessite exploration avant engagement delivery.
- **Not in scope** : explicitement hors périmètre MVP.

## Milestones livrables

### M1 — MVP Scope Canonique (Now)

**Objectif**  
Livrer le parcours complet : authentification → gestion des contenus et liens → transmission encadrée par consentement → export.

**Livrables clés**
- Authentification (inscription, connexion, déconnexion, refresh) + session basique.
- CRUD `memories`, `beliefs`, `lessons`, `value_profiles`.
- CRUD `beneficiaries` + CRUD `legacy_messages` + orchestration (`arm/trigger/revoke/deliver`).
- CRUD `narrative_nodes` et `narrative_edges` (graphe narratif basique).
- Consent management (`grant/revoke/history`) sur `data_export`, `post_mortem_transmission`, `posthumous_visibility`.
- Export + audit export + observabilité read-only.

**Sortie de phase**
- DoD MVP validée (Produit + Tech).
- Aucun item Phase 2/Research intégré au lot.

### M2 — Fiabilisation MVP (Next)

**Objectif**  
Stabiliser le MVP sans élargir le périmètre fonctionnel.

**Livrables clés**
- Durcissement qualité/performance des endpoints data, consent et orchestration legacy message.
- Journalisation d’erreurs et observabilité opérationnelle.
- Renforcement des autorisations minimales et contrôles de cohérence inter-entités.

### M3 — Extensions produit (Later)

**Objectif**  
Étendre les usages sans rupture de compatibilité API v1.

**Livrables candidats**
- Recherche avancée (filtres riches, indexation, sémantique).
- Graphe narratif interactif avancé (au-delà du CRUD nodes/edges).
- Déclenchement post-mortem automatisé bout-en-bout.

### M4 — Research (Research)

**Objectif**  
Explorer les axes à forte incertitude métier/réglementaire.

**Pistes Research**
- Workflows juridiques complets (notarial/compliance automatisée).
- IA conversationnelle et génération avancée.

## Matrice Feature -> Milestone

| Feature | Statut | Milestone |
| --- | --- | --- |
| Legacy messages | In scope v1 | M1 |
| Beneficiaries | In scope v1 | M1 |
| Narrative nodes/edges | In scope v1 | M1 |
| Consent scopes | In scope v1 | M1 |
| Graphe narratif avancé | Phase 2 | M3 |
| Déclenchement automatisé complet | Phase 2 | M3 |
| Workflows juridiques complets | Research | M4 |

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Recentrage de la roadmap M1 sur le scope canonique et séparation explicite des extensions en Later/Research. |
| 2026-02-15 | Product + Tech | Alignement de M1 avec les surfaces API réellement exposées (legacy messages, beneficiaries, narrative graph basique, consent). |
