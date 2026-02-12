# ROADMAP — Product Capsule

## Légende de statut (commune)

- **Now** : en cours d’exécution sur le cycle actuel.
- **Next** : prêt à démarrer dès validation des prérequis immédiats.
- **Later** : planifié, sans engagement de cycle court.
- **Research** : nécessite exploration / preuve avant engagement delivery.
- **Not in scope** : explicitement hors périmètre de la phase en cours.

## Milestones livrables

### M1 — MVP Capsule (Now)

**Objectif**
Livrer un parcours utilisateur complet pour préparer et transmettre une capsule numérique de manière autonome.

**Livrables clés**
- Authentification (inscription, connexion, déconnexion) et session fiable.
- Création/édition/suppression des contenus capsule (messages, documents, consignes).
- Paramétrage des bénéficiaires et règles de transmission.
- Exécution post-mortem traçable.
- Exports PDF / JSON.

**Entrée de phase**
- Périmètre MVP validé Produit + Tech.
- Modèle de données cœur figé pour v1.

**Sortie de phase**
- Parcours critique onboarding → création → transmission → export validé.
- KPI MVP instrumentés (onboarding, activité, export, rétention).

### M2 — Sécurité (Next)

**Objectif**
Renforcer la confiance opérationnelle et la résistance aux abus.

**Livrables clés**
- Contrôle d’accès granulaire renforcé.
- Chiffrement au repos et en transit revu et documenté.
- Journal d’audit sur actions sensibles.
- Revue de menaces MVP et plan de remédiation priorisé.

**Entrée de phase**
- MVP fonctionnel en environnement cible.
- Liste des scénarios d’abus priorisée.

**Sortie de phase**
- Correctifs critiques sécurité fermés.
- Preuves d’auditabilité disponibles.

### M3 — Conformité (Next)

**Objectif**
Opérationnaliser les obligations réglementaires et la gouvernance de données.

**Livrables clés**
- Registre des traitements et base légale documentés.
- Processus d’export/suppression/révocation testés.
- Politique de conservation et minimisation explicite.
- Dossier de conformité prêt pour revue externe.

**Entrée de phase**
- Fondations sécurité stables.
- Cartographie des données personnelles finalisée.

**Sortie de phase**
- Checklist conformité validée (Produit + Tech + Legal).
- Non-conformités bloquantes à zéro.

### M4 — Go-to-market (Later)

**Objectif**
Industrialiser la mise sur le marché, l’onboarding et la montée en confiance.

**Livrables clés**
- Positionnement, messages de valeur et preuves de confiance.
- Parcours d’onboarding production + support opérationnel.
- Playbook de lancement (canaux, KPIs acquisition/activation).
- Cadre de Go/No-Go final.

**Entrée de phase**
- MVP sécurisé et conforme.
- Hypothèses marché priorisées et mesurables.

**Sortie de phase**
- Lancement contrôlé effectué.
- Tableau de bord GTM actif avec seuils d’alerte.

## Reclassification des tâches existantes (README + mvp-scope)

- Authentification + gestion de session → **M1 (Now)**.
- Export PDF/JSON, portabilité → **M1 (Now)**.
- Sécurité de base (auth/session/autorisations minimales) → **M1 (Now)** puis **M2 (Next)**.
- Journalisation / traçabilité / supervision KPI → **M1 (Now)** puis durcissement **M2 (Next)**.
- Workflows juridiques post-mortem complets → **M3 (Next)** (et **Not in scope** pour MVP strict).
