# Dictionnaire KPI (MVP)

Ce dictionnaire formalise les KPI de pilotage produit avec la **source événementielle**, la **formule** et la **fenêtre temporelle**.

| KPI | Source événementielle | Formule | Fenêtre temporelle |
|---|---|---|---|
| `onboarding_completed` | `onboarding.completed` | Nombre d'utilisateurs uniques ayant complété l'onboarding. | Cumulé depuis démarrage du service |
| `onboarding_started_total` | `onboarding.started` | Nombre total de démarrages onboarding. | Cumulé depuis démarrage du service |
| `onboarding_completion_rate` | `onboarding.completed / onboarding.started` | `onboarding_completed_total / onboarding_started_total` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `capsule_activity` | `capsule.*`, `memory.*`, `belief.*`, `lesson.*`, `value_profile.*`, `legacy_message.*` | Nombre total d'événements d'activité capsule. | Cumulé depuis démarrage du service |
| `entries_created_total` | `memory.created`, `belief.created`, `lesson.created`, `value_profile.created` | Nombre total d'entrées de contenu créées dans le scope MVP. | Cumulé depuis démarrage du service |
| `entries_per_active_user_30d` | Tous événements + événements `*.created` scope MVP | `entries_created_30d / active_users_30d` (arrondi à 4 décimales). | 30 jours glissants |
| `link_created_total` | `link.created` | Nombre total de liens créés. | Cumulé depuis démarrage du service |
| `link_creation_rate` | `link.created`, `entries_created_total` | `link_created_total / entries_created_total` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `export_total` | `export.created` | Nombre total d'exports réussis. | Cumulé depuis démarrage du service |
| `export_failure_total` | `export.failed` | Nombre total d'exports en échec. | Cumulé depuis démarrage du service |
| `export_success_rate` | `export.created`, `export.failed` | `export_total / (export_total + export_failure_total)` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `export_failure_rate` | `export.failed`, `export.created` | `export_failure_total / (export_failure_total + export_total)` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `export_pdf_success_total` | `export.created` avec `metadata.format=pdf` | Nombre d'exports PDF réussis. | Cumulé depuis démarrage du service |
| `export_json_success_total` | `export.created` avec `metadata.format=json` | Nombre d'exports JSON réussis. | Cumulé depuis démarrage du service |
| `export_pdf_success_rate` | `export.created`, `export.failed` avec `metadata.format=pdf` | `export_pdf_success_total / export_pdf_attempts_total` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `export_json_success_rate` | `export.created`, `export.failed` avec `metadata.format=json` | `export_json_success_total / export_json_attempts_total` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `auth_errors` | `security.auth_failed` | Nombre total d'échecs d'authentification. | Cumulé depuis démarrage du service |
| `security_alerts` | `security.alert.triggered` | Nombre total d'alertes sécurité. | Cumulé depuis démarrage du service |
| `weekly_active_users` | Tous événements horodatés valides | Nombre d'utilisateurs uniques actifs sur les 7 derniers jours glissants. | 7 jours glissants |
| `retention_weekly_total` | `retention.weekly` | Nombre d'utilisateurs uniques marqués comme retenus hebdomadaires. | Cumulé depuis démarrage du service |
| `retention_j7_rate` | `retention.weekly`, `onboarding.completed` | `retention_weekly_total / onboarding_completed` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |

## KPI MVP observables

Mapping explicite des KPI produit du scope MVP vers leurs métriques techniques :

| KPI produit (`scope-fonctionnel.md`) | Métrique technique exposée | Collecte |
|---|---|---|
| Taux d'onboarding terminé | `onboarding_completion_rate` | `onboarding.started` + `onboarding.completed` |
| Nombre moyen d'entrées créées / utilisateur actif (30j) | `entries_per_active_user_30d` | Événements `*.created` (Mémoire/Convictions/Leçons/Valeurs) + utilisateurs actifs 30j |
| Taux de création de liens entre éléments | `link_creation_rate` | `link.created` / `entries_created_total` |
| Taux d'export réussi (PDF/JSON) | `export_success_rate`, `export_pdf_success_rate`, `export_json_success_rate` | `export.created` + `export.failed` avec `metadata.format` |
| Rétention à J+7 | `retention_j7_rate` | `retention.weekly` / `onboarding.completed` |

## Format minimal de restitution (MVP)

1. **JSON dashboard** (endpoint `/observability/dashboard`) :
   - versionné (`schema_version`),
   - bloc `metrics` contenant les KPI techniques,
   - bloc `alerts` simple (`ok`/`triggered`),
   - bloc `recent_events` (25 derniers événements).
2. **Log structuré sécurité** : une ligne JSON par événement sécurité avec `type`, `severity`, `kpi_dimension`, `event`.
3. **CSV legacy** : conservé pour compatibilité minimale (`schema_version=1`).

## Alerting MVP (dashboard v2)

| Alerte | Déclencheur | Sévérité |
|---|---|---|
| `export_failure_rate` | `export_failure_rate >= 0.20` avec un minimum de 5 tentatives d'export. | Critique |
| `auth_anomalies` | `auth_errors >= 5`. | Warning |
| `onboarding_drop` | `onboarding_completion_rate < 0.60` avec un minimum de 5 démarrages onboarding. | Warning |

## Compatibilité de schéma dashboard

- `schema_version: 2` est exposé sur l'endpoint `/observability/dashboard`.
- `backward_compatible_with: [1]` indique la compatibilité descendante.
- Le payload legacy (`json` et `csv`) est conservé pour les consommateurs en schéma v1.
