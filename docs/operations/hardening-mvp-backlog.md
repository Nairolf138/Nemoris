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

## Chantiers sécurité priorisés (MVP → cible)

| Priorité | Chantier | Description | Critères de validation |
| --- | --- | --- | --- |
| P0 | Chiffrement en transit et au repos | Vérifier TLS strict sur tous les flux externes et couverture du chiffrement applicatif sur tous les objets sensibles in-scope. | 1) Scan de config TLS sans fail critique. 2) Test DB prouvant absence de données sensibles en clair sur tables in-scope. 3) Revue de configuration signée par Tech Lead. |
| P0 | Contrôles d'accès systématiques | Fermer les écarts d'autorisation (`owner_id`, scopes, routes export/audit/admin). | 1) Suite d'intégration: 100% des endpoints sensibles retournent 403 en cross-account. 2) Aucun endpoint sensible non couvert dans la matrice d'autorisation. |
| P0 | Robustesse session/auth | Empêcher forge/replay/session fixation, durcir rotation secrets auth. | 1) Tests non-régression forge + replay en PASS. 2) Rotation d'un secret sans interruption de service observée. 3) Journalisation des événements `auth_failed` et `access_denied`. |
| P1 | Gestion des clés & séparation des rôles | Préparer la séparation logique coffre/chiffres et service de clés (même si partielle au MVP). | 1) Architecture documentée et validée. 2) Matrice des accès clés vs données approuvée. 3) Plan de migration versionné publié. |
| P1 | Journal append-only & preuves d'intégrité | Structurer un journal inviolable pour actions critiques avec ancrage temporel externe. | 1) Prototype de chaînage hash opérationnel en environnement de test. 2) Vérification de non-altération automatisée. 3) Procédure d'export des preuves documentée. |
| P1 | Déverrouillage héritiers (k-of-n) | Définir et tester un protocole de partage de clé posthume avec quorum. | 1) Spécification `k-of-n` validée Produit/Tech/Juridique. 2) Test de reconstruction clé en sandbox avec seuil atteint. 3) Cas seuil non atteint => refus + audit. |
| P2 | Détection & réponse incidents | Industrialiser alerting, runbooks et exercices de réponse sécurité. | 1) Alertes branchées vers canal externe. 2) Runbook incident disponible et testé tabletop. 3) MTTD/MTTR mesurés sur un exercice. |

### Définition de terminé (DoD sécurité)

- Chaque chantier clos possède une **preuve exécutable** (test auto, script de vérification ou rapport reproductible).
- Chaque preuve est reliée à un ticket et à un artefact d'audit (log, capture, rapport).
- Aucun chantier P0 sécurité ouvert au moment du go/no-go release.

