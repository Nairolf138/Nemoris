# Contrat d'export MVP (JSON/PDF)

Ce document décrit le **format contractuel** du payload exporté côté MVP.

## Version de schéma

- `metadata.schema_version` est actuellement fixé à `1.0.0`.
- Tout changement breaking du format doit faire évoluer cette version.

## Payload JSON

L'export JSON sérialise la structure suivante :

```json
{
  "metadata": {
    "schema_version": "1.0.0",
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
  ]
}
```

## Règles MVP

- `transmission_rules` est la source de vérité des liaisons message ↔ bénéficiaire.
- Les règles sont **dédupliquées** (`legacy_message_id`, `beneficiary_id`) et ordonnées de façon déterministe.
- Les exports PDF sont générés à partir du même payload contractuel et réutilisent `transmission_rules` pour le récapitulatif bénéficiaires.

## Compatibilité API

- `POST /exports` crée un export avec `format: json | pdf`.
- `GET /exports/{id}/download` expose :
  - `mime_type`
  - `content_base64` (payload JSON ou binaire PDF en base64)
