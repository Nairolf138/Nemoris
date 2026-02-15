# Périmètre MVP (v1)

> Document aligné sur la source canonique : `docs/product-capsule/scope-fonctionnel.md`.

## 1) Inventaire des fonctionnalités réellement exposées

Inventaire consolidé depuis le modèle métier (`packages/core/src/domain/entities.ts`) et l’API (`apps/capsule-api/src/app.ts`).

## 2) Matrice In/Out-of-scope

| Feature | Statut | Surface API |
| --- | --- | --- |
| Auth (register/login/logout/refresh) | **In scope v1** | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh` |
| Memories | **In scope v1** | `/data/memories`, `/data/memories/{id}` |
| Beliefs | **In scope v1** | `/data/beliefs`, `/data/beliefs/{id}` |
| Lessons | **In scope v1** | `/data/lessons`, `/data/lessons/{id}` |
| Value profiles | **In scope v1** | `/data/value_profiles`, `/data/value_profiles/{id}` |
| Legacy messages | **In scope v1** | `/data/legacy_messages`, `/legacy-messages/{id}/{arm|trigger|revoke|deliver|delivery-attempts}` |
| Beneficiaries | **In scope v1** | `/data/beneficiaries`, `/data/beneficiaries/{id}` |
| Narrative nodes | **In scope v1** | `/data/narrative_nodes`, `/data/narrative_nodes/{id}` |
| Narrative edges | **In scope v1** | `/data/narrative_edges`, `/data/narrative_edges/{id}` |
| Consent scopes | **In scope v1** | `/consent/grant`, `/consent/revoke`, `/consent/history` |
| Exports | **In scope v1** | `/exports`, `/exports/{id}/download`, `/exports/audit` |
| Recherche avancée | **Phase 2** | N/A v1 |
| Graphe narratif interactif avancé | **Phase 2** | N/A v1 |
| Workflows juridiques complets | **Research** | N/A v1 |
| IA complexe | **Research** | N/A v1 |

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
