# ROADMAP — Product Capsule

> Cette roadmap est alignée sur le scope canonique : `docs/product-capsule/scope-fonctionnel.md`.

## Légende de statut

- **[Disponible maintenant]** : lot livré dans le scope MVP actuel.
- **[Prévu plus tard]** : lot planifié pour une version suivante, non livré actuellement.
- **[Recherche]** : lot exploratoire, sans engagement de livraison.

## Milestones livrables

### M1 — MVP Scope Canonique (**[Disponible maintenant]**)

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
- Aucun item **[Prévu plus tard]**/**[Recherche]** intégré au lot.

### M2 — Fiabilisation MVP (**[Prévu plus tard]**)

**Objectif**  
Stabiliser le MVP sans élargir le périmètre fonctionnel vendu.

**Livrables clés**
- Durcissement qualité/performance des endpoints data, consent et orchestration legacy message.
- Renforcement observabilité et journaux techniques.
- Renforcement des autorisations minimales et contrôles de cohérence inter-entités.
- Préparation à l’ouverture éventuelle d’APIs techniques aujourd’hui non promues.

### M3 — Extensions produit (**[Prévu plus tard]**)

**Objectif**  
Étendre les usages sans rupture de compatibilité API v1.

**Livrables candidats**
- Recherche avancée (filtres riches, indexation, sémantique).
- Graphe narratif interactif avancé (au-delà du CRUD nodes/edges).
- Déclenchement post-mortem automatisé bout-en-bout.
- Versionnage public des croyances/profils de valeurs.

### M4 — Recherche (**[Recherche]**)

**Objectif**  
Explorer les axes à forte incertitude métier/réglementaire.

**Pistes Recherche**
- Workflows juridiques complets (notarial/compliance automatisée).
- IA conversationnelle et génération avancée.

## Matrice Feature -> Scope -> Milestone

| Feature | Classification | Statut public v1 | Milestone cible |
| --- | --- | --- | --- |
| Auth + contenus cœur (`memories`, `beliefs`, `lessons`, `value_profiles`) | **[Disponible maintenant]** | Promue publiquement | M1 |
| Beneficiaries + legacy messages + orchestration (`arm/trigger/revoke/deliver`) | **[Disponible maintenant]** | Promue publiquement | M1 |
| Narrative nodes + narrative edges (CRUD basique) | **[Disponible maintenant]** | Promue publiquement | M1 |
| Consent scopes + export utilisateur | **[Disponible maintenant]** | Promue publiquement | M1 |
| Audit export (`/exports/audit`) | **[Prévu plus tard]** | **Non promue publiquement** | M2 |
| Observability (`/observability/audit`, `/observability/dashboard`) | **[Prévu plus tard]** | **Non promue publiquement** | M2 |
| Delivery attempts (`/legacy-messages/{id}/delivery-attempts`) | **[Prévu plus tard]** | **Non promue publiquement** | M2 |
| BeliefVersion / ValueProfileVersion (entités sans API publique dédiée) | **[Prévu plus tard]** | **Non promue publiquement** | M3 |
| Recherche avancée / graphe avancé / déclenchement automatisé complet | **[Prévu plus tard]** | Non communiqué v1 | M3 |
| Workflows juridiques complets / IA avancée | **[Prévu plus tard]** | Non communiqué v1 | M4 |

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Recentrage de la roadmap M1 sur le scope canonique et séparation explicite des extensions en **[Prévu plus tard]**/**[Recherche]**. |
| 2026-02-15 | Product + Tech | Alignement de M1 avec les surfaces API réellement exposées (legacy messages, beneficiaries, narrative graph basique, consent). |
| 2026-02-16 | Product + Tech | Arbitrage roadmap : distinction explicite entre **[Disponible maintenant]** et **[Prévu plus tard]** pour toutes les features exposées, avec marquage des surfaces techniques existantes **non promues publiquement**. |
