# Workflow de déclenchement posthume

## Objectif

Ce document spécifie le **workflow de déclenchement posthume** de Capsule :
- ses états métier,
- les transitions autorisées,
- les garde-fous de sécurité,
- les sources de signal de décès,
- les règles de quorum/validation,
- et la matrice d'erreurs et cas limites.

Le but est de garantir un déclenchement **fiable, explicable et réversible** tant que la livraison finale n'est pas irréversible.

## États métier

Le workflow suit le cycle d'état ci-dessous.

| État | Description | Entrée typique | Sortie typique |
|---|---|---|---|
| `suspected_death` | Signal initial détecté, non validé. | Signal automatique (open data), inactivité extrême, alerte contact de confiance. | `pending_validation`, `revoked` |
| `pending_validation` | Vérifications et collecte de preuves en cours. | Quorum minimal de signaux atteint. | `grace_period`, `revoked`, retour `suspected_death` |
| `grace_period` | Fenêtre d'attente active avant tout déverrouillage. | Validation forte de décès obtenue. | `progressive_unlock`, `revoked` |
| `progressive_unlock` | Déverrouillage progressif par paliers de sensibilité. | Fin de période de grâce sans opposition valide. | `delivered`, `revoked` |
| `delivered` | Livrables posthumes exécutés (état terminal nominal). | Tous les paliers obligatoires sont exécutés. | - |
| `revoked` | Processus annulé (faux positif, opposition valide, compte réactivé). | Action de révocation humaine/automatique. | - |

## Transitions autorisées

```text
suspected_death
  ├─(quorum minimal atteint)──────────────────────────▶ pending_validation
  └─(faux signal / opposition immédiate)──────────────▶ revoked

pending_validation
  ├─(preuve forte + règles OK)────────────────────────▶ grace_period
  ├─(signal invalidé / conflit non résolu)────────────▶ revoked
  └─(preuves insuffisantes mais suspicion maintenue)──▶ suspected_death

grace_period
  ├─(délai écoulé sans opposition recevable)──────────▶ progressive_unlock
  └─(opposition valide / activité propriétaire)────────▶ revoked

progressive_unlock
  ├─(paliers terminés avec succès)────────────────────▶ delivered
  └─(incident critique / opposition tardive recevable)▶ revoked
```

## Garde-fous par état

### 1) `suspected_death`
- Aucun accès posthume n'est débloqué.
- Création d'un dossier d'instruction horodaté (`case_id`) avec audit immuable.
- Debounce des signaux dupliqués (même source + même période).

### 2) `pending_validation`
- Vérifications croisées multi-sources obligatoires.
- Contrôle anti-fraude (cohérence identité, provenance, réputation de la source).
- Revue manuelle obligatoire si signaux contradictoires.

### 3) `grace_period`
- Notification proactive des canaux propriétaires connus (email, push, contact secondaire).
- Bouton/endpoint d'opposition explicite et prioritaire.
- Blocage de tout envoi de secret/document sensible pendant la période.

### 4) `progressive_unlock`
- Déverrouillage en **paliers** :
  1. métadonnées non sensibles,
  2. messages à faible criticité,
  3. documents/secret classifiés selon consentement explicite.
- Stop-the-line : le moindre échec de conformité révoque le workflow.
- Chaque palier exige confirmation transactionnelle et journal d'audit.

### 5) `delivered`
- État terminal, non réversible au niveau livraison.
- Émission d'un rapport de clôture (`delivery_report`).

### 6) `revoked`
- État terminal de sécurité.
- Révocation des jetons/capacités temporaires posthumes.
- Conservation des traces d'audit et motif de révocation.

## Sources de signal et scoring de confiance

### Sources primaires
1. **INSEE / open data décès** (source institutionnelle)
   - Signal de haute confiance, mais soumis à vérification d'identité.
2. **Inactivité prolongée**
   - Signal faible seul ; utile comme signal d'appoint.
3. **Contacts de confiance**
   - Signal déclaratif humain ; poids dépendant du niveau de relation/validation préalable.

### Modèle de confiance (exemple contractuel)

| Source | Score unitaire | Conditions |
|---|---:|---|
| INSEE/open data validé | 0.7 | Match identité fort (nom + prénom + date naissance + commune). |
| Contact de confiance vérifié | 0.4 | Contact pré-enregistré + authentification forte du déclarant. |
| Inactivité extrême | 0.2 | Seuil d'inactivité dépassé + absence de signal de vie technique. |

