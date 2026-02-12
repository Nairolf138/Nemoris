# Sécurité, conformité & threat model — Capsule v1

> Synthèse structurée depuis :
> - `docs/Capsule_Numerique_Secu_Pentest_RGPD.pdf`
> - `docs/Capsule_Numerique_Dossier_Confiance_Ethique_et_Perenite.pdf`

## In scope (Capsule v1)

### Objectifs sécurité
- Confidentialité des données via chiffrement fort (incl. logique E2E selon cas d’usage).
- Intégrité + traçabilité des opérations critiques (ajout de contenu, héritiers, déclenchements).
- Prévention d’accès non autorisés et compromission de compte.

### Contrôles minimaux (alignés OWASP/bonnes pratiques)
- Authentification OIDC + MFA ; sessions robustes, tokens courts.
- RBAC strict et isolation par utilisateur.
- TLS 1.3, HSTS, cookies durcis (`HttpOnly`, `SameSite`).
- Journalisation append-only horodatée et supervision d’anomalies.
- Sauvegardes chiffrées + tests réguliers de restauration.

### Menaces prioritaires (threat model)
- Fausse preuve de décès déclenchant un accès prématuré.
- Héritier malveillant tentant un déblocage anticipé.
- Export massif non autorisé de données sensibles.
- Compromission du stockage cloud.

### Conformité
- RGPD documenté : registre des traitements, base légale, durées.
- DPIA pour le traitement de données sensibles et scénarios post-mortem.
- Cadre CNIL/Loi Informatique & Libertés (notamment directives posthumes).
- Gouvernance éthique explicite et transparence utilisateurs.

## Phase 2

- Programme bug bounty privé formalisé.
- Renforcement des mécanismes de preuve multi-signaux pour déclenchement posthume.
- Audits annuels externes systématisés (code + infra + conformité).

## Research

- Confidential computing pour opérations sensibles.
- Vérification cryptographique avancée côté client (proofs vérifiables).
- Framework anti-abus comportemental dédié au post-mortem numérique.
