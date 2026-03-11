# Product Boundaries — Règles obligatoires de contribution

Ce document définit les frontières produit à respecter dans tout le dépôt.

## Règles obligatoires

1. **README principal = capsule uniquement**
   - Le fichier `README.md` doit décrire uniquement le produit Capsule (shipping).
   - Aucune fonctionnalité de vision cognitive ne doit y être présentée comme disponible.

2. **Vision cognitive uniquement dans `docs/vision-cognitive/`**
   - Toute formulation liée à la vision cognitive, aux hypothèses de recherche et aux pistes R&D doit être centralisée dans `docs/vision-cognitive/`.
   - Les autres sections de documentation doivent rediriger vers ce dossier sans dupliquer de promesse produit.

3. **Tout futur est tagué `Phase 2` / `Research` / `Not in scope`**
   - Toute initiative non livrée doit être explicitement taguée avec l’un de ces statuts.
   - L’absence de tag est considérée comme non conforme.

4. **Toute PR doit préciser la piste impactée**
   - Chaque pull request doit indiquer clairement la piste concernée :
     - `Capsule` (shipping produit), ou
     - `Cognitive R&D` (vision/recherche).


5. **Terminologie canonique obligatoire**
   - Tout nouveau document doit respecter `docs/product-capsule/glossaire-metier.md`.
   - Toute terminologie hors glossaire (ex. formulations ambiguës) est considérée non conforme tant qu’elle n’est pas remplacée.

## Application en revue

Une contribution peut être refusée si elle :
- brouille la séparation Capsule vs Cognitive R&D,
- présente une piste R&D comme une fonctionnalité déjà disponible,
- omet les tags de scope attendus,
- utilise une terminologie hors glossaire métier canonique (`docs/product-capsule/glossaire-metier.md`).
