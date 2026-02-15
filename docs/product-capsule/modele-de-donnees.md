# Modèle de données — Capsule v1

## [Disponible maintenant] In scope (Capsule v1)

### Entités cœur
- `Memory` : événement/souvenir avec média, tags, visibilité.
- `Belief` + `BeliefVersion` : conviction et historique.
- `Lesson` : erreur/apprentissage capitalisé.
- `ValueProfile` + `ValueProfileVersion` : hiérarchie de valeurs par période.
- `NarrativeNode` : nœud narratif (événement, décision, bascule, etc.).
- `NarrativeEdge` : lien causal entre nœuds.
- `LegacyMessage` : message de transmission conditionnelle.

### Principes structurants
- `owner_id` sur toutes les entités métier.
- Références croisées explicites entre mémoire/conviction/leçon/valeurs/graphe.
- Versioning simple incrémental pour convictions et profils de valeurs.
- `visibility` (private / trusted_circle / posthumous...) pilotée par consentement.

## [Prévu plus tard] Phase 2

- Historique complet pour toutes les entités (audit data versioning global).
- Schéma d’événements append-only pour analytique et forensic.
- Indexation orientée recherche sémantique.

## [Recherche] Research

- Ontologie cognitive partagée et typage enrichi des relations narratives.
- Compatibilité avec standards externes de data portability patrimoniale.

## Règles minimales de cohérence (liens croisés v1)

- Toute référence inter-entités doit pointer vers un enregistrement existant et appartenant au même `owner_id`.
- La suppression d'une `Memory`, `Belief`, `Lesson` ou `ValueProfile` est refusée tant qu'au moins un autre enregistrement la référence (HTTP `400 DOMAIN_VALIDATION_ERROR`).
- Pour supprimer une entité référencée, il faut d'abord retirer explicitement ses identifiants de tous les champs de lien (`*_ids`) concernés.
- Les liens doivent rester cohérents côté graphe narratif :
  - `NarrativeNode` ne peut référencer que des mémoires/convictions/leçons/profils de valeurs existants.
  - `NarrativeEdge` doit relier deux nœuds existants (`from_node_id != to_node_id`) et ne peut inclure que des preuves (`evidence_memory_ids`, `belief_ids`, `lesson_ids`) existantes.
- En UI/app, la navigation d'un élément vers ses liés repose sur ces garanties de cohérence (chargement timeline + liens manuels), ce qui évite les destinations cassées.
