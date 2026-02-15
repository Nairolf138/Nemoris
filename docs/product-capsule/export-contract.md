# Contrat d'export MVP (JSON/PDF)

Ce document décrit le **format contractuel** du payload exporté côté MVP, en distinguant:

- l'**export technique JSON** (payload machine-readable complet),
- le **dossier famille PDF** (restitution lisible et imprimable, organisée par sections).

## Version de schéma

- `metadata.schema_version` est actuellement fixé à `1.1.0`.
- Tout changement breaking du format doit faire évoluer cette version.

## Export technique JSON

L'export JSON sérialise la structure contractuelle complète, incluant les données source et la projection `family_dossier`:

```json
{
  "metadata": {
    "schema_version": "1.1.0",
    "exported_at": "2026-01-01T00:00:00.000Z",
    "owner_id": "owner-1",
    "generated_by_user_id": "owner-1",
    "timezone": "Europe/Paris"
  },
  "memories": [],
  "beliefs": [],
  "lessons": [],
  "value_profiles": [],
  "legacy_messages": [],
  "beneficiaries": [],
  "transmission_rules": [
    {
      "legacy_message_id": "msg-1",
      "beneficiary_id": "benef-1"
    }
  ],
  "family_dossier": {
    "practical_instructions": [],
    "reportable_accounts": [],
    "messages": [],
    "documents_links": [],
    "beneficiaries_rules": {
      "beneficiaries": [],
      "transmission_rules": []
    }
  }
}
```

### Sections dédiées `family_dossier`

- `practical_instructions`: consignes opérationnelles extraites des leçons.
- `reportable_accounts`: comptes/services à signaler à la famille, avec redaction des champs mot de passe (`password_included: false` garanti).
- `messages`: synthèse des messages posthumes (titre, déclenchement, bénéficiaires).
- `documents_links`: références documentaires utiles (documents/médias + lien/référence).
- `beneficiaries_rules`: liste bénéficiaires + règles de transmission applicables.

## Dossier famille PDF

Le PDF n'est **pas** un nouveau contrat de données: c'est une vue éditoriale dérivée du JSON contractuel.

Objectifs de restitution:

- page lisible à l'impression,
- sommaire simple,
- sections explicites alignées sur `family_dossier`:
  1. Instructions pratiques,
  2. Comptes à signaler (sans mots de passe),
  3. Messages à transmettre,
  4. Documents et liens,
  5. Bénéficiaires et règles.

## Règles MVP

- `transmission_rules` reste la source de vérité des liaisons message ↔ bénéficiaire.
- Les règles sont **dédupliquées** (`legacy_message_id`, `beneficiary_id`) et ordonnées de façon déterministe.
- `family_dossier.beneficiaries_rules.transmission_rules` reprend ces règles pour la section familiale.
- Les exports PDF sont générés à partir du même payload contractuel.

## Compatibilité API

- `POST /exports` crée un export avec `format: json | pdf`.
- `GET /exports/{id}/download` expose :
  - `mime_type`
  - `content_base64` (payload JSON ou binaire PDF en base64)
