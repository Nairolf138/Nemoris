# @capsule/app

Application exposée (surface produit) de Capsule.

## Responsabilités

- Composition des flux UX et des cas d'usage.
- Orchestration des dépendances `@capsule/core` et `@capsule/ui`.

## Frontières

- ✅ Peut dépendre de `@capsule/core` et de `@capsule/ui`.
- ❌ Ne doit pas être importé par `packages/*`.

## API publique

Application finale (pas de contrat de réutilisation inter-package).

## Flux utilisateur (narratif)

1. **Onboarding / authentification** : l’utilisateur termine l’onboarding puis s’authentifie.
2. **Navigation** : l’application résout la route demandée (onboarding, login, timeline, exports, etc.) selon l’état de session.
3. **Chargement timeline** : les nœuds et relations narratives sont chargés puis triés chronologiquement pour affichage.
4. **États UI** : pendant les actions asynchrones, l’UI expose explicitement les états `loading`, `empty`, `error`, `ready`.
5. **Exports** : l’utilisateur lance un export (JSON/PDF), suit son statut puis télécharge le fichier quand il est prêt.

## Validation manuelle recommandée

### 1) Routage / garde d’accès

- Démarrer sans session.
- Vérifier qu’une tentative d’accès à `/timeline` redirige vers `/login`.
- Vérifier qu’en onboarding non terminé, toute route redirige vers `/onboarding`.

### 2) Timeline chronologique

- Créer au moins 3 nœuds narratifs avec des dates différentes (incluant un cas sans `occurred_at`).
- Charger la timeline.
- Vérifier l’ordre ascendant par date et la stabilité de tri en cas d’égalité.

### 3) États UI explicites

- Déclencher une action longue pour voir `loading`.
- Tester un résultat vide (ex. timeline sans nœud) pour voir `empty`.
- Forcer une erreur API pour voir `error` + message.

### 4) Exports et feedback utilisateur

- Lancer un export JSON puis PDF.
- Vérifier le message de succès au lancement.
- Rafraîchir le statut d’un export `completed` et d’un export `failed` pour valider les messages correspondants.

## Captures à produire pendant la recette

> Cette liste sert de check-list visuelle lors de la validation manuelle.

- Capture A : redirection non authentifiée vers login.
- Capture B : écran timeline avec éléments triés chronologiquement.
- Capture C : état `empty` affiché quand aucune donnée n’est présente.
- Capture D : feedback export `completed` et `failed`.
