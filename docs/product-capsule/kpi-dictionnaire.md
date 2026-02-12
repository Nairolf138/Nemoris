# Dictionnaire KPI (MVP)

Ce dictionnaire formalise les KPI de pilotage produit avec la **source événementielle**, la **formule** et la **fenêtre temporelle**.

| KPI | Source événementielle | Formule | Fenêtre temporelle |
|---|---|---|---|
| `onboarding_completed` | `onboarding.completed` | Nombre d'utilisateurs uniques ayant complété l'onboarding. | Cumulé depuis démarrage du service |
| `onboarding_started_total` | `onboarding.started` | Nombre total de démarrages onboarding. | Cumulé depuis démarrage du service |
| `onboarding_completion_rate` | `onboarding.completed / onboarding.started` | `onboarding_completed_total / onboarding_started_total` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `capsule_activity` | `capsule.*`, `memory.*`, `belief.*`, `lesson.*`, `value_profile.*`, `legacy_message.*` | Nombre total d'événements d'activité capsule. | Cumulé depuis démarrage du service |
| `export_total` | `export.created` | Nombre total d'exports réussis. | Cumulé depuis démarrage du service |
| `export_failure_total` | `export.failed` | Nombre total d'exports en échec. | Cumulé depuis démarrage du service |
| `export_rate` | `export.created`, événements activité capsule | `export_total / capsule_activity` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `export_failure_rate` | `export.failed`, `export.created` | `export_failure_total / (export_failure_total + export_total)` (arrondi à 4 décimales). | Cumulé depuis démarrage du service |
| `auth_errors` | `security.auth_failed` | Nombre total d'échecs d'authentification. | Cumulé depuis démarrage du service |
| `security_alerts` | `security.alert.triggered` | Nombre total d'alertes sécurité. | Cumulé depuis démarrage du service |
| `weekly_active_users` | Tous événements horodatés valides | Nombre d'utilisateurs uniques actifs sur les 7 derniers jours glissants. | 7 jours glissants |
| `retention_weekly_total` | `retention.weekly` | Nombre d'utilisateurs uniques marqués comme retenus hebdomadaires. | Cumulé depuis démarrage du service |
| `link_created_total` | `link.created` | Nombre total de liens créés. | Cumulé depuis démarrage du service |

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
