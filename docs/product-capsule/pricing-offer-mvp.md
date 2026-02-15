# Offre & Pricing MVP — Capsule familiale

## 1) Grille d’offre explicite (MVP)

| Palier | Inclus | Limites / Entitlements API |
| --- | --- | --- |
| **Gratuit** | 1 capsule, liens externes, export simple | Pas de coffre interne, 1 bénéficiaire max, export `json`/`pdf` uniquement, pas de messages planifiés |
| **Payant (0,60 €/mois)** | Coffre interne, bénéficiaires avancés, exports avancés, messages planifiés | Quota coffre contrôlé côté API, plafond bénéficiaires configurable, format `encrypted_zip` activé |

Cette grille est alignée avec le modèle économique de référence (Business Plan Capsule Numérique).

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

## 3) Positionnement prix micro-abonnement (0,60 €/mois)

### Positionnement

- **Prix public : 0,60 € / mois (TTC)**.
- Positionnement : **micro-abonnement d’accessibilité** plutôt qu’offre premium.
- Intention produit : réduire la friction d’entrée, valider l’usage récurrent et la valeur perçue de la transmission.

## 4) KPI business de lancement

### Activation

- **Activation D0** : % des inscrits qui créent au moins 1 contenu clé le jour de l’inscription.
- **Activation D7 complète** : % des inscrits qui créent au moins 3 types d’objets différents en 7 jours.

### Conversion (par palier)

- **Conversion inscription -> payant (30 jours)**.
- **Temps médian avant premier paiement**.
- **Upgrade prompts** (tentatives bloquées sur feature payante).
- **Paid feature adoption** (usage effectif des features payantes après upgrade).

### Churn

- **Churn mensuel payant**.
- **Taux d’annulation dans les 30 premiers jours payants**.

### Rétention

- **Rétention payante M+1**.
- **Rétention payante M+3**.

## 5) Règle de décision post-lancement

Les évolutions d’offre (annuel, palier famille, options premium) ne sont considérées qu’après stabilisation conjointe de :

1. la rétention payante M+3,
2. un churn mensuel sous contrôle,
3. un niveau de support compatible avec le micro-abonnement.
