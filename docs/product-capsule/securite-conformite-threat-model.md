# Sécurité, conformité & mini threat model — Capsule v1

## Garde-fous transverses implémentés

### 1) Sessions signées + rotation de secrets
- Les tokens de session ne sont plus des jetons aléatoires nus : format signé `s1.<kid>.<opaque>.<hmac>` avec vérification HMAC SHA-256 basée sur `CAPSULE_SESSION_TOKEN_SECRET` (ou keyring `CAPSULE_SESSION_TOKEN_SECRETS`).
- Rotation supportée via keyring ordonné : la première clé signe les nouveaux tokens, les clés suivantes valident les sessions existantes pendant migration progressive.
- Rejeu limité côté API : `refresh` révoque systématiquement l’ancien token avant émission d’un nouveau.

**Preuves techniques**
- `SessionTokenManager` (mint/verify, `kid`, HMAC, validation stricte). 
- `AuthService.authenticate/refresh/logout` rejette les tokens forgés et invalide les anciens tokens lors d’un refresh.
- Test non-régression : token forgé refusé (401) + replay d’un ancien refresh refusé (401).

### 2) Chiffrement applicatif des payloads SQLite
- Chiffrement applicatif AES-GCM piloté par `CAPSULE_DATA_ENCRYPTION_STRATEGY` (fallback `plaintext` pour dev).
- Les payloads JSON sensibles des tables SQLite métier (`memories`, `beliefs`, `lessons`, `legacy_messages`, `consent_records`, etc.) sont persistés chiffrés (`enc1.<kid>.<iv>.<ciphertext>`).
- Les clés de chiffrement supportent rotation via `CAPSULE_DATA_ENCRYPTION_KEYS` (keyring `kid:secret`).

**Preuves techniques**
- `PayloadCipher.encode/decode` dans la couche SQLite core.
- Migration lazy à la lecture : si payload déchiffré avec une clé non-active, réécriture avec la clé active.
- Test non-régression DB : vérification directe SQLite que le titre sensible n’apparaît pas en clair.

### 3) Stratégie de migration et rotation
- **Sessions** : accepter temporairement plusieurs secrets (`CAPSULE_SESSION_TOKEN_SECRETS`) tout en ne signant qu’avec la clé active. Les sessions legacy expirent naturellement ou sont réémises à la prochaine authentification/refresh.
- **Payloads chiffrés** : keyring de déchiffrement multi-clés + réécriture automatique au format et `kid` actifs lors des lectures (`needsMigration`).
- **Plan de rollout recommandé** :
  1. Déployer avec clé active + ancienne clé en secondaire.
  2. Laisser tourner (trafic normal => migration progressive).
  3. Supprimer ancienne clé après fenêtre d’expiration session + audit de couverture migration.

### 4) Contrôles d’accès & protections auth
- Scope `owner_id` obligatoire pour les routes sensibles (`/data/*`, exports, audit, dashboard).
- Vérification stricte `owner_id == auth.user.id`, sinon `403`.
- Rate limiting + anti brute-force conservés sur endpoints auth (`/auth/register|login|logout|refresh`).

### 5) Journalisation et alertes sécurité
- Événements sécurité conservés : `security.auth_failed`, `security.access_denied`, `security.alert.triggered`.
- Détection d’anomalies pilotée par seuil (`CAPSULE_ANOMALY_ALERT_THRESHOLD`).

---

## Mini threat model (Top risques & mitigations)

### Risque A — Forge de token / usurpation de session
- **Scénario** : attaquant modifie un bearer token capturé.
- **Mitigation** : signature HMAC + vérification stricte de format/version/kid/signature.
- **Preuve** : test de token forgé rejeté en 401.

### Risque B — Replay de session
- **Scénario** : réutilisation d’un token après refresh.
- **Mitigation** : refresh atomique (révocation ancien token + émission nouveau token).
- **Preuve** : test replay refresh rejeté en 401.

### Risque C — Lecture disque SQLite en clair
- **Scénario** : exfiltration du fichier `.sqlite`.
- **Mitigation** : chiffrement applicatif AES-GCM des payloads sensibles.
- **Preuve** : test SQL direct montrant l’absence du texte sensible en clair.

### Risque D — Rotation de secrets sans interruption
- **Scénario** : rotation cassant sessions actives ou rendant des payloads illisibles.
- **Mitigation** : keyring multi-clés + migration lazy sur lecture + stratégie de retrait progressif.

## Recommandations (prochaine itération)
- Brancher `security.alert.triggered` sur canal externe (webhook/PagerDuty/Slack).
- Ajouter métriques explicites de progression de migration (`% sessions key-active`, `% payloads key-active`).
- Ajouter outillage CLI de rotation (pré-validation keyring, dry-run, rapport de couverture).
