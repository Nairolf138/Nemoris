# Offre & Pricing MVP — Capsule familiale

## 1) Grille d’offre explicite (MVP)

| Palier | Inclus | Limites / Entitlements API |
| --- | --- | --- |
| **Gratuit** | 1 capsule, liens externes, export simple | Pas de coffre interne, 1 bénéficiaire max, export `json`/`pdf` uniquement, pas de messages planifiés |
| **Payant** | Accès coffre interne, bénéficiaires avancés, exports avancés, messages planifiés | Activation conditionnée au paiement des frais de mise en place ; quota coffre et plafonds bénéficiaires pilotés côté API |

### Pricing public détaillé (MVP)

1. **Frais de mise en place (one-shot)** : **14,90 € TTC** à l’activation du palier payant.
2. **Micro-abonnement de pérennité** : **0,60 € TTC / mois** (sans engagement long terme).
3. **Options one-shot activables à la demande** :
   - **Pack stockage +5 Go** : **9,90 € TTC** par pack.
   - **Pack héritiers +5** : **4,90 € TTC** par pack.
   - **Option capsule vidéo (référencement)** : **19,90 € TTC** par capsule.

> Hypothèse explicite MVP : l’option vidéo couvre un **slot de référencement vidéo** (URL sécurisée + métadonnées) et **pas** un upload/stockage binaire natif en v1.

Cette grille est alignée avec le modèle économique de référence (Business Plan Capsule Numérique) via une hypothèse de passage documentée en section 5.

## 2) Traduction produit/API (feature flags & entitlements)

Implémentation recommandée côté API (pilotable par configuration):

- `internal_vault`: active l’accès au coffre documentaire interne.
- `advanced_beneficiaries`: autorise les paliers de bénéficiaires > 1.
- `advanced_exports`: autorise les formats avancés (`encrypted_zip`).
- `scheduled_messages`: autorise les déclencheurs planifiés (`date`, `inactivity`, `verified_death`).

Entitlements de contrôle minimum:

- `vaultQuotaBytes` (quota coffre par capsule/compte),
- `beneficiariesMax` (nombre max de bénéficiaires),
- `advancedExportFormats` (formats disponibles par palier).

Entitlements/billing add-ons à introduire pour éviter toute contradiction avec le pricing public:

- `setupFeePaid` (booléen de gating activation payante),
- `storagePackUnits` (nombre de packs stockage one-shot achetés),
- `beneficiaryPackUnits` (nombre de packs héritiers one-shot achetés),
- `videoCapsuleUnits` (nombre d’options vidéo one-shot achetées),
- `videoReferenceOnly=true` (rappel explicite: pas de stockage binaire vidéo natif en MVP).

## 3) Positionnement prix micro-abonnement (0,60 €/mois)

### Positionnement

- **Prix public récurrent : 0,60 € / mois (TTC)**.
- Positionnement : **micro-abonnement de pérennité** plutôt qu’offre premium.
- Intention produit : financer la continuité opérationnelle (sécurité, disponibilité, support) avec une barrière d’entrée minimale.

## 4) KPI business de lancement (alignés nouveau pricing)

### Activation

- **Activation D0** : % des inscrits qui créent au moins 1 contenu clé le jour de l’inscription.
- **Activation D7 complète** : % des inscrits qui créent au moins 3 types d’objets différents en 7 jours.
- **Activation paiement setup** : % des comptes activés qui règlent les frais de mise en place sous 30 jours.

### Conversion (par composante de pricing)

- **Conversion inscription -> payant (30 jours)** (inclut paiement setup).
- **Attach rate options 90 jours** : % de payants ayant acheté au moins une option one-shot.
- **Mix options** : répartition stockage/héritiers/vidéo sur les achats one-shot.

### Churn

- **Churn mensuel payant** (sur micro-abonnement 0,60 €).
- **Taux d’annulation dans les 30 premiers jours payants**.

### Break-even (pilotage)

- **BEP contribution mensuelle** : `revenu moyen client - coûts infra/client` > 0.
- **BEP acquisition (payback CAC)** : `CAC / marge de contribution mensuelle`.

## 5) Cohérence avec `Capsule_Numerique_Financier_36mois.xlsx` (hypothèses de passage)

Constat sur le classeur actuel:

- Le revenu est modélisé en **ARPU fixe 1,20 €/client/mois** (ex. `618 / 515 = 1,20` en M1 scénario pessimiste).
- Les coûts infra sont modélisés en **0,50 €/client/mois**.
- Le CAC est modélisé en **25 €/nouveau client**.

Hypothèses de passage documentées pour relier le nouveau pricing au modèle 36 mois sans casser la comparabilité:

1. **ARPU de continuité conservé à 1,20 €** dans le fichier financier (v1 de transition).
2. Décomposition business de cet ARPU pour le pilotage produit:
   - **0,60 €** de micro-abonnement récurrent,
   - **0,60 € équivalent** issu des revenus one-shot lissés (setup + options).
3. En conséquence, les KPI de conversion doivent distinguer:
   - conversion au setup,
   - rétention du micro-abonnement,
   - attachement options.

## 6) Règle de décision post-lancement

Les évolutions d’offre (annuel, palier famille, options premium récurrentes) ne sont considérées qu’après stabilisation conjointe de :

1. la rétention payante M+3,
2. un churn mensuel sous contrôle,
3. un niveau de support compatible avec le micro-abonnement,
4. un payback CAC en amélioration continue.
