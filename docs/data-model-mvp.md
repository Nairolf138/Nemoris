# Data model MVP — couche data/domain

Ce document décrit les entités minimales du MVP pour les modules mémoire, convictions, leçons, valeurs, narration et transmission.

## Principes transverses

Chaque entité principale contient au minimum :
- `id`
- `owner_id`
- `created_at`
- `updated_at`
- `visibility`

Les identifiants croisés (`*_ids`) permettent les liens inter-modules sans couplage fort (approche orientée référence).

## Entités de base

## 1) Memory
Rôle : stocker un souvenir atomique (événement, note, document, média) et ses liens vers les autres modules.

Champs clés supplémentaires :
- `occurred_at`
- `title`
- `related_belief_ids`
- `related_lesson_ids`
- `related_value_profile_ids`
- `related_narrative_node_ids`

```json
{
  "id": "mem_01HQ8QK9A",
  "owner_id": "usr_001",
  "visibility": "private",
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-20T10:00:00Z",
  "occurred_at": "2019-09-01T00:00:00Z",
  "title": "Lancement de ma première entreprise",
  "description": "Décision de quitter mon emploi salarié.",
  "memory_type": "event",
  "related_belief_ids": ["bel_001"],
  "related_lesson_ids": ["les_002"],
  "related_value_profile_ids": ["val_003"],
  "related_narrative_node_ids": ["node_010"]
}
```

## 2) Belief (+ versioning)
Rôle : représenter une conviction courante, avec preuve et historique.

Champs clés supplémentaires :
- `belief_key`
- `statement`
- `status`
- `current_version_number`
- `evidence_memory_ids`
- `previous_belief_id` (optionnel)

Historique simple : table/collection `BeliefVersion` avec `version_number` croissant.

```json
{
  "belief": {
    "id": "bel_001",
    "owner_id": "usr_001",
    "visibility": "private",
    "created_at": "2026-01-20T10:15:00Z",
    "updated_at": "2026-02-01T08:00:00Z",
    "belief_key": "work-is-identity",
    "statement": "Ma valeur dépend de ma performance professionnelle.",
    "confidence_score": 0.82,
    "status": "active",
    "current_version_number": 3,
    "evidence_memory_ids": ["mem_01HQ8QK9A", "mem_01HQ8QK9B"],
    "related_lesson_ids": ["les_004"]
  },
  "versions": [
    {
      "id": "belv_001",
      "owner_id": "usr_001",
      "visibility": "private",
      "created_at": "2026-01-20T10:15:00Z",
      "updated_at": "2026-01-20T10:15:00Z",
      "belief_id": "bel_001",
      "version_number": 1,
      "statement": "Le travail doit passer avant tout.",
      "evidence_memory_ids": ["mem_legacy_01"]
    },
    {
      "id": "belv_003",
      "owner_id": "usr_001",
      "visibility": "private",
      "created_at": "2026-02-01T08:00:00Z",
      "updated_at": "2026-02-01T08:00:00Z",
      "belief_id": "bel_001",
      "version_number": 3,
      "statement": "Ma valeur ne dépend pas uniquement du travail.",
      "change_reason": "Burnout + thérapie",
      "evidence_memory_ids": ["mem_01HQ8QK9B", "mem_01HQ8QK9C"]
    }
  ]
}
```

## 3) Lesson
Rôle : capitaliser une erreur, son contexte et l’apprentissage exploitable.

Champs clés supplémentaires :
- `lesson_text`
- `source_memory_ids`
- `linked_belief_ids`
- `linked_value_profile_ids`

```json
{
  "id": "les_004",
  "owner_id": "usr_001",
  "visibility": "trusted_circle",
  "created_at": "2026-02-02T09:00:00Z",
  "updated_at": "2026-02-02T09:00:00Z",
  "title": "Ne pas ignorer les signaux faibles",
  "lesson_text": "Une fatigue chronique répétée est un signal critique.",
  "severity": "high",
  "source_memory_ids": ["mem_01HQ8QK9B"],
  "linked_belief_ids": ["bel_001"],
  "linked_value_profile_ids": ["val_003"]
}
```

## 4) ValueProfile (+ versioning)
Rôle : stocker la hiérarchie de valeurs à une période donnée, avec preuve.

Champs clés supplémentaires :
- `profile_label`
- `values[]` (`value_id`, `label`, `score`)
- `current_version_number`
- `evidence_memory_ids`
- `narrative_node_ids`

Historique simple : table/collection `ValueProfileVersion` avec `version_number` croissant.

