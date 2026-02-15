# Roadmap shipping — Capsule v1

Référence canonique : `docs/product-capsule/scope-fonctionnel.md`.

## Règle de tri backlog

- Tout tri backlog doit utiliser **uniquement** `docs/product-capsule/scope-fonctionnel.md` comme référence de périmètre.
- Toute demande out-of-scope est **explicitement refusée** puis reclassée en **[Prévu plus tard]** ou **[Recherche]**.
- Chaque arbitrage (acceptation MVP, report, refus) est consigné dans le Decision log ci-dessous.

## Gate de sortie par phase (critères vérifiables)

> Une phase n'est clôturable que si les 3 validations **Juridique + Sécurité + Ops** sont explicitement cochées.

### P0 — Fondation sécurité

**Sécurité (vérifiable)**
- [ ] Authentification et session validées sur les cas nominaux/erreur.
- [ ] Isolation inter-utilisateur prouvée sur routes protégées (401/403 attendus).
- [ ] Journalisation des événements sécurité activée et consultable.

**Conformité / juridique (vérifiable)**
- [ ] CGU/politiques d'usage sécurité référencées dans la documentation produit.
- [ ] Base légale du traitement d'authentification documentée.
- [ ] Revue juridique signée sur les parcours d'accès et de session.

**Readiness ops (vérifiable)**
- [ ] Dashboards/alertes d'authentification disponibles pour l'astreinte.
- [ ] Runbook incident auth/session publié.
- [ ] Exercice de rollback auth effectué avec preuve.

### P1 — Contenu + héritiers

**Sécurité (vérifiable)**
- [ ] ACL propriétaires appliquées à tous les endpoints de contenu/héritiers.
- [ ] Validation des entrées (payload invalides) testée et journalisée.
- [ ] Contrôles anti-exposition de données sensibles validés.

**Conformité / juridique (vérifiable)**
- [ ] Politique de rétention des contenus/héritiers documentée.
- [ ] Clauses d'information utilisateur sur désignation d'héritiers validées.
- [ ] Registre de traitements mis à jour (données contenu + héritiers).

**Readiness ops (vérifiable)**
- [ ] Procédure de restauration des données de capsule testée.
- [ ] Backups vérifiés avec test de restauration partielle.
- [ ] Support ops dispose d'un playbook de diagnostic CRUD.

### P2 — Déclenchement

**Sécurité (vérifiable)**
- [ ] Garde-fous de déclenchement (double contrôle/états) testés.
- [ ] Toutes les transitions `arm/trigger/revoke` sont auditables.
- [ ] Blocage des déclenchements non autorisés validé.

**Conformité / juridique (vérifiable)**
- [ ] Conditions de déclenchement revues et validées juridiquement.
- [ ] Traçabilité de consentement associée au déclenchement disponible.
- [ ] Modèle de preuve en cas de contestation documenté.

**Readiness ops (vérifiable)**
- [ ] Procédure d'arrêt d'urgence (`revoke`) testée.
- [ ] Escalade on-call en cas de déclenchement litigieux documentée.
- [ ] KPI de déclenchement anormal intégrés à l'observabilité.

### P3 — Messages conditionnels / remise

**Sécurité (vérifiable)**
- [ ] Règles conditionnelles testées (autorisé/interdit/expiré).
- [ ] Historique des tentatives de remise immuable et horodaté.
- [ ] Contrôles anti-remise multiple involontaire validés.

**Conformité / juridique (vérifiable)**
- [ ] Clauses de remise et d'éligibilité validées par le juridique.
- [ ] Conservation des preuves de remise conforme aux exigences.
- [ ] Processus de gestion de litige destinataire documenté.

**Readiness ops (vérifiable)**
- [ ] Monitoring des échecs de remise opérationnel.
- [ ] Procédure de relecture manuelle des remises critiques disponible.
- [ ] Astreinte formée au traitement des incidents de remise.

### P4 — Guide héritiers

**Sécurité (vérifiable)**
- [ ] Contrôle d'accès héritier bout-en-bout validé.
- [ ] Protection anti-fuite sur parcours de consultation testée.
- [ ] Traçabilité des accès héritiers activée.

**Conformité / juridique (vérifiable)**
- [ ] Contenus d'information héritiers validés juridiquement.
- [ ] Mentions de droits/limites de consultation conformes.
- [ ] Processus d'exercice des droits (accès/suppression) documenté.

**Readiness ops (vérifiable)**
- [ ] FAQ et macros support héritiers prêtes.
- [ ] Runbook support niveau 1/2 publié.
- [ ] SLO de réponse incidents héritiers défini et monitoré.

### P5 — Qualif & conformité

**Sécurité (vérifiable)**
- [ ] Campagne de tests sécurité (authz, abus, exports) clôturée sans blocker.
- [ ] Alertes sécurité critiques en statut `ok` sur la fenêtre de qualification.
- [ ] Plan de remédiation des vulnérabilités signé.

**Conformité / juridique (vérifiable)**
- [ ] Dossier de conformité complet et approuvé (privacy, consent, audit).
- [ ] Vérification juridique finale de la release signée.
- [ ] Preuves d'audit export et consent archivées.

**Readiness ops (vérifiable)**
- [ ] `npm run release:readiness:check` exécuté avec succès.
- [ ] Runbook release/rollback validé en exercice à blanc.
- [ ] On-call, support et communication release synchronisés.

### P6 — Pilotes partenaires

**Sécurité (vérifiable)**
- [ ] Exigences sécurité partenaires contractualisées et testées.
- [ ] Cloisonnement des environnements pilotes validé.
- [ ] Journal d'incidents partenaire opérationnel.

**Conformité / juridique (vérifiable)**
- [ ] Cadre contractuel pilote signé (DPA, responsabilités, SLA).
- [ ] Matrice de conformité multi-acteurs validée.
- [ ] Processus de notification incident partenaire approuvé.

**Readiness ops (vérifiable)**
- [ ] Plan de support pilote (astreinte, escalade, RACI) exécuté.
- [ ] Rituels de suivi (hebdo KPI + risques) démarrés.
- [ ] Critères de sortie pilote vers industrialisation documentés.

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Ajout d'un gate de scope obligatoire avant chaque lot de delivery. |
| 2026-02-16 | Product + Tech + Ops | Remplacement du plan par gates de sortie P0→P6 avec validations vérifiables sécurité, conformité juridique et readiness opérationnelle. |
