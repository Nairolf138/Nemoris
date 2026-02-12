# Architecture MVP — Nemoris

> Architecture strictement alignée sur le scope canonique : `docs/product-capsule/scope-fonctionnel.md`.

## Objectif MVP

Livrer une première version exploitable permettant à un utilisateur de :
- s’authentifier,
- créer et structurer ses contenus (Mémoire, Convictions, Leçons, Valeurs),
- relier ces contenus,
- exporter en PDF et JSON.

## Modules applicatifs in scope

### 1) Authentification & session

**Fonctionnalités MVP**
- Inscription, connexion, déconnexion.
- Session utilisateur basique.

**Données clés**
- `user_id`
- `email`
- `password_hash`
- `session_token`
- `created_at`, `updated_at`

### 2) Module Mémoire

**Fonctionnalités MVP**
- CRUD mémoire.
- Consultation chronologique simple.

**Données clés**
- `memory_id`
- `owner_id`
- `title`, `description`
- `event_date`, `created_at`, `updated_at`

### 3) Module Convictions

**Fonctionnalités MVP**
- Création et édition de convictions.
- Liaison optionnelle à des mémoires.

**Données clés**
- `belief_id`
- `owner_id`
- `statement`
- `linked_memory_ids[]`

### 4) Module Leçons

**Fonctionnalités MVP**
- Ajout, mise à jour, archivage simple.

**Données clés**
- `lesson_id`
- `owner_id`
- `context`, `lesson_learned`
- `is_archived`

### 5) Module Valeurs

**Fonctionnalités MVP**
- Définition et priorisation des valeurs.
- Liaison avec convictions/leçons.

**Données clés**
- `value_id`
- `owner_id`
- `label`
- `priority`
- `linked_belief_ids[]`, `linked_lesson_ids[]`

### 6) Liens inter-objets

**Fonctionnalités MVP**
- Création manuelle de liens entre objets de domaine.
- Navigation basique entre éléments liés.

**Données clés**
- `link_id`
- `owner_id`
- `source_type`, `source_id`
- `target_type`, `target_id`
- `created_at`

### 7) Export

**Fonctionnalités MVP**
- Export PDF lisible.
- Export JSON structuré.

**Données clés**
- `export_id`
- `owner_id`
- `format` (`pdf`/`json`)
- `status`
- `created_at`

## Capacités transverses minimales

- Autorisations minimales par utilisateur.
- Journalisation d’erreurs applicatives.
- Instrumentation des KPI MVP (onboarding, activité, liens, exports, rétention).

## Out of scope (architecture MVP)

- Recherche avancée sémantique / filtres complexes.
- IA conversationnelle/générative avancée.
- Graphe narratif interactif avancé.
- Transmission post-mortem automatisée.
- Workflows juridiques post-mortem complets.

## Definition of Done (rappel)

Le MVP est livré quand un utilisateur peut s’authentifier, créer/modifier les quatre types de contenus, les relier et exporter en PDF/JSON sans blocage.

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Simplification de l’architecture MVP aux seuls modules in scope du document canonique. |
