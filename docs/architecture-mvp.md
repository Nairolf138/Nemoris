# Architecture MVP — Nemoris

> Architecture strictement alignée sur le scope canonique : `docs/product-capsule/scope-fonctionnel.md`.

## Canon d’architecture MVP

Architecture centrée sur une **capsule posthume non-cognitive**.

### Tags de scope (canon commun)
- **[MVP v1]**
- **[Phase 2]**
- **[Research]**

## Modules applicatifs [MVP v1]

### 1) Authentification & session

**Fonctionnalités MVP**
- Inscription, connexion, déconnexion, refresh de session.
- Contrôle d’accès minimal par utilisateur.

### 2) Coffre chiffré (documents/messages)

**Fonctionnalités MVP**
- Stockage de contenus de transmission.
- CRUD de messages/documents dans le coffre.
- Protection d’accès et isolation par propriétaire.

**Surfaces clés**
- `/data/legacy_messages`

### 3) Héritiers / contacts de confiance

**Fonctionnalités MVP**
- CRUD des bénéficiaires.
- Gestion des statuts actif/vérifié.

**Surfaces clés**
- `/data/beneficiaries`

### 4) Déclenchement contrôlé posthume

**Fonctionnalités MVP**
- Armement, déclenchement, révocation, remise.
- Workflow avec signal décès + validation avant remise.

**Surfaces clés**
- `/legacy-messages/{id}/{arm|trigger|revoke|deliver}`

### 5) Journalisation / traçabilité

**Fonctionnalités MVP**
- Audit des actions critiques.
- Historique des tentatives de remise.
- Observabilité minimale pour opérations de transmission.

**Surfaces clés**
- `/observability/audit`
- `/legacy-messages/{id}/delivery-attempts`
- `/exports/audit`

### 6) Export / remise sécurisée

**Fonctionnalités MVP**
- Génération d’export utilisateur.
- Téléchargement sécurisé et remise aux destinataires autorisés.

**Surfaces clés**
- `/exports`
- `/exports/{id}/download`

### 7) Consent management

**Fonctionnalités MVP**
- Grant/revoke/history pour transmission et export.

**Surfaces clés**
- `/consent/grant`, `/consent/revoke`, `/consent/history`

## Capacités hors MVP immédiat

### [Phase 2]
- `memories`, `beliefs`, `lessons`, `value_profiles` (capital personnel structuré, non promu publiquement en v1).

### [Research]
- `narrative_nodes`, `narrative_edges`.
- `BeliefVersion`, `ValueProfileVersion`.
- Recherche avancée, IA avancée, workflows juridiques complets.

## Definition of Done (DoD) — canon commun

Le MVP est **Done** quand un utilisateur peut, de bout en bout :
1. s’authentifier,
2. déposer et gérer un coffre chiffré de documents/messages de transmission,
3. enregistrer des héritiers/contacts de confiance,
4. initier un déclenchement posthume contrôlé (signal décès + validation + remise),
5. disposer d’une traçabilité complète des actions critiques,
6. exporter et remettre le contenu de façon sécurisée aux destinataires autorisés.

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Simplification initiale de l’architecture MVP aux modules canoniques. |
| 2026-02-17 | Product + Tech | Adoption de l’arbitrage **“MVP posthume non-cognitif”** : architecture recentrée sur coffre/héritiers/déclenchement/audit/remise ; briques cognitives reclassées en **[Phase 2]** et **[Research]**. |
