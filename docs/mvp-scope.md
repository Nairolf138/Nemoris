# Périmètre MVP (v1)

> Document aligné sur la source canonique : `docs/product-capsule/scope-fonctionnel.md`.

## 1) Inventaire harmonisé des fonctionnalités exposées

Inventaire consolidé depuis le modèle métier (`packages/core/src/domain/entities.ts`) et l’API (`apps/capsule-api/src/app.ts`).

## 2) Classement In scope Capsule v1 vs Phase suivante

| Feature | Surface (code/API) | Classification | Statut public v1 |
| --- | --- | --- | --- |
| Auth | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh` | **In scope Capsule v1** | Promue publiquement |
| Memories / Beliefs / Lessons / Value profiles | `/data/{memories\|beliefs\|lessons\|value_profiles}` | **In scope Capsule v1** | Promue publiquement |
| Beneficiaries | `/data/beneficiaries` | **In scope Capsule v1** | Promue publiquement |
| Legacy messages + orchestration | `/data/legacy_messages`, `/legacy-messages/{id}/{arm\|trigger\|revoke\|deliver}` | **In scope Capsule v1** | Promue publiquement |
| Narrative nodes / edges | `/data/narrative_nodes`, `/data/narrative_edges` | **In scope Capsule v1** | Promue publiquement |
| Consent scopes (`data_export`, `post_mortem_transmission`, `posthumous_visibility`) | `/consent/grant`, `/consent/revoke`, `/consent/history` | **In scope Capsule v1** | Promue publiquement |
| Export utilisateur | `/exports`, `/exports/{id}/download` | **In scope Capsule v1** | Promue publiquement |
| Audit export | `/exports/audit` | **Phase suivante** | **Non promue publiquement** |
| Observability (audit/dashboard) | `/observability/audit`, `/observability/dashboard` | **Phase suivante** | **Non promue publiquement** |
| Delivery attempts legacy message | `/legacy-messages/{id}/delivery-attempts` | **Phase suivante** | **Non promue publiquement** |
| BeliefVersion / ValueProfileVersion | `entities.ts` uniquement, pas d’endpoint dédié | **Phase suivante** | **Non promue publiquement** |
| Recherche avancée / graphe avancé / automatisation complète / juridique / IA avancée | Non exposé v1 | **Phase suivante** | Non communiqué v1 |

## 3) KPI de succès MVP

1. Taux d’onboarding terminé.
2. Nombre moyen d’entrées créées par utilisateur actif (30 jours).
3. Taux de création de liens entre éléments.
4. Taux d’export réussi.
5. Rétention à J+7.

## 4) Definition of Done (DoD)

Le MVP est considéré comme **Done** quand un utilisateur peut, de bout en bout :

1. S’authentifier de manière fiable.
2. Créer et modifier des contenus (`memories`, `beliefs`, `lessons`, `value_profiles`).
3. Gérer `beneficiaries` et `legacy_messages` avec orchestration contrôlée.
4. Gérer un graphe narratif basique (`narrative_nodes`, `narrative_edges`).
5. Accorder/révoquer des consentements et exporter son corpus sans blocage.

## 5) Validation finale — Checklist signée Produit + Tech

**Version candidate** : `v0.1.0-rc.1`

### Checklist Produit

- [x] Le périmètre fonctionnel v1 est respecté (aucune fonctionnalité hors scope n’est requise).
- [x] Les parcours critiques (onboarding → création de contenu → transmission consentie → export) sont validés.
- [x] Les KPI sont instrumentés et mesurables.
- [x] Les critères d’acceptation UX minimum sont atteints.

**Signature Produit** : Clara Martin  
**Nom** : Product Owner MVP  
**Date** : 15 / 02 / 2026

### Checklist Tech

- [x] Les fonctionnalités incluses sont livrées et testées.
- [x] Les exports sont stables sur l’environnement cible.
- [x] La sécurité de base (auth, session, autorisations minimales, consent) est validée.
- [x] La supervision minimale (logs d’erreur + métriques KPI) est en place.

**Signature Tech** : Hugo Laurent  
**Nom** : Tech Lead MVP  
**Date** : 15 / 02 / 2026

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Harmonisation du périmètre de ce document avec la source canonique MVP. |
| 2026-02-15 | Product + Tech | Ajout explicite de l’inventaire et du statut des features exposées côté code/API (legacy messages, beneficiaries, narrative nodes/edges, consent scopes). |
| 2026-02-16 | Product + Tech | Arbitrage officiel : toute feature exposée est classée In scope Capsule v1 ou Phase suivante ; les surfaces techniques existantes mais non packagées commercialement sont marquées **non promue publiquement**. |
