# Scope fonctionnel canonique — Capsule v1 (MVP)

Ce document est la **source canonique** du périmètre MVP.
Tout autre document produit/technique doit s’y aligner.

## In scope (Capsule v1)

1. **Authentification**
   - Inscription, connexion, déconnexion.
   - Gestion de session basique.

2. **Module Mémoire**
   - Création, édition, suppression.
   - Consultation chronologique simple.

3. **Convictions**
   - Création et édition.
   - Liaison optionnelle à des entrées mémoire.

4. **Leçons**
   - Ajout et mise à jour.
   - Archivage simple.

5. **Valeurs**
   - Définition et priorisation.
   - Liaison avec convictions/leçons.

6. **Liens inter-objets**
   - Liens manuels entre Mémoire, Convictions, Leçons, Valeurs.
   - Navigation basique entre éléments liés.

7. **Export**
   - Export PDF lisible.
   - Export JSON structuré.

## Out of scope (MVP)

- Recherche avancée (sémantique, indexation poussée, filtres complexes).
- IA complexe (assistant conversationnel contextuel riche, génération avancée).
- Workflows juridiques post-mortem complets (parcours notarial intégré, automatisation conformité complète).
- Déclencheurs et transmission post-mortem automatisée.
- Graphe narratif interactif avancé.

## Definition of Done (DoD)

Le MVP est **Done** quand un utilisateur peut, de bout en bout :
1. s’authentifier,
2. créer/modifier des contenus mémoire-convictions-leçons-valeurs,
3. relier ces contenus,
4. exporter en PDF et JSON sans blocage.

## KPI de succès MVP

- Taux d’onboarding terminé.
- Nombre moyen d’entrées créées par utilisateur actif (30 jours).
- Taux de création de liens entre éléments.
- Taux d’export réussi (PDF/JSON).
- Rétention à J+7.

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Ce document devient la référence canonique du scope MVP. |
| 2026-02-12 | Product + Tech | Le graphe narratif et la transmission post-mortem automatisée sont déplacés hors scope MVP. |
| 2026-02-12 | Product + Tech | Les portes de delivery (gate de scope) doivent être validées avant chaque lot. |
