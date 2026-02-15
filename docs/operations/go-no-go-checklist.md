# Checklist Go/No-Go (alignée phases P0→P6)

Références d'alignement :
- `docs/product-capsule/ROADMAP.md`
- `docs/product-capsule/roadmap-shipping.md`

## Règle de validation transverse (obligatoire)

Chaque phase doit être validée explicitement sur le triptyque :
- [ ] **Validation juridique** (Legal sign-off)
- [ ] **Validation sécurité** (Security sign-off)
- [ ] **Validation ops** (Operations sign-off)

> Sans les 3 validations, la phase est **No-Go**.

## P0 — Fondation sécurité

- [ ] Contrôles auth/session et isolation inter-utilisateur validés.
- [ ] Journaux et alertes sécurité opérationnels.
- [ ] Validation juridique des parcours d'accès/sign-in conservée.
- [ ] Validation sécurité signée.
- [ ] Validation ops signée (runbook + rollback auth testés).

## P1 — Contenu + héritiers

- [ ] CRUD contenus + héritiers validé avec ACL propriétaires.
- [ ] Politique de rétention et registre de traitements à jour.
- [ ] Procédures backup/restauration testées.
- [ ] Validation juridique signée (information utilisateur + héritiers).
- [ ] Validation sécurité signée.
- [ ] Validation ops signée.

## P2 — Déclenchement

- [ ] `arm/trigger/revoke` testés avec traçabilité complète.
- [ ] Garde-fous anti-déclenchement accidentel validés.
- [ ] Revue juridique des conditions de déclenchement signée.
- [ ] Validation sécurité signée.
- [ ] Validation ops signée (procédure d'arrêt d'urgence exercée).

## P3 — Messages conditionnels / remise

- [ ] Règles de conditionnement/remise testées.
- [ ] Historique des tentatives de remise vérifiable.
- [ ] Clauses juridiques de remise/éligibilité signées.
- [ ] Validation sécurité signée.
- [ ] Validation ops signée (monitoring incidents de remise actif).

## P4 — Guide héritiers

- [ ] Parcours guide héritiers validé bout-en-bout.
- [ ] Mentions juridiques héritiers conformes et publiées.
- [ ] Traçabilité des accès héritiers en place.
- [ ] Validation juridique signée.
- [ ] Validation sécurité signée.
- [ ] Validation ops signée (support L1/L2 prêt).

## P5 — Qualif & conformité

- [ ] Campagne de qualification (qualité + sécurité + conformité) clôturée.
- [ ] Dossier de conformité auditable finalisé.
- [ ] Commande readiness exécutée et archivée : `npm run release:readiness:check`.
- [ ] Validation juridique finale signée.
- [ ] Validation sécurité finale signée.
- [ ] Validation ops finale signée.

## P6 — Pilotes partenaires

- [ ] Cadre contractuel partenaire signé (incl. DPA/SLA).
- [ ] Exigences sécurité partenaire testées en environnement pilote.
- [ ] RACI d'escalade et rituels de suivi ops actifs.
- [ ] Validation juridique signée.
- [ ] Validation sécurité signée.
- [ ] Validation ops signée.


## Gate conformité obligatoire (beta/public)

Avant toute ouverture **beta** ou **public**, la validation conformité est bloquante:
- [ ] Revue juridique FR/UE effectuée (`docs/compliance/legal-fr-eu-mvp.md`).
- [ ] Plan DPIA (AIPD) complété et validé (`docs/compliance/dpia-plan.md`).
- [ ] Registre des traitements MVP à jour (`docs/compliance/registre-traitements-mvp.md`).
- [ ] Limites d'accès héritiers et mécanismes de consentement/directives validés en comité Legal + Security + Ops.

> Sans ce gate conformité, la release est **No-Go** même si les autres checks sont au vert.

## Go / No-Go final release

- [ ] CI complète au vert (typecheck, tests, checks docs contractuelles).
- [ ] Exécution validée des commandes:
  - [ ] `npm run docs:contract:check`
  - [ ] `npm run release:readiness:check`
  - [ ] `npm run build:artifacts`
- [ ] Artefacts de build générés et tracés (`artifacts/manifest.json`).
- [ ] Cohérence version/artefacts validée via `npm run version:plan -- <major|minor|patch>`.
- [ ] Sign-off final explicite **Juridique + Sécurité + Ops + Product + Tech**.
- [ ] Preuve de décision Go/No-Go signée et archivée (`docs/operations/go-no-go-decision-log.md`).
