# ROADMAP — Product Capsule

> Cette roadmap est alignée sur le scope canonique : `docs/product-capsule/scope-fonctionnel.md`.

## Légende de statut

- **[Disponible maintenant]** : lot livré dans le scope MVP actuel.
- **[Prévu plus tard]** : lot planifié pour une version suivante, non livré actuellement.
- **[Recherche]** : lot exploratoire, sans engagement de livraison.

## Phases P0 → P6

### P0 — Fondation sécurité (**[Disponible maintenant]**)

**Objectif**  
Poser les fondations sécurité, accès et traçabilité minimales avant l'ouverture des parcours métier.

**Livrables clés**
- Authentification (inscription, connexion, déconnexion, refresh) + session basique.
- Isolation des données par propriétaire (`owner_id`) et contrôles d'accès minimaux.
- Journaux de sécurité et événements d'authentification exploitables côté ops.

### P1 — Contenu + héritiers (**[Disponible maintenant]**)

**Objectif**  
Rendre possible la constitution de capsule et la désignation d'héritiers.

**Livrables clés**
- CRUD `memories`, `beliefs`, `lessons`, `value_profiles`.
- CRUD `beneficiaries`.
- Liaisons manuelles de contenu et cohérence inter-entités.

### P2 — Déclenchement (**[Disponible maintenant]**)

**Objectif**  
Introduire un déclenchement encadré des transmissions.

**Livrables clés**
- Orchestration `legacy_messages` (`arm/trigger/revoke`).
- Préconditions de déclenchement et garde-fous anti-déclenchement accidentel.
- Traçabilité des transitions d'état critiques.

### P3 — Messages conditionnels / remise (**[Prévu plus tard]**)

**Objectif**  
Fiabiliser la remise selon des conditions métier explicites.

**Livrables clés**
- Conditions de diffusion/temporisation des `legacy_messages`.
- Mécanismes de remise (`deliver`) et historisation des tentatives.
- Contrôles de cohérence entre consentement et transmission.

### P4 — Guide héritiers (**[Prévu plus tard]**)

**Objectif**  
Améliorer l'expérience d'appropriation côté héritier.

**Livrables clés**
- Parcours guidé de consultation pour héritiers.
- Narratif structuré (nœuds/relations) orienté onboarding.
- Aides contextuelles sur droits, limites et étapes de récupération.

### P5 — Qualif & conformité (**[Prévu plus tard]**)

**Objectif**  
Consolider la qualification qualité, la conformité et les preuves d'audit.

**Livrables clés**
- Consent management renforcé (`grant/revoke/history`) et preuves exploitables.
- Export utilisateur + audit export (`/exports`, `/exports/{id}/download`, `/exports/audit`).
- Dossier de conformité (juridique, sécurité, opérations) prêt pour validation de release.

### P6 — Pilotes partenaires (**[Recherche]**)

**Objectif**  
Valider l'opérabilité en conditions réelles avec partenaires externes.

**Livrables clés**
- Cadre de pilote (population, métriques de succès, protocole d'escalade).
- Observabilité étendue (`/observability/audit`, `/observability/dashboard`).
- Boucle de feedback produit/compliance pour industrialisation.

## Matrice Feature -> Scope -> Phase

| Feature | Classification | Statut public v1 | Phase cible |
| --- | --- | --- | --- |
| Auth + contrôles d'accès + isolation des données | **[Disponible maintenant]** | Promue publiquement | P0 |
| Contenus cœur (`memories`, `beliefs`, `lessons`, `value_profiles`) + héritiers (`beneficiaries`) | **[Disponible maintenant]** | Promue publiquement | P1 |
| Orchestration `legacy_messages` (`arm/trigger/revoke`) | **[Disponible maintenant]** | Promue publiquement | P2 |
| Remise conditionnelle + tentatives de delivery | **[Prévu plus tard]** | **Non promue publiquement** | P3 |
| Parcours guide héritiers + narration orientée onboarding | **[Prévu plus tard]** | Non communiqué v1 | P4 |
| Consent scopes + export + audit conformité | **[Prévu plus tard]** | **Non promue publiquement** | P5 |
| Pilotes partenaires + observabilité avancée | **[Recherche]** | Non communiqué v1 | P6 |

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Recentrage de la roadmap sur le scope canonique et séparation explicite des extensions en **[Prévu plus tard]**/**[Recherche]**. |
| 2026-02-16 | Product + Tech | Remplacement des milestones historiques par un séquencement P0→P6 (sécurité, contenu/héritiers, déclenchement, remise conditionnelle, guide héritiers, qualif/conformité, pilotes partenaires). |
