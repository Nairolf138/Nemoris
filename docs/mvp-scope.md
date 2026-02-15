# Périmètre MVP (v1)

> Document aligné sur la source canonique : `docs/product-capsule/scope-fonctionnel.md`.

## 1) Canon MVP — posthume non-cognitif

Le MVP v1 est limité aux capacités suivantes :
- coffre chiffré (documents/messages),
- héritiers/contacts de confiance,
- déclenchement contrôlé (signal décès + validation),
- journalisation/traçabilité,
- export/remise sécurisée.

## 2) Classement harmonisé par tags de scope

Tags canoniques utilisés : **[MVP v1]**, **[Phase 2]**, **[Research]**.

| Feature | Surface (code/API) | Tag scope | Statut public v1 |
| --- | --- | --- | --- |
| Auth | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh` | **[MVP v1]** | Promue publiquement |
| Coffre chiffré (messages/documents) | `/data/legacy_messages` | **[MVP v1]** | Promue publiquement |
| Héritiers / contacts de confiance | `/data/beneficiaries` | **[MVP v1]** | Promue publiquement |
| Déclenchement contrôlé | `/legacy-messages/{id}/{arm\|trigger\|revoke\|deliver}` | **[MVP v1]** | Promue publiquement |
| Journalisation / traçabilité | `/observability/audit`, `/legacy-messages/{id}/delivery-attempts`, `/exports/audit` | **[MVP v1]** | Promue publiquement |
| Export / remise sécurisée | `/exports`, `/exports/{id}/download` | **[MVP v1]** | Promue publiquement |
| Consent scopes (`data_export`, `post_mortem_transmission`, `posthumous_visibility`) | `/consent/grant`, `/consent/revoke`, `/consent/history` | **[MVP v1]** | Promue publiquement |
| Memories / Beliefs / Lessons / Value profiles | `/data/{memories\|beliefs\|lessons\|value_profiles}` | **[Phase 2]** | **Non promue publiquement** |
| Narrative nodes / edges | `/data/narrative_nodes`, `/data/narrative_edges` | **[Research]** | **Non promue publiquement** |
| BeliefVersion / ValueProfileVersion + recherche/IA/workflows juridiques avancés | Domaine + non exposé v1 | **[Research]** | **Non promue publiquement** |

## 3) Definition of Done (DoD) — canon commun

Le MVP est **Done** quand un utilisateur peut, de bout en bout :
1. s’authentifier,
2. déposer et gérer un coffre chiffré de documents/messages de transmission,
3. enregistrer des héritiers/contacts de confiance,
4. initier un déclenchement posthume contrôlé (signal décès + validation + remise),
5. disposer d’une traçabilité complète des actions critiques,
6. exporter et remettre le contenu de façon sécurisée aux destinataires autorisés.

## 4) KPI de succès MVP

1. Taux de configuration complète d’une capsule posthume.
2. Taux de désignation d’au moins un héritier vérifié.
3. Taux de déclenchements validés sans incident.
4. Taux d’export/remise réussis.
5. Couverture de journalisation des actions critiques.

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Harmonisation du périmètre de ce document avec la source canonique MVP. |
| 2026-02-17 | Product + Tech | Alignement au canon **“MVP posthume non-cognitif”** avec tags de scope communs **[MVP v1] / [Phase 2] / [Research]** et DoD unifiée. |
