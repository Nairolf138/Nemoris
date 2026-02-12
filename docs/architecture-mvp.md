# Architecture MVP — Nemoris (fonction par fonction)

## Objectif MVP
Lancer une première version exploitable qui unit :
- mémoire personnelle/familiale,
- structuration cognitive,
- transmission volontaire,
- gouvernance de confiance minimale (sécurité, consentement, audit).

---

## 1) Module « Mémoire de vie »

### Fonctionnalités MVP
- Création d’entrées de mémoire (texte, image, document, audio, vidéo).
- Classement par date, période de vie, et tags.
- Timeline personnelle avec filtres.

### Données clés
- `memory_id`
- `owner_id`
- `title`, `description`
- `media_type`, `media_url`
- `event_date`, `created_at`
- `tags[]`
- `visibility_scope`

### Critères d’acceptation
- Un utilisateur peut créer, modifier, archiver une entrée.
- Les entrées s’affichent en timeline chronologique.
- Une entrée peut être reliée à conviction/leçon/valeur/nœud narratif.

---

## 2) Module « Évolution des convictions »

### Fonctionnalités MVP
- Saisie de convictions par période (ex: 18-25 ans, 26-35 ans).
- Description des déclencheurs de changement (événement, lecture, rencontre).
- Visualisation simple « avant / après ».

### Données clés
- `belief_id`
- `owner_id`
- `period_label`
- `belief_statement`
- `change_trigger`
- `confidence_level` (1-5)

### Critères d’acceptation
- Une conviction peut être versionnée dans le temps.
- L’utilisateur peut lier un changement à une mémoire existante.

---

## 3) Module « Erreurs majeures & leçons »

### Fonctionnalités MVP
- Formulaire structuré : contexte → décision → conséquence → leçon.
- Typologie d’erreur (jugement, émotion, éthique, relationnel).
- Marquage « partageable » / « privé ».

### Données clés
- `lesson_id`
- `owner_id`
- `context`
- `decision_taken`
- `consequence`
- `lesson_learned`
- `error_type`
- `share_permission`

### Critères d’acceptation
- Une leçon peut être exportée en format lisible (PDF/texte).
- Les leçons apparaissent dans un espace dédié et filtrable.

---

## 4) Module « Valeurs déclarées à différents âges »

### Fonctionnalités MVP
- Déclaration de top 5 valeurs par période de vie.
- Évaluation de cohérence perçue (valeur proclamée vs vécue).
- Comparaison entre deux périodes.

### Données clés
- `value_profile_id`
- `owner_id`
- `period_label`
- `values_ranked[]`
- `alignment_score` (0-100)
- `reflection_note`

### Critères d’acceptation
- L’utilisateur peut visualiser l’évolution de ses valeurs.
- Les périodes comparées s’affichent côte à côte.

---

## 5) Module « Graphe narratif de vie »

### Fonctionnalités MVP
- Création de nœuds : événement, personne, décision, rupture, réussite.
- Création de liens causaux (« a influencé », « a provoqué », « a transformé »).
- Vue graphe interactive simple (zoom + sélection nœud).

### Données clés
- `node_id`, `edge_id`
- `owner_id`
- `node_type`, `node_label`
- `edge_type`, `source_node`, `target_node`
- `evidence_memory_ids[]`

### Critères d’acceptation
- Un utilisateur peut créer au moins 20 nœuds sans perte de performance notable.
- Cliquer un nœud affiche les mémoires/preuves associées.

---

## 6) Module « Transmission post-mortem volontaire »

### Fonctionnalités MVP
- Création de messages de transmission.
- Déclencheurs simples : date, âge du destinataire, événement manuel validé.
- Niveaux d’accès : privé, famille, contact nommé.

### Données clés
- `legacy_message_id`
- `owner_id`, `recipient_id`
- `trigger_type`, `trigger_value`
- `message_content`
- `access_level`
- `revocable` (bool)

### Critères d’acceptation
- L’auteur peut activer/désactiver une transmission.
- Un journal d’audit trace les changements de règles.

---

## Capacités transverses indispensables (MVP)

- Authentification + gestion des rôles.
- Chiffrement des données sensibles au repos et en transit.
- Journal d’audit (actions sensibles).
- Export des données personnelles (portabilité).
- Consentement et paramètres de confidentialité explicites.
- Traces d’intégrité sur les opérations critiques de transmission.

---

## Parcours utilisateur MVP (de l’idée à l’usage)

1. L’utilisateur crée son profil et configure sa confidentialité.
2. Il ajoute ses premières mémoires de vie.
3. Il renseigne une conviction, une erreur majeure, et un profil de valeurs.
4. Il relie ces éléments dans son graphe narratif.
5. Il configure une première transmission volontaire.
6. Il exporte un récapitulatif « héritage cognitif » partageable.

---

## Roadmap d’exécution en 3 phases

### Phase 1 — Fondations (4-6 semaines)
- Authentification, modèle de données, module Mémoire.
- Interface timeline + CRUD de base.
- Paramètres de confidentialité initiaux.

### Phase 2 — Cœur cognitif (4-6 semaines)
- Convictions, Erreurs/Leçons, Valeurs.
- Liaisons entre modules.
- Premiers exports lisibles.

### Phase 3 — Transmission et visualisation (4-6 semaines)
- Graphe narratif.
- Transmission post-mortem MVP.
- Audit, durcissement sécurité, stabilisation.

---

## Tâches nécessaires (backlog exécutable)

### Epic 1 — Modèle de données unifié
- [ ] Créer les entités `Memory`, `Belief`, `Lesson`, `ValueProfile`, `NarrativeNode`, `NarrativeEdge`, `LegacyMessage`.
- [ ] Implémenter les relations croisées (`evidence_memory_ids`, références inter-modules).
- [ ] Ajouter versionning sur convictions et valeurs.

### Epic 2 — Gouvernance et contrôle utilisateur
- [ ] Implémenter règles de visibilité granulaires par ressource.
- [ ] Ajouter gestion des consentements et révocations horodatées.
- [ ] Déployer journal d’audit pour actions sensibles.

### Epic 3 — Expérience cognitive
- [ ] Concevoir composants UI communs (timeline, cartes de réflexion, comparateurs de périodes).
- [ ] Déployer vues “avant/après” convictions et “cohérence des valeurs”.
- [ ] Construire formulaire guidé “erreur → leçon”.

### Epic 4 — Graphe narratif
- [ ] Définir taxonomie des nœuds/liens.
- [ ] Implémenter visualisation interactive et panneau de contexte.
- [ ] Ajouter validation des liens causaux avec preuves.

### Epic 5 — Transmission post-mortem
- [ ] Concevoir moteur de déclencheurs et états de workflow.
- [ ] Sécuriser le processus de validation de déclenchement.
- [ ] Implémenter notifications et journal des remises.

### Epic 6 — Conformité, confiance et industrialisation
- [ ] Préparer flux RGPD (export, suppression, accès).
- [ ] Définir stratégie de chiffrement et rotation des clés.
- [ ] Mettre en place monitoring sécurité + plan de réponse incident.
