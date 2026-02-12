# Sécurité, conformité & mini threat model — Capsule v1

## Garde-fous transverses implémentés

### 1) Chiffrement en transit (TLS) + chiffrement au repos
- **TLS en transit imposé côté infrastructure** via `CAPSULE_TLS_MODE` validé au démarrage (`required` ou `terminated-by-infra`).
- **Stratégie chiffrement au repos explicitée** via `CAPSULE_DATA_ENCRYPTION_STRATEGY`, obligatoire au boot (ex. enveloppe AES-256 via KMS infra).
- Le service refuse de démarrer si ces variables ne sont pas renseignées/valides.

### 2) Autorisation stricte par `owner_id`
- Toutes les opérations de lecture/écriture applicatives sensibles (`/data/*`, exports, audit, dashboard) exigent un `owner_id` explicite (header `x-owner-id`, payload `owner_id` ou query param).
- Vérification stricte : `owner_id` demandé **doit** correspondre à l’utilisateur authentifié, sinon `403 FORBIDDEN`.
- Si aucun scope `owner_id` n’est fourni, la requête est rejetée (`400 OWNER_SCOPE_REQUIRED`).

### 3) Politique de secrets
- Aucune clé en dur dans le code d’exécution.
- Variables de sécurité validées dès l’instanciation de l’API :
  - `CAPSULE_SESSION_TOKEN_SECRET`
  - `CAPSULE_TLS_MODE`
  - `CAPSULE_DATA_ENCRYPTION_STRATEGY`
  - seuils de protection anti-abus (`CAPSULE_AUTH_RATE_LIMIT_*`, `CAPSULE_BRUTE_FORCE_*`, `CAPSULE_ANOMALY_ALERT_THRESHOLD`).
- Démarrage bloqué si configuration incomplète/invalide.

### 4) Rate limiting + anti brute-force (endpoints auth)
- Limitation de débit sur `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`.
- Protection brute-force spécifique au login (empreinte client + email), blocage temporaire après échecs répétés (`429 RATE_LIMITED`).

### 5) Journalisation et alertes sécurité
- Journalisation des événements anormaux dans l’observabilité :
  - `security.auth_failed`
  - `security.access_denied`
  - `security.alert.triggered`
- Alerte déclenchée automatiquement après répétition d’anomalies (seuil configurable).

---

## Mini threat model (Top risques & mitigations)

### Risque A — Prise de contrôle de compte par brute-force
- **Scénario** : attaques répétées sur `/auth/login` depuis une même source.
- **Impact** : compromission de session, accès à des exports sensibles.
- **Mitigations implémentées** :
  - rate limiting auth endpoint ;
  - compteur d’échecs login et blocage temporaire ;
  - émission d’alertes après répétition (`security.alert.triggered`).

### Risque B — IDOR / accès cross-tenant via `owner_id`
- **Scénario** : utilisateur authentifié essayant de lire/écrire les données d’un autre owner.
- **Impact** : fuite de données personnelles, non-conformité RGPD.
- **Mitigations implémentées** :
  - scope `owner_id` obligatoire ;
  - contrôle systématique `owner_id == auth.user.id` ;
  - rejet + traçage des accès interdits.

### Risque C — Exfiltration de données en transit ou sur stockage
- **Scénario** : interception réseau ou exposition d’un stockage chiffré insuffisamment.
- **Impact** : perte de confidentialité des capsules.
- **Mitigations implémentées** :
  - TLS forcé côté infra (mode validé au boot) ;
  - stratégie chiffrement au repos documentée et rendue obligatoire par configuration ;
  - principe “fail fast” si paramètres sécurité absents.

### Risque D — Faible capacité de détection des abus
- **Scénario** : tentatives interdites répétées non détectées rapidement.
- **Impact** : persistance d’attaques, MTTD élevé.
- **Mitigations implémentées** :
  - audit log sécurité centralisé dans l’observabilité ;
  - seuil d’alerte configurable ;
  - événements anormaux exploitables pour SIEM/SOC.

## Recommandations de durcissement (prochaine itération)
- Brancher `security.alert.triggered` sur une destination d’alerte externe (webhook, Slack, pager).
- Ajouter rotation automatique des secrets (KMS/Secrets Manager) et preuves d’audit.
- Étendre le contrôle `owner_id` aux futures routes CRUD métier dès leur exposition HTTP.
