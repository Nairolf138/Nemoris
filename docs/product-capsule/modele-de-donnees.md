# Modèle de données — Capsule v1

## In scope (Capsule v1)

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

## Phase 2

- Historique complet pour toutes les entités (audit data versioning global).
- Schéma d’événements append-only pour analytique et forensic.
- Indexation orientée recherche sémantique.

## Research

- Ontologie cognitive partagée et typage enrichi des relations narratives.
- Compatibilité avec standards externes de data portability patrimoniale.
