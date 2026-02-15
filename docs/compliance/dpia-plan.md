# Plan DPIA (AIPD) — MVP Nemoris

> Gabarit opérationnel remplissable pour cadrer l'analyse d'impact relative à la protection des données.

## 0) Métadonnées

- Nom du traitement / projet : `[à compléter]`
- Version du document : `[vX.Y]`
- Date : `[YYYY-MM-DD]`
- Rédacteur(s) : `[à compléter]`
- DPO / référent privacy : `[à compléter]`
- Relecteurs (Legal / Security / Ops / Product) : `[à compléter]`

## 1) Description du traitement

- Finalités principales :
  - `[finalité 1]`
  - `[finalité 2]`
- Catégories de personnes concernées : `[utilisateurs, bénéficiaires, proches, ...]`
- Catégories de données : `[identité, contenu capsule, logs, ...]`
- Acteurs / destinataires : `[internes, sous-traitants, ...]`
- Flux hors UE : `[oui/non + détails]`
- Durées de conservation : `[à compléter]`

## 2) Nécessité et proportionnalité

- Base(s) légale(s) par finalité : `[à compléter]`
- Justification de minimisation : `[à compléter]`
- Information et transparence fournies : `[à compléter]`
- Exercice des droits (procédure + délais) : `[à compléter]`
- Mesures de privacy by design/by default : `[à compléter]`

## 3) Analyse des risques (personnes concernées)

| Risque | Gravité | Vraisemblance | Niveau initial | Mesures envisagées | Niveau résiduel | Owner | Échéance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `[ex: accès non autorisé contenus capsule]` | `[1-4]` | `[1-4]` | `[faible/moyen/élevé]` | `[MFA, ACL, chiffrement, journaux...]` | `[faible/moyen/élevé]` | `[nom]` | `[date]` |
| `[à compléter]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

## 4) Mesures techniques et organisationnelles

- Contrôle d'accès / IAM : `[à compléter]`
- Chiffrement (au repos / en transit) : `[à compléter]`
- Journalisation / traçabilité : `[à compléter]`
- Gestion incidents & notification : `[à compléter]`
- Sauvegarde / restauration : `[à compléter]`
- Gestion des sous-traitants : `[à compléter]`

## 5) Spécifique post-mortem / héritiers

- Mécanisme de directives utilisateur : `[à compléter]`
- Vérification des demandes héritiers : `[à compléter]`
- Limitation des accès accordés : `[à compléter]`
- Traçabilité des décisions d'accès : `[à compléter]`

## 6) Décision DPIA

- Niveau de risque résiduel global : `[faible/moyen/élevé]`
- Arbitrage : `[go / go sous conditions / no-go]`
- Conditions avant beta/public :
  - `[condition 1]`
  - `[condition 2]`
- Date de prochaine revue : `[YYYY-MM-DD]`

## 7) Signatures

- Legal : `[nom + date + signature]`
- Security : `[nom + date + signature]`
- Ops : `[nom + date + signature]`
- Product : `[nom + date + signature]`
