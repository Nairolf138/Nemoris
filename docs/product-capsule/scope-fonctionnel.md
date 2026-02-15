# Scope fonctionnel canonique — Capsule v1 (MVP)

Ce document est la **source canonique** du périmètre MVP.
Tout autre document produit/technique doit s’y aligner.

## Inventaire harmonisé des fonctionnalités réellement exposées

Inventaire établi depuis :
- `packages/core/src/domain/entities.ts` (modèle métier).
- `apps/capsule-api/src/app.ts` (surfaces API exposées).

> Règle de classement : toute feature est classée **In scope Capsule v1** ou **Phase suivante**.
> Les capacités techniques existantes mais non destinées à la communication commerciale v1 sont marquées **non promue publiquement**.

| Feature | Source code | Classification | Statut de communication | Détail de périmètre |
| --- | --- | --- | --- | --- |
| Auth (register/login/logout/refresh) | API | **In scope Capsule v1** | Promue publiquement | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`. |
| Memories | Domaine + API | **In scope Capsule v1** | Promue publiquement | CRUD `/data/memories` (+ tri/pagination). |
| Beliefs | Domaine + API | **In scope Capsule v1** | Promue publiquement | CRUD `/data/beliefs` + liens de preuves mémoire. |
| Lessons | Domaine + API | **In scope Capsule v1** | Promue publiquement | CRUD `/data/lessons`. |
| Value profiles | Domaine + API | **In scope Capsule v1** | Promue publiquement | CRUD `/data/value_profiles`. |
| Beneficiaries | Domaine + API | **In scope Capsule v1** | Promue publiquement | CRUD `/data/beneficiaries`, validation actif/vérifié pour transmission. |
| Legacy messages | Domaine + API | **In scope Capsule v1** | Promue publiquement | CRUD `/data/legacy_messages` + orchestration `/legacy-messages/{id}/{arm\|trigger\|revoke\|deliver}`. |
| Narrative nodes | Domaine + API | **In scope Capsule v1** | Promue publiquement | CRUD `/data/narrative_nodes` avec validation des références. |
| Narrative edges | Domaine + API | **In scope Capsule v1** | Promue publiquement | CRUD `/data/narrative_edges` avec contraintes de cohérence. |
| Consent management | Domaine + API | **In scope Capsule v1** | Promue publiquement | `/consent/grant`, `/consent/revoke`, `/consent/history` pour `data_export`, `post_mortem_transmission`, `posthumous_visibility`. |
| Export utilisateur | API | **In scope Capsule v1** | Promue publiquement | `/exports`, `/exports/{id}/download` sous consentement `data_export`. |
| Journal d’audit export (`/exports/audit`) | API | **Phase suivante** | **Non promue publiquement** | Capacité technique déjà disponible, réservée au pilotage interne/ops. |
| Observability audit/dashboard | API | **Phase suivante** | **Non promue publiquement** | Endpoints `/observability/audit` et `/observability/dashboard` conservés comme surface technique. |
| Historique des tentatives de delivery (`/legacy-messages/{id}/delivery-attempts`) | API | **Phase suivante** | **Non promue publiquement** | Surface technique de suivi opérationnel, pas un argument marketing v1. |
| Belief versions / Value profile versions | Domaine | **Phase suivante** | **Non promue publiquement** | Entités présentes dans le modèle (`BeliefVersion`, `ValueProfileVersion`) sans surface API publique v1 dédiée. |
| Recherche avancée | Produit (non exposé) | **Phase suivante** | Non communiqué v1 | Filtres riches, indexation avancée, sémantique. |
| Graphe narratif interactif avancé | Produit (non exposé) | **Phase suivante** | Non communiqué v1 | Visualisation/édition avancée au-delà du CRUD nodes/edges. |
| Déclenchement post-mortem automatisé bout-en-bout | Produit (non exposé) | **Phase suivante** | Non communiqué v1 | Automatisation complète événementielle et runbooks production. |
| Workflows juridiques complets | Produit (non exposé) | **Phase suivante** | Non communiqué v1 | Parcours notarial intégré, conformité automatisée complète. |
| IA conversationnelle/génération avancée | Produit (non exposé) | **Phase suivante** | Non communiqué v1 | Hors capsule v1. |

## Definition of Done (DoD)

Le MVP est **Done** quand un utilisateur peut, de bout en bout :
1. s’authentifier,
2. créer/modifier des contenus (`memories`, `beliefs`, `lessons`, `value_profiles`),
3. gérer les entités de transmission (`beneficiaries`, `legacy_messages`) et leurs actions d’orchestration,
4. gérer le graphe narratif basique (`narrative_nodes`, `narrative_edges`),
5. piloter les consentements (`grant/revoke/history`) et exporter les données sans blocage.

## KPI de succès MVP

- Taux d’onboarding terminé.
- Nombre moyen d’entrées créées par utilisateur actif (30 jours).
- Taux de création de liens entre éléments.
- Taux d’export réussi.
- Rétention à J+7.

## KPI -> métriques techniques (MVP)

| KPI produit | Métrique technique cible | Source d'instrumentation |
| --- | --- | --- |
| Taux d’onboarding terminé | `onboarding_completion_rate` | `onboarding.started`, `onboarding.completed` |
| Nombre moyen d’entrées créées par utilisateur actif (30 jours) | `entries_per_active_user_30d` | `memory.created`, `belief.created`, `lesson.created`, `value_profile.created` + utilisateurs actifs 30j |
| Taux de création de liens entre éléments | `link_creation_rate` | `link.created`, `entries_created_total` |
| Taux d’export réussi | `export_success_rate` | `export.created`, `export.failed` |
| Rétention à J+7 | `retention_j7_rate` | `retention.weekly`, `onboarding.completed` |

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Ce document devient la référence canonique du scope MVP. |
| 2026-02-15 | Product + Tech | Harmonisation du scope avec les surfaces réellement exposées: legacy messages, beneficiaries, narrative nodes/edges, consent scopes passent explicitement **In scope v1**. |
| 2026-02-15 | Product + Tech | Le hors-scope est recentré sur l’automatisation avancée, les workflows juridiques complets et l’IA avancée. |
| 2026-02-16 | Product + Tech | Arbitrage explicite In scope Capsule v1 vs Phase suivante pour toutes les surfaces issues de `app.ts` et `entities.ts`, avec marquage **non promue publiquement** des features techniques (observability, export audit, delivery attempts, versions). |
