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
- Export utilisateur (`/exports`, `/exports/{id}/download`).

**Sortie de phase**
- DoD MVP validée (Produit + Tech).
- Aucun item Phase suivante/Research intégré au lot.

### M2 — Fiabilisation MVP (Next)

**Objectif**  
Stabiliser le MVP sans élargir le périmètre fonctionnel vendu.

**Livrables clés**
- Durcissement qualité/performance des endpoints data, consent et orchestration legacy message.
- Renforcement observabilité et journaux techniques.
- Renforcement des autorisations minimales et contrôles de cohérence inter-entités.
- Préparation à l’ouverture éventuelle d’APIs techniques aujourd’hui non promues.

### M3 — Extensions produit (Later)

**Objectif**  
Étendre les usages sans rupture de compatibilité API v1.

**Livrables candidats**
- Recherche avancée (filtres riches, indexation, sémantique).
- Graphe narratif interactif avancé (au-delà du CRUD nodes/edges).
- Déclenchement post-mortem automatisé bout-en-bout.
- Versionnage public des croyances/profils de valeurs.

### M4 — Research (Research)

**Objectif**  
Explorer les axes à forte incertitude métier/réglementaire.

**Pistes Research**
- Workflows juridiques complets (notarial/compliance automatisée).
- IA conversationnelle et génération avancée.

## Matrice Feature -> Scope -> Milestone

| Feature | Classification | Statut public v1 | Milestone cible |
| --- | --- | --- | --- |
| Auth + contenus cœur (`memories`, `beliefs`, `lessons`, `value_profiles`) | In scope Capsule v1 | Promue publiquement | M1 |
| Beneficiaries + legacy messages + orchestration (`arm/trigger/revoke/deliver`) | In scope Capsule v1 | Promue publiquement | M1 |
| Narrative nodes + narrative edges (CRUD basique) | In scope Capsule v1 | Promue publiquement | M1 |
| Consent scopes + export utilisateur | In scope Capsule v1 | Promue publiquement | M1 |
| Audit export (`/exports/audit`) | Phase suivante | **Non promue publiquement** | M2 |
| Observability (`/observability/audit`, `/observability/dashboard`) | Phase suivante | **Non promue publiquement** | M2 |
| Delivery attempts (`/legacy-messages/{id}/delivery-attempts`) | Phase suivante | **Non promue publiquement** | M2 |
| BeliefVersion / ValueProfileVersion (entités sans API publique dédiée) | Phase suivante | **Non promue publiquement** | M3 |
| Recherche avancée / graphe avancé / déclenchement automatisé complet | Phase suivante | Non communiqué v1 | M3 |
| Workflows juridiques complets / IA avancée | Phase suivante | Non communiqué v1 | M4 |

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Recentrage de la roadmap M1 sur le scope canonique et séparation explicite des extensions en Later/Research. |
| 2026-02-15 | Product + Tech | Alignement de M1 avec les surfaces API réellement exposées (legacy messages, beneficiaries, narrative graph basique, consent). |
| 2026-02-16 | Product + Tech | Arbitrage roadmap : distinction explicite entre **In scope Capsule v1** et **Phase suivante** pour toutes les features exposées, avec marquage des surfaces techniques existantes **non promues publiquement**. |
