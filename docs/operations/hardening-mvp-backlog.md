# Backlog Hardening MVP

Objectif: fiabiliser **uniquement** les parcours in-scope MVP (auth, CRUD, liens, export) avant release.

## Cadre de la fenêtre hardening

- **Périmètre autorisé**: corrections, stabilisation, observabilité, robustesse des flux in-scope.
- **Périmètre interdit**: toute nouvelle feature fonctionnelle.
- **Règle de priorisation**: bloquant production > régression DoD > dette technique non bloquante.

## Priorisation anomalies bloquantes (P0)

| Priorité | Domaine | Anomalie bloquante | Impact | Critère de sortie |
| --- | --- | --- | --- | --- |
| P0 | Auth | Sessions invalides acceptées après révocation/expiration. | Risque d'accès non autorisé. | Rejet systématique (401) des sessions expirées/révoquées validé par tests de non-régression. |
| P0 | Auth | Contrôle owner manquant sur routes protégées. | Exposition de données inter-comptes. | Refus systématique (403) en cas de mismatch owner validé en intégration. |
| P0 | CRUD | Erreurs 5xx sur création/édition des objets cœur (mémoire, conviction, leçon, valeur). | Rupture parcours principal MVP. | Parcours CRUD in-scope stable sans 5xx sur scénarios DoD. |
| P0 | Liens | Rupture de liaison inter-objets (création/lecture incohérente). | Narration incomplète et données incohérentes. | Intégrité des liens confirmée en E2E DoD. |
| P0 | Export | Export JSON/PDF indisponible ou incomplet. | Perte de la proposition de valeur MVP. | Exports JSON/PDF générés avec statut de succès et contenu attendu. |

## Priorisation secondaire (P1)

- Durcissement messages d'erreur pour réduire les ambiguïtés de diagnostic.
- Renforcement des métriques de suivi des parcours (succès/échec auth, CRUD, export).
- Nettoyage des anomalies non bloquantes identifiées en recette.

## Plan d'exécution

1. **Triage quotidien P0** sur auth, CRUD, liens, export.
2. **Correction + preuve** (test automatisé ciblé) pour chaque item P0 fermé.
3. **Rejeu complet DoD + sécurité** en fin de journée et avant go/no-go.
4. **Aucun merge de feature** pendant la fenêtre hardening.

## Critère de clôture de la fenêtre

- Zéro anomalie P0 ouverte sur les parcours in-scope.
- Rapport `docs/operations/release-recette-report.md` au statut global **PASS**.
- Validation Produit + Tech du gel feature jusqu'à clôture hardening.
