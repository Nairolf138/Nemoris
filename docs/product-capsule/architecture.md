# Architecture — Capsule v1

Référentiel de terminologie : `docs/product-capsule/glossaire-metier.md`.

## [Disponible maintenant] In scope (Capsule v1)

### Modules cœur
- Mémoire de vie : entrées multimédia, timeline, tags.
- Évolution des convictions : versioning simple par période.
- Erreurs & leçons : modèle structuré contexte → décision → conséquence → leçon.
- Valeurs par âge/période : profil de valeurs versionné.
- Remise sécurisée : orchestration des contenus à transmettre.
- Déclenchement : messages conditionnels avec statut et période de grâce.

### Gouvernance technique minimale
- Auth robuste, autorisations minimales, séparation des données par propriétaire.
- Consentement et révocation tracés.
- Journal d’audit des actions sensibles.
- Export de données utilisateur.

## Schéma logique cible — coffre + gestion clés + preuves d’audit

```text
┌─────────────────────────── Clients (Web/Mobile) ───────────────────────────┐
│  Chiffrement côté client (WebCrypto/libsodium) + signature locale          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ blobs chiffrés + métadonnées
                    ┌───────────▼───────────┐
                    │ API Capsule (orchestration)
                    │ auth / consent / policy
                    └───────┬─────────┬─────┘
                            │         │
              ┌─────────────▼─┐   ┌───▼─────────────────┐
              │ Coffre données │   │ Service de clés      │
              │ (ciphertexts)  │   │ (KEK/DEK, k-of-n)    │
              └─────────────┬──┘   └───┬─────────────────┘
                            │          │
                            └────┬─────┘
                                 ▼
                     ┌─────────────────────────┐
                     │ Journal append-only      │
                     │ + preuve d'horodatage ext│
                     └─────────────────────────┘
```

- **Coffre**: persistance des payloads chiffrés, aucune donnée sensible en clair à repos.
- **Gestion des clés**: séparation logique et opérationnelle, rotation, délégation héritiers, politiques de quorum.
- **Preuves d’audit**: chaîne d’intégrité + reçus d’horodatage exportables pour tiers auditeur.

## [Prévu plus tard] Phase 2

- Moteur de recherche transversale avancé et scoring sémantique.
- Mécanismes de recommandation intelligents sur corpus personnel.
- Résilience multi-régions renforcée avec bascule automatisée.

## [Recherche] R&D

- Automatisation avancée du déclenchement (non engagée).
- Assistance IA à la préparation de capsule (non engagée).
- Interopérabilité notariale/assurantielle normalisée (à valider juridiquement).

## Clarification produit/commercial — état actuel vs cible vs roadmap

| Capacité | State now (implémenté) | State target (vision) | Phase roadmap |
| --- | --- | --- | --- |
| Protection des données | Chiffrement applicatif serveur des payloads SQLite sensibles. | Chiffrement côté client généralisé (zéro connaissance serveur). | MVP durci → Phase 2 sécurité avancée. |
| Gestion des clés | Keyring de rotation applicatif (`kid`) côté backend. | Service de clés dédié (KEK/DEK), séparation stricte plan clés/plan data. | Phase 2. |
| Déverrouillage héritiers | Déclenchement conditionnel métier (statuts/workflows + période de grâce). | Partage de secret `k-of-n` avec quorum et gouvernance juridique. | Recherche → pilote contrôlé. |
| Audit & traçabilité | Journal d’audit interne des actions sensibles. | Journal append-only chaîné + horodatage externe vérifiable. | MVP durci → Phase 2 conformité. |
| Offre commerciale | Positionnement "MVP sécurisé" pour usages personnels guidés. | Positionnement "coffre patrimonial vérifiable" pour usages sensibles/réglementés. | Ajustement GTM progressif selon preuves de conformité. |
