# Product Capsule — Index documentaire

Ce dossier centralise les documents de référence MVP sous une structure unique « product capsule ».

## Convention de marquage

Chaque fonctionnalité doit afficher un tag explicite, sans ambiguïté :

- **[Disponible maintenant]** : fonctionnalité livrée et utilisable dans la version actuelle.
- **[Prévu plus tard]** : fonctionnalité planifiée pour une version ultérieure, non livrée actuellement.
- **[Recherche]** : piste exploratoire, sans engagement de livraison.

## Mini glossaire de statuts

- **Disponible maintenant** : l'utilisateur peut déjà utiliser la fonctionnalité.
- **Prévu plus tard** : la fonctionnalité n'est pas encore disponible ; elle reste au backlog roadmap.
- **Recherche** : la fonctionnalité est étudiée ; elle peut être modifiée, reportée ou abandonnée.

## Tableau de référence — Feature -> Statut -> Surface API

| Feature | Statut | Surface API principale |
| --- | --- | --- |
| Auth | **[Disponible maintenant]** | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh` |
| Memories | **[Disponible maintenant]** | `/data/memories` |
| Beliefs | **[Disponible maintenant]** | `/data/beliefs` |
| Lessons | **[Disponible maintenant]** | `/data/lessons` |
| Value profiles | **[Disponible maintenant]** | `/data/value_profiles` |
| Legacy messages | **[Disponible maintenant]** | `/data/legacy_messages`, `/legacy-messages/{id}/{arm|trigger|revoke|deliver|delivery-attempts}` |
| Beneficiaries | **[Disponible maintenant]** | `/data/beneficiaries` |
| Narrative nodes | **[Disponible maintenant]** | `/data/narrative_nodes` |
| Narrative edges | **[Disponible maintenant]** | `/data/narrative_edges` |
| Consent scopes | **[Disponible maintenant]** | `/consent/grant`, `/consent/revoke`, `/consent/history` |
| Exports | **[Disponible maintenant]** | `/exports`, `/exports/{id}/download` (audit interne non promu en v1) |
| Graphe narratif interactif avancé | **[Prévu plus tard]** | N/A v1 |
| Workflows juridiques complets | **[Recherche]** | N/A v1 |
| IA avancée | **[Recherche]** | N/A v1 |

## Index

- [Scope fonctionnel](./scope-fonctionnel.md)
- [Architecture](./architecture.md)
- [Modèle de données](./modele-de-donnees.md)
- [Sécurité & conformité](./securite-conformite-threat-model.md)
- [Roadmap shipping](./roadmap-shipping.md)
- [Pricing & go-to-market](./pricing-go-to-market.md)
- [Offre & pricing MVP](./pricing-offer-mvp.md)
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
- Toute projection future doit être taguée **[Prévu plus tard]** ou **[Recherche]** et formulée comme non livrée.
- Toute vision cognitive détaillée doit rester dans `docs/vision-cognitive/`.
- En PR, préciser explicitement la piste impactée : **Capsule** ou **Cognitive R&D**.