> Les seuils exacts sont paramétrables, mais le principe contractuel reste :
> - un signal faible ne déclenche jamais seul la livraison,
> - la source institutionnelle ne court-circuite pas les contrôles d'identité.

## Règles de quorum / validation

### Quorum minimal pour passer à `pending_validation`
- Au moins l'une des combinaisons suivantes :
  - `INSEE/open data validé` ;
  - `2 contacts de confiance` indépendants ;
  - `1 contact de confiance` + `inactivité extrême`.

### Validation forte pour passer à `grace_period`
- Nécessite :
  - soit un signal institutionnel avec match identité fort,
  - soit un quorum humain renforcé (≥2 contacts vérifiés) + revue manuelle positive.

### Règles d'opposition
- Toute preuve de vie propriétaire récente et vérifiée entraîne `revoked`.
- Une opposition non authentifiée place le dossier en revue manuelle (pas de progression automatique).

## Matrice d'erreurs métier

Les codes ci-dessous doivent être cohérents avec `docs/product-capsule/api-error-contract.md`.

| Code | HTTP | Quand | Action attendue client |
|---|---:|---|---|
| `POSTHUMOUS_CASE_NOT_FOUND` | 404 | Dossier posthume inexistant. | Rafraîchir l'état et invalider l'ID local. |
| `POSTHUMOUS_INVALID_STATE_TRANSITION` | 409 | Transition non autorisée entre états. | Recharger l'état serveur avant nouvel essai. |
| `POSTHUMOUS_QUORUM_NOT_REACHED` | 409 | Quorum insuffisant pour valider l'étape. | Collecter signaux supplémentaires. |
| `POSTHUMOUS_VALIDATION_CONFLICT` | 409 | Signaux contradictoires/non résolus. | Basculer en revue manuelle côté opérateur. |
| `POSTHUMOUS_GRACE_PERIOD_ACTIVE` | 409 | Action demandée avant fin de grâce. | Réessayer après `retry_after_ms`. |
| `POSTHUMOUS_OPPOSITION_ACTIVE` | 403 | Opposition valide en cours. | Suspendre le workflow côté client. |
| `POSTHUMOUS_SOURCE_UNAVAILABLE` | 503 | Source externe (open data) indisponible. | Retry avec backoff exponentiel. |
| `POSTHUMOUS_IDENTITY_MISMATCH` | 422 | Match identité insuffisant avec source de décès. | Demander vérification manuelle. |
| `POSTHUMOUS_UNLOCK_POLICY_BLOCKED` | 403 | Palier bloqué par consentement/politique. | Adapter portée de déverrouillage. |
| `POSTHUMOUS_ALREADY_FINALIZED` | 409 | Dossier déjà `delivered` ou `revoked`. | Traiter comme idempotent/no-op. |

## Cas limites et règles de traitement

1. **Faux positif INSEE/open data**
   - Passage immédiat en `revoked`, alerte conformité, blocage de reprise auto sans revue humaine.

2. **Réapparition d'activité propriétaire pendant `grace_period`**
   - Opposition implicite → `revoked`.

3. **Conflit contacts (1 confirme, 1 infirme)**
   - `pending_validation` maintenu, création de tâche manuelle, interdiction d'avancer automatiquement.

4. **Source institutionnelle indisponible > SLA**
   - Workflow gelé en `pending_validation` ; aucune montée d'état basée uniquement sur inactivité.

5. **Déclenchement concurrent (double soumission)**
   - Idempotence par `case_id` + verrou applicatif ; seconde requête retourne l'état courant.

6. **Opposition tardive en `progressive_unlock`**
   - Autorisée tant que `delivered` non atteint ; retour `revoked` et arrêt immédiat des lots restants.

7. **Dossier déjà finalisé**
   - Toute commande de transition renvoie `POSTHUMOUS_ALREADY_FINALIZED`.

## Événements métier recommandés

- `posthumous.case.created`
- `posthumous.signal.recorded`
- `posthumous.validation.pending`
- `posthumous.grace_period.started`
- `posthumous.grace_period.ended`
- `posthumous.unlock.stage.completed`
- `posthumous.delivered`
- `posthumous.revoked`

Chaque événement doit inclure au minimum : `case_id`, `owner_id`, `previous_state`, `new_state`, `occurred_at`, `reason`.
