# Contrat d'erreurs API Capsule

Ce document décrit les **codes d'erreurs stables** exposés par `@capsule/api`.

## Format de réponse

Toutes les erreurs applicatives renvoient un payload JSON standard :

```json
{
  "error": "ERROR_CODE",
  "message": "optionnel",
  "retry_after_ms": 120000,
  "details": {}
}
```

- `error` : code stable consommable côté client.
- `message` : message explicatif optionnel (non contractuel).
- `retry_after_ms` : délai de retry pour les erreurs de débit (`RATE_LIMITED`).
- `details` : informations supplémentaires optionnelles.

## Codes stables par statut HTTP

### 400 Bad Request
- `INVALID_PAYLOAD` : structure JSON invalide ou champs inattendus.
- `INVALID_EMAIL` : email non conforme.
- `WEAK_PASSWORD` : mot de passe trop faible.
- `INVALID_EXPORT_FORMAT` : format d'export non supporté.
- `INVALID_OWNER_SCOPE` : `owner_id` absent/invalide dans le scope attendu.
- `INVALID_QUERY_PARAMS` : query params invalides (`limit`, `offset`, `sort`, etc.).
- `OWNER_SCOPE_REQUIRED` : endpoint protégé appelé sans `owner_id` résolu.
- `DOMAIN_VALIDATION_ERROR` : violation de règle métier provenant du domaine `@capsule/core`.

### 401 Unauthorized
- `UNAUTHENTICATED` : token manquant/invalide/expiré.
- `INVALID_CREDENTIALS` : login/password incorrects.
- `SESSION_INVALID` : session expirée ou révoquée.
- `SESSION_NOT_FOUND` : session introuvable.

### 403 Forbidden
- `FORBIDDEN` : utilisateur authentifié mais non autorisé (ex: `owner_id` ≠ utilisateur courant).

### 404 Not Found
- `NOT_FOUND` : route inexistante.
- `RESOURCE_NOT_FOUND` : ressource métier absente.
- `EXPORT_NOT_FOUND` : export introuvable pour le propriétaire.

### 409 Conflict
- `EMAIL_ALREADY_USED` : tentative de création de compte avec email déjà enregistré.

### 429 Too Many Requests
- `RATE_LIMITED` : quota dépassé.
  - Peut inclure `retry_after_ms` pour indiquer quand réessayer.

### 500 Internal Server Error
- `INTERNAL_ERROR` : erreur inattendue côté serveur.

## Notes d'intégration client

- Implémenter le comportement client **sur `error` + statut HTTP**, pas sur `message`.
- Les codes listés ci-dessus sont la surface contractuelle à considérer comme stable.
- Pour `RATE_LIMITED`, privilégier un retry avec backoff respectant `retry_after_ms` si présent.

## Contrat d'export lié

- Le format du payload d'export MVP est documenté dans `docs/product-capsule/export-contract.md`.
