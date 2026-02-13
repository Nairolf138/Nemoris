# Checklist Go/No-Go (alignée roadmap shipping)

Référence d'alignement: `docs/product-capsule/roadmap-shipping.md`.

## Gate de scope (obligatoire)

- [ ] Aucun item out-of-scope n'est embarqué.
- [ ] Le lot contribue à la DoD MVP (auth, contenus, liens, export).
- [ ] Validation Produit + Tech explicite du périmètre.
- [ ] Dépendances non-MVP reportées en backlog.
- [ ] Decision log mis à jour si décision de scope.

## Lot 0 — Cadrage

- [ ] Gate de scope validée.
- [ ] Critères d'acceptation lot documentés et signés.
- [ ] Modèle de données cœur validé.
- [ ] Définition of Done MVP gelée.

## Lot 1 — Fondations produit

- [ ] Gate de scope validée.
- [ ] Auth/session et isolation de données testées.
- [ ] **AC1 — Inscription**: `POST /auth/register` accepte un email normalisé + mot de passe fort, retourne `201` et une session valide.
- [ ] **AC2 — Connexion**: `POST /auth/login` retourne `200` avec identifiants valides, `401` si identifiants invalides.
- [ ] **AC3 — Déconnexion**: `POST /auth/logout` retourne `204` et invalide immédiatement le token courant.
- [ ] **AC4 — Session invalide/expirée**: toute route protégée retourne `401` avec token absent/invalide/révoqué/expiré.
- [ ] **AC5 — Isolation inter-utilisateur (routes protégées)**: un utilisateur ne peut jamais accéder aux données d'un autre (`403` sur mismatch `owner_id`), y compris sur `data/*`, `exports*`, `consent*`, `observability/*`, et orchestration `legacy-messages/*`.
- [x] CRUD mémoire/convictions/leçons/valeurs validé.
- [x] Liens manuels inter-objets validés.

## Lot 2 — Valeur utilisateur

- [ ] Gate de scope validée.
- [ ] Consultation chronologique testée.
- [ ] Exports PDF/JSON conformes au contrat.
- [ ] KPI MVP exposés dans l'observabilité.

## Lot 3 — Hardening avant release

- [ ] Gate de scope validée.
- [ ] Parcours in-scope stabilisés (aucun bug bloquant ouvert).
- [ ] Validation DoD MVP faite par Produit + Tech.
- [ ] Critères opérationnels validés (runbook, rollback, restauration).


## Critères opérationnels sécurité (seuils d'alerte)

Valider explicitement les indicateurs suivants avant le Go / No-Go :

- [ ] `auth_anomalies` en statut `ok` (alerte déclenchée à partir de **5** échecs d'authentification).
- [ ] `auth_rejected_401_spike` en statut `ok` (alerte déclenchée à partir de **8** rejets HTTP 401).
- [ ] `auth_rejected_403_spike` en statut `ok` (alerte déclenchée à partir de **6** rejets HTTP 403).
- [ ] `auth_rate_limited_429_spike` en statut `ok` (alerte déclenchée à partir de **10** réponses 429 sur les routes d'auth).
- [ ] `session_revocation_spike` en statut `ok` (alerte déclenchée à partir de **5** sessions révoquées).

## Go / No-Go final

- [ ] CI complète au vert (typecheck, tests, checks docs contractuelles).
- [ ] Artefacts de build générés et tracés (`artifacts/manifest.json`).
- [ ] Version SemVer décidée et tag prêt.
- [ ] Go confirmé par Product Owner + Tech Lead + On-call.

## Workflow de validation release readiness

Avant le Go / No-Go final, exécuter localement la vérification consolidée:

```bash
npm run release:readiness:check
```

Ce contrôle valide la présence des documents contractuels, la présence de `docs/operations/release-recette-report.md`, et la cohérence de version avec `artifacts/manifest.json` si ce manifeste est disponible.
