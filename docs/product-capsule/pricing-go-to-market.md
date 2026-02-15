# Pricing & Go-To-Market — Capsule familiale (MVP)

## Objectif

Définir un positionnement simple, lisible et mesurable pour le lancement de la **Capsule familiale** en MVP.

## Grille d’offre MVP (explicite)

| Palier | Proposition de valeur | Entitlements / feature flags API |
| --- | --- | --- |
| **Gratuit** | Démarrer une capsule personnelle et partager des liens externes avec export basique | `internal_vault=false`, `advanced_beneficiaries=false`, `advanced_exports=false`, `scheduled_messages=false` |
| **Payant — 0,60 €/mois** | Continuité de service + coffre interne + transmission enrichie | `internal_vault=true`, `advanced_beneficiaries=true`, `advanced_exports=true`, `scheduled_messages=true` |

### Détail fonctionnel par palier

- **Gratuit**: 1 capsule, liens externes, export simple (`json`/`pdf`).
- **Payant**: coffre interne, bénéficiaires avancés, exports avancés (`encrypted_zip`), messages planifiés.

## Offre MVP : Capsule familiale

### Promesse de valeur

> **Préserver et transmettre l’essentiel d’une vie familiale, sans complexité.**

La Capsule familiale permet à une personne de structurer ses repères (souvenirs, convictions, leçons, valeurs) et de les exporter dans un format lisible et durable pour ses proches.

## Tarif MVP

### Micro-abonnement

- **Prix public : 0,60 € / mois** (TTC, sans engagement long terme).
- Positionnement : tarif symbolique de continuité de service, accessible au plus grand nombre.
- Objectif : valider la traction et la rétention avant toute montée en gamme.

## Pilotage API: quotas et garde-fous par palier

À brancher sur des entitlements centralisés:

- **Quota coffre** (`vaultQuotaBytes`) : contrôle upload et affichage du quota restant.
- **Nombre de bénéficiaires** (`beneficiariesMax`) : blocage + signal d’upgrade quand seuil atteint.
- **Formats d’export avancés** (`advancedExportFormats`) : contrôle des formats autorisés.
- **Messages planifiés** (`scheduled_messages`) : restriction des triggers avancés.

## Instrumentation conversion par palier (observability)

Événements à suivre pour piloter adoption/upgrade:

- `conversion.tier.assigned` (tier `free`/`paid`),
- `conversion.tier.upgrade_prompted` (feature demandée mais non incluse),
- `conversion.tier.feature_used` (adoption réelle des features payantes).

KPIs minimum dans dashboard V2:

- volume utilisateurs par palier,
- nombre de prompts d’upgrade,
- usage des features payantes,
- activations d’upgrade (utilisateur prompté puis usage payant).

## KPI business minimum à suivre dès le lancement

### 1) Activation

- **Taux d’activation D0** : % des nouveaux inscrits créant au moins 1 contenu clé.
- **Activation complète D7** : % des inscrits ayant créé au moins 3 types d’objets (ex: mémoire + leçon + valeur).

### 2) Conversion payante

- **Conversion inscrit -> payant (30 jours)**.
- **Temps médian avant premier paiement**.
- **Conversion par palier** (free -> paid) via instrumentation upgrade.

### 3) Rétention

- **Rétention payante M+1 et M+3**.
- **Churn mensuel payant**.

### 4) Coût support

- **Tickets support / 100 abonnés payants / mois**.
- **Coût support moyen par abonné payant**.

## Cadre d’évolution post-MVP (non engagé)

Les évolutions tarifaires (annuel, palier famille, offre aidants) ne seront envisagées qu’après validation de trois signaux :

1. rétention payante M+3 stable,
2. coût support maîtrisé,
3. satisfaction qualitative sur la promesse de transmission.
