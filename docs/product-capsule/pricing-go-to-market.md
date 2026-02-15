# Pricing & Go-To-Market — Capsule familiale (MVP)

## Objectif

Définir un positionnement simple, lisible et mesurable pour le lancement de la **Capsule familiale** en MVP, avec cohérence explicite avec le modèle financier 36 mois.

## Grille d’offre MVP (explicite)

| Palier | Proposition de valeur | Entitlements / feature flags API |
| --- | --- | --- |
| **Gratuit** | Démarrer une capsule personnelle et partager des liens externes avec export basique | `internal_vault=false`, `advanced_beneficiaries=false`, `advanced_exports=false`, `scheduled_messages=false` |
| **Payant** | Continuité de service + coffre interne + transmission enrichie | `internal_vault=true`, `advanced_beneficiaries=true`, `advanced_exports=true`, `scheduled_messages=true`, `setupFeePaid=true` |

### Détail pricing public

- **Frais de mise en place (one-shot)** : **14,90 € TTC**.
- **Micro-abonnement de pérennité** : **0,60 € TTC / mois**.
- **Options one-shot** :
  - pack stockage +5 Go : **9,90 € TTC**,
  - pack héritiers +5 : **4,90 € TTC**,
  - option capsule vidéo (référencement uniquement) : **19,90 € TTC**.

Hypothèse explicite: en MVP, l’option vidéo est un **référencement de média** (URL + métadonnées), pas un stockage binaire vidéo natif.

## Pilotage API: quotas et garde-fous par palier

À brancher sur des entitlements centralisés:

- **Quota coffre** (`vaultQuotaBytes`) : contrôle upload et affichage du quota restant.
- **Nombre de bénéficiaires** (`beneficiariesMax`) : blocage + signal d’upgrade quand seuil atteint.
- **Formats d’export avancés** (`advancedExportFormats`) : contrôle des formats autorisés.
- **Messages planifiés** (`scheduled_messages`) : restriction des triggers avancés.
- **Activation payante** (`setupFeePaid`) : pas d’accès payant sans règlement setup.
- **Packs one-shot** (`storagePackUnits`, `beneficiaryPackUnits`, `videoCapsuleUnits`) : extension d’entitlements sans modifier le prix mensuel public.

## Instrumentation conversion par composante de pricing

Événements à suivre pour piloter adoption/upgrade:

- `conversion.tier.assigned` (tier `free`/`paid`),
- `conversion.setup_fee.paid`,
- `conversion.subscription.started` (micro-abonnement actif),
- `conversion.option.purchased` (type: `storage` / `beneficiaries` / `video`),
- `conversion.tier.feature_used` (adoption réelle des features payantes).

## KPI business minimum (activation, conversion, churn, BEP)

### 1) Activation

- **Taux d’activation D0** : % des nouveaux inscrits créant au moins 1 contenu clé.
- **Activation complète D7** : % des inscrits ayant créé au moins 3 types d’objets.
- **Taux de setup payé D30** : % des comptes activés ayant payé les frais de mise en place en 30 jours.

### 2) Conversion payante

- **Conversion inscrit -> setup payé (30 jours)**.
- **Conversion setup payé -> abonnement actif (30 jours)**.
- **Attach rate options (90 jours)** : % des payants avec ≥1 achat one-shot.

### 3) Churn

- **Churn mensuel payant** (abonnement 0,60 €).
- **Taux de résiliation < 90 jours**.
- **Logo retention M+3** des comptes payants.

### 4) BEP (break-even)

- **Marge de contribution mensuelle/client** = `ARPU total mensuel - coût infra/client`.
- **Payback CAC (mois)** = `CAC / marge de contribution mensuelle/client`.
- **BEP exploitation mensuel** atteint quand `revenus mensuels >= coûts infra + CAC mensuel`.

> Alignement avec le classeur 36 mois (version actuelle): ARPU total cible = **1,20 €**, coût infra = **0,50 €**, CAC = **25 €**. Le suivi BEP est donc piloté à partir de ces trois constantes tant que le classeur n’est pas ventilé en revenus récurrents vs one-shot.

## Hypothèses de passage depuis `Capsule_Numerique_Financier_36mois.xlsx`

Pour garder la cohérence des ordres de grandeur du modèle existant:

1. Le classeur 36 mois reste en **ARPU agrégé 1,20 €/client/mois** (formulation historique).
2. Le go-to-market décompose cet ARPU en:
   - **0,60 € MRR** (micro-abonnement),
   - **0,60 € non-MRR lissé** (setup + options one-shot).
3. Les décisions produit/commercial doivent donc être prises avec un triple pilotage:
   - activation et conversion setup,
   - rétention abonnement,
   - monétisation options.

## Cadre d’évolution post-MVP (non engagé)

Les évolutions tarifaires (annuel, palier famille, offre aidants) ne seront envisagées qu’après validation conjointe de:

1. rétention payante M+3 stable,
2. churn mensuel maîtrisé,
3. payback CAC en tendance baissière,
4. coût support maîtrisé.
