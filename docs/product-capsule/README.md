# Product Capsule — Index documentaire

Ce dossier centralise les documents de référence MVP sous une structure unique « product capsule ».

## Convention de marquage

Chaque section doit être marquée avec l’un des statuts suivants :

- **In scope (Capsule v1)** : livré dans le périmètre MVP validé.
- **Phase 2** : prévu après la capsule v1, déjà cadré.
- **Research** : piste exploratoire, non engagée.

## Tableau de référence — Feature -> Statut -> Surface API

| Feature | Statut | Surface API principale |
| --- | --- | --- |
| Auth | In scope v1 | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh` |
| Memories | In scope v1 | `/data/memories` |
| Beliefs | In scope v1 | `/data/beliefs` |
| Lessons | In scope v1 | `/data/lessons` |
| Value profiles | In scope v1 | `/data/value_profiles` |
| Legacy messages | In scope v1 | `/data/legacy_messages`, `/legacy-messages/{id}/{arm|trigger|revoke|deliver|delivery-attempts}` |
| Beneficiaries | In scope v1 | `/data/beneficiaries` |
| Narrative nodes | In scope v1 | `/data/narrative_nodes` |
| Narrative edges | In scope v1 | `/data/narrative_edges` |
| Consent scopes | In scope v1 | `/consent/grant`, `/consent/revoke`, `/consent/history` |
| Exports | In scope v1 | `/exports`, `/exports/{id}/download`, `/exports/audit` |
| Graphe narratif interactif avancé | Phase 2 | N/A v1 |
| Workflows juridiques complets | Research | N/A v1 |
| IA avancée | Research | N/A v1 |

## Index

- [Scope fonctionnel](./scope-fonctionnel.md)
- [Architecture](./architecture.md)
- [Modèle de données](./modele-de-donnees.md)
- [Sécurité & conformité](./securite-conformite-threat-model.md)
- [Roadmap shipping](./roadmap-shipping.md)
- [Contrat OpenAPI](./openapi.yaml)

## Sources MVP consolidées

- `docs/mvp-scope.md`
- `docs/architecture-mvp.md`
- `docs/data-model-mvp.md`
- Éléments sécurité/threat-model issus des PDF :
  - `docs/Capsule_Numerique_Secu_Pentest_RGPD.pdf`
  - `docs/Capsule_Numerique_Dossier_Confiance_Ethique_et_Perenite.pdf`

## Rappel discipline de périmètre

- Cette documentation concerne uniquement la **piste Capsule** (shipping).
- Toute projection future doit être taguée **Phase 2**, **Research** ou **Not in scope**.
- Toute vision cognitive détaillée doit rester dans `docs/vision-cognitive/`.
- En PR, préciser explicitement la piste impactée : **Capsule** ou **Cognitive R&D**.
