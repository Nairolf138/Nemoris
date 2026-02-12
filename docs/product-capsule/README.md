# Product Capsule — Index documentaire

Ce dossier centralise les documents de référence MVP sous une structure unique « product capsule ».

## Convention de marquage

Chaque section doit être marquée avec l’un des statuts suivants :

- **In scope (Capsule v1)** : livré dans le périmètre MVP validé.
- **Phase 2** : prévu après la capsule v1, déjà cadré.
- **Research** : piste exploratoire, non engagée.

## Index

- [Scope fonctionnel](./scope-fonctionnel.md)
- [Architecture](./architecture.md)
- [Modèle de données](./modele-de-donnees.md)
- [Sécurité & conformité](./securite-conformite-threat-model.md)
- [Roadmap shipping](./roadmap-shipping.md)

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
