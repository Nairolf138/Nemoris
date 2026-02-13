# Preuve de décision Go/No-Go

> À compléter pour chaque release candidate avant création du tag.

- **Release candidate**:
- **Version cible (SemVer)**:
- **Date/heure de décision**:
- **Environnement** (`staging`/`prod`):
- **Verdict** (`GO`/`NO-GO`):

## Contrôles obligatoires exécutés

- [ ] `npm run docs:contract:check`
- [ ] `npm run release:readiness:check`
- [ ] `npm run build:artifacts`
- [ ] `npm run version:plan -- <major|minor|patch>`

## Validation des seuils sécurité

Référence: `docs/operations/go-no-go-checklist.md`.

- [ ] `auth_anomalies` = `ok`
- [ ] `auth_rejected_401_spike` = `ok`
- [ ] `auth_rejected_403_spike` = `ok`
- [ ] `auth_rate_limited_429_spike` = `ok`
- [ ] `session_revocation_spike` = `ok`

## Signatures décisionnelles

- **Product Owner**: Nom / Signature / Date
- **Tech Lead**: Nom / Signature / Date
- **On-call**: Nom / Signature / Date

## Notes / restrictions / plan de remédiation

- 
