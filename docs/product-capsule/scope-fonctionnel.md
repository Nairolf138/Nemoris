# Scope fonctionnel canonique — Capsule v1 (MVP)

Ce document est la **source canonique** du périmètre MVP.
Tout autre document produit/technique doit s’y aligner.

## Inventaire des features réellement exposées

Inventaire établi depuis :
- `packages/core/src/domain/entities.ts` (modèle métier).
- `apps/capsule-api/src/app.ts` (surfaces API exposées).

## Matrice canonique — In/Out de scope

| Feature | Statut | Détail de périmètre v1 |
| --- | --- | --- |
| Auth (register/login/logout/refresh) | **In scope v1** | Auth locale + session bearer token. |
| Memories | **In scope v1** | CRUD via `/data/memories` avec tri/pagination. |
| Beliefs | **In scope v1** | CRUD via `/data/beliefs`, liens de preuve mémoire. |
| Lessons | **In scope v1** | CRUD via `/data/lessons`. |
| Value profiles | **In scope v1** | CRUD via `/data/value_profiles`. |
| Legacy messages | **In scope v1** | CRUD + orchestration (`arm/trigger/revoke/deliver`) via `/data/legacy_messages` et `/legacy-messages/{id}/...`. |
| Beneficiaries | **In scope v1** | CRUD via `/data/beneficiaries`, validation statut actif/vérifié pour legacy messages. |
| Narrative nodes | **In scope v1** | CRUD via `/data/narrative_nodes`, validation références. |
| Narrative edges | **In scope v1** | CRUD via `/data/narrative_edges`, contraintes de cohérence (`from != to`). |
| Consent scopes | **In scope v1** | Grant/revoke/history + enforcement des scopes `data_export`, `post_mortem_transmission`, `posthumous_visibility`. |
| Exports | **In scope v1** | Création + téléchargement + audit export (sous consentement `data_export`). |
| Observability (audit/dashboard) | **In scope v1** | Endpoints read-only opérationnels. |
| Recherche avancée | **Phase 2** | Filtres riches, indexation avancée, sémantique. |
| Graphe narratif interactif avancé | **Phase 2** | Visualisation/édition avancée au-delà du CRUD nodes/edges. |
| Déclenchement post-mortem automatisé bout-en-bout | **Phase 2** | Automatisation complète événementielle et runbooks de production. |
| Workflows juridiques complets | **Research** | Parcours notarial intégré, conformité automatisée complète. |
| IA conversationnelle/génération avancée | **Research** | Hors capsule v1. |

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