```json
{
  "value_profile": {
    "id": "val_003",
    "owner_id": "usr_001",
    "visibility": "private",
    "created_at": "2026-01-22T10:00:00Z",
    "updated_at": "2026-02-03T11:00:00Z",
    "profile_label": "32-35 ans",
    "age_range": "32-35",
    "values": [
      { "value_id": "health", "label": "Santé", "score": 0.92 },
      { "value_id": "family", "label": "Famille", "score": 0.88 }
    ],
    "current_version_number": 2,
    "evidence_memory_ids": ["mem_01HQ8QK9B"],
    "narrative_node_ids": ["node_010"]
  },
  "versions": [
    {
      "id": "valv_001",
      "owner_id": "usr_001",
      "visibility": "private",
      "created_at": "2026-01-22T10:00:00Z",
      "updated_at": "2026-01-22T10:00:00Z",
      "value_profile_id": "val_003",
      "version_number": 1,
      "values": [
        { "value_id": "career", "label": "Carrière", "score": 0.9 },
        { "value_id": "family", "label": "Famille", "score": 0.7 }
      ],
      "evidence_memory_ids": ["mem_01HQ8QK9A"]
    }
  ]
}
```

## 5) NarrativeNode
Rôle : nœud du graphe narratif (événement/personne/décision/bascule/leçon).

Champs clés supplémentaires :
- `node_type`
- `label`
- `memory_ids`
- `belief_ids`
- `lesson_ids`
- `value_profile_ids`

```json
{
  "id": "node_010",
  "owner_id": "usr_001",
  "visibility": "private",
  "created_at": "2026-02-05T08:30:00Z",
  "updated_at": "2026-02-05T08:30:00Z",
  "node_type": "decision",
  "label": "Réduction du temps de travail",
  "memory_ids": ["mem_01HQ8QK9B"],
  "belief_ids": ["bel_001"],
  "lesson_ids": ["les_004"],
  "value_profile_ids": ["val_003"]
}
```

## 6) NarrativeEdge
Rôle : relation causale entre deux nœuds.

Champs clés supplémentaires :
- `from_node_id`
- `to_node_id`
- `relation_type`
- `evidence_memory_ids`
- `belief_ids`
- `lesson_ids`

```json
{
  "id": "edge_021",
  "owner_id": "usr_001",
  "visibility": "private",
  "created_at": "2026-02-05T08:40:00Z",
  "updated_at": "2026-02-05T08:40:00Z",
  "from_node_id": "node_010",
  "to_node_id": "node_011",
  "relation_type": "causes",
  "weight": 0.76,
  "evidence_memory_ids": ["mem_01HQ8QK9B"],
  "belief_ids": ["bel_001"],
  "lesson_ids": ["les_004"]
}
```

## 7) LegacyMessage
Rôle : message de transmission post-mortem conditionnelle.

Champs clés supplémentaires :
- `message`
- `trigger_type`
- `recipient_ids`
- références croisées vers mémoire/convictions/leçons/valeurs/nœuds narratifs
- `delivery_status`

```json
{
  "id": "leg_001",
  "owner_id": "usr_001",
  "visibility": "posthumous",
  "created_at": "2026-02-06T09:00:00Z",
  "updated_at": "2026-02-06T09:00:00Z",
  "title": "À mes enfants",
  "message": "N'ignorez jamais votre santé pour réussir plus vite.",
  "trigger_type": "verified_death",
  "recipient_ids": ["usr_child_1", "usr_child_2"],
  "attachment_memory_ids": ["mem_01HQ8QK9B"],
  "related_belief_ids": ["bel_001"],
  "related_lesson_ids": ["les_004"],
  "related_value_profile_ids": ["val_003"],
  "related_narrative_node_ids": ["node_010"],
  "delivery_status": "armed"
}
```

## Résumé des relations croisées

- `Memory` est la source de preuve transverse principale (`evidence_memory_ids`, `source_memory_ids`, `attachment_memory_ids`).
- `Belief` ↔ `Lesson` : relation bidirectionnelle via `related_lesson_ids` et `linked_belief_ids`.
- `ValueProfile` ↔ `NarrativeNode` : relation bidirectionnelle via `narrative_node_ids` et `value_profile_ids`.
- `NarrativeEdge` matérialise la causalité entre `NarrativeNode` et réutilise les preuves mémoire et leçons.
- `LegacyMessage` fédère les références inter-modules pour transmettre contexte + apprentissage.
