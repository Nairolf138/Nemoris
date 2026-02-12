# Configuration par environnement & secrets management

## Environnements cibles

| Environnement | Objectif | Données | Exposition |
| --- | --- | --- | --- |
| `dev` | Développement local | Données de test | Local uniquement |
| `staging` | Validation pré-prod | Données synthétiques réalistes | Restreinte équipe |
| `prod` | Service utilisateur | Données réelles | Publique contrôlée |

## Fichiers de configuration

- `config/environments/dev.json`
- `config/environments/staging.json`
- `config/environments/prod.json`

Ces fichiers portent uniquement des paramètres non sensibles (ports, logs, flags, endpoints internes).

## Gestion des secrets

Principe: **aucun secret dans Git**.

Sources autorisées par environnement:
- `dev`: `.env.local` non commité.
- `staging` / `prod`: secret manager de la plateforme CI/CD (variables chiffrées + rotation).

Secrets minimum:
- `CAPSULE_SESSION_TOKEN_SECRETS`
- `CAPSULE_DB_URL`
- `CAPSULE_EXPORT_SIGNING_KEY`

## Rotation des secrets

1. Introduire la nouvelle clé en tête de liste (clé active).
2. Conserver temporairement l'ancienne pour validation/rétention session.
3. Déployer.
4. Retirer l'ancienne clé après fenêtre de sécurité.

## Contrôles opérationnels

- Journaliser chaque changement de secret (date, owner, ticket).
- Restreindre l'accès en least privilege.
- Exiger une revue 4-eyes pour modification `staging`/`prod`.
