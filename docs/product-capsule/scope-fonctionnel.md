# Scope fonctionnel canonique — Capsule v1 (MVP)

Ce document est la **source canonique** du périmètre MVP.
Tout autre document produit/technique doit s’y aligner.

## Canon MVP — posthume non-cognitif

Le MVP v1 est explicitement limité à une **capsule posthume non-cognitive** autour de 5 piliers :

1. **Coffre chiffré** (documents et messages).
2. **Héritiers / contacts de confiance** (gestion et validation).
3. **Déclenchement contrôlé** (signal décès + validation avant remise).
4. **Journalisation / traçabilité** (audit des actions critiques).
5. **Export / remise sécurisée** (paquet transmis aux destinataires autorisés).

## Inventaire harmonisé des fonctionnalités

Inventaire établi depuis :
- `packages/core/src/domain/entities.ts` (modèle métier).
- `apps/capsule-api/src/app.ts` (surfaces API exposées).

> Tags de scope canoniques (à réutiliser dans tous les documents) :
> - **[MVP v1]**
> - **[Phase 2]**
> - **[Research]**
>
> Les éléments **[Phase 2]** et **[Research]** sont **non promus publiquement** en communication v1.

| Feature | Source code | Tag scope | Statut public v1 | Détail de périmètre |
| --- | --- | --- | --- | --- |
| Auth (register/login/logout/refresh) | API | **[MVP v1]** | Promue publiquement | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`. |
| Coffre chiffré — documents/messages | Domaine + API | **[MVP v1]** | Promue publiquement | Stockage et CRUD de contenus de transmission (`/data/legacy_messages`, documents liés) avec protection d’accès. |
| Héritiers / contacts de confiance | Domaine + API | **[MVP v1]** | Promue publiquement | CRUD `/data/beneficiaries`, statut actif/vérifié pour remise. |
| Déclenchement contrôlé | Domaine + API | **[MVP v1]** | Promue publiquement | `/legacy-messages/{id}/{arm\|trigger\|revoke\|deliver}` + validation avant remise effective. |
| Journalisation / traçabilité | API | **[MVP v1]** | Promue publiquement | Journal d’audit et suivi opérationnel (`/observability/audit`, `/legacy-messages/{id}/delivery-attempts`). |
| Export / remise sécurisée | API | **[MVP v1]** | Promue publiquement | `/exports`, `/exports/{id}/download`, `/exports/audit` pour paquet de remise. |
| Consent management | API | **[MVP v1]** | Promue publiquement | `/consent/grant`, `/consent/revoke`, `/consent/history` pour `data_export`, `post_mortem_transmission`, `posthumous_visibility`. |
| Memories | Domaine + API | **[Phase 2]** | **Non promue publiquement** | CRUD `/data/memories` conservé techniquement, retiré du canon MVP public. |
| Beliefs | Domaine + API | **[Phase 2]** | **Non promue publiquement** | CRUD `/data/beliefs` et liens de preuves mémoire hors promesse MVP. |
| Lessons | Domaine + API | **[Phase 2]** | **Non promue publiquement** | CRUD `/data/lessons` hors promesse MVP. |
| Value profiles | Domaine + API | **[Phase 2]** | **Non promue publiquement** | CRUD `/data/value_profiles` hors promesse MVP. |
| Narrative nodes | Domaine + API | **[Research]** | **Non promue publiquement** | CRUD `/data/narrative_nodes` réservé exploration produit/UX. |
| Narrative edges | Domaine + API | **[Research]** | **Non promue publiquement** | CRUD `/data/narrative_edges` réservé exploration produit/UX. |
| Belief versions / Value profile versions | Domaine | **[Research]** | **Non promue publiquement** | Entités présentes dans le modèle sans engagement produit v1. |
| Recherche avancée / IA avancée / workflows juridiques complets | Produit (non exposé) | **[Research]** | Non communiqué v1 | Hors capsule v1. |

## Phasage produit (communication et delivery)

1. **MVP v1 — Capsule posthume non-cognitive** : coffre chiffré, héritiers, déclenchement contrôlé, audit, export/remise.
2. **Phase 2 — Capital personnel structuré** : `memories`, `beliefs`, `lessons`, `value_profiles` (activation progressive, non promue publiquement avant arbitrage).
3. **Research — Narratif & cognition** : `narrative_nodes`, `narrative_edges`, versions, recherche/IA avancées.

## Definition of Done (DoD)

Le MVP est **Done** quand un utilisateur peut, de bout en bout :
1. s’authentifier,
2. déposer et gérer un coffre chiffré de documents/messages de transmission,
3. enregistrer des héritiers/contacts de confiance,
4. initier un déclenchement posthume contrôlé (signal décès + validation + remise),
5. disposer d’une traçabilité complète des actions critiques,
6. exporter et remettre le contenu de façon sécurisée aux destinataires autorisés.

## KPI de succès MVP

- Taux de configuration complète d’une capsule posthume.
- Taux de désignation d’au moins un héritier vérifié.
- Taux de déclenchements validés sans incident.
- Taux d’export/remise réussis.
- Couverture de journalisation des actions critiques.

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Ce document devient la référence canonique du scope MVP. |
| 2026-02-16 | Product + Tech | Harmonisation initiale des surfaces API/domaine avec classement disponible vs plus tard. |
| 2026-02-17 | Product + Tech | **Arbitrage “MVP posthume non-cognitif”** : recentrage canonique sur coffre chiffré, héritiers, déclenchement contrôlé, traçabilité et export/remise sécurisée ; `memories`, `beliefs`, `lessons`, `value_profiles` passent en **[Phase 2]** et `narrative_*` en **[Research]** (non promus publiquement). |
