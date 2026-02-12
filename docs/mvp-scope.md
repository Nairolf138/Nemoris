# Périmètre MVP (v1)

> Document aligné sur la source canonique : `docs/product-capsule/scope-fonctionnel.md`.

## 1) In scope (v1)

- **Authentification (Auth)**
  - Inscription, connexion, déconnexion.
  - Gestion basique de session utilisateur.
- **Module Mémoire**
  - Création, édition, suppression d’entrées mémoire.
  - Consultation chronologique simple.
- **Convictions**
  - Création et édition.
  - Association optionnelle à des entrées mémoire.
- **Leçons**
  - Ajout, mise à jour, archivage simple.
- **Valeurs**
  - Définition, priorisation et liaison avec convictions/leçons.
- **Liens simples**
  - Liens manuels entre Mémoire, Convictions, Leçons, Valeurs.
  - Navigation basique entre éléments liés.
- **Export basique**
  - Export PDF lisible.
  - Export JSON structuré.

## 2) Out of scope (MVP)

- Recherche avancée (sémantique, indexation poussée, filtres complexes).
- IA complexe (assistant conversationnel contextuel riche, génération avancée).
- Workflows juridiques post-mortem complets.
- Transmission post-mortem automatisée.
- Graphe narratif interactif avancé.

## 3) KPI de succès MVP

1. Taux d’onboarding terminé.
2. Nombre moyen d’entrées créées par utilisateur actif (30 jours).
3. Taux de création de liens entre éléments.
4. Taux d’export réussi (PDF/JSON).
5. Rétention à J+7.

## 4) Definition of Done (DoD)

Le MVP est considéré comme **Done** quand un utilisateur peut, de bout en bout :

1. S’authentifier de manière fiable.
2. Créer et modifier des contenus dans les modules Mémoire, Convictions, Leçons et Valeurs.
3. Relier simplement ces contenus entre eux.
4. Exporter son corpus en PDF et en JSON sans blocage.

## 5) Validation finale — Checklist signée Produit + Tech

### Checklist Produit

- [ ] Le périmètre fonctionnel v1 est respecté (aucune fonctionnalité hors scope n’est requise).
- [ ] Les parcours critiques (onboarding → création de contenu → liens → export) sont validés.
- [ ] Les KPI sont instrumentés et mesurables.
- [ ] Les critères d’acceptation UX minimum sont atteints.

**Signature Produit** : ____________________
**Nom** : ____________________
**Date** : ____ / ____ / ______

### Checklist Tech

- [ ] Les fonctionnalités incluses sont livrées et testées.
- [ ] Les exports PDF et JSON sont stables sur l’environnement cible.
- [ ] La sécurité de base (auth, gestion de session, autorisations minimales) est validée.
- [ ] La supervision minimale (logs d’erreur + métriques KPI) est en place.

**Signature Tech** : ____________________
**Nom** : ____________________
**Date** : ____ / ____ / ______

## Decision log

| Date | Owner | Décision |
| --- | --- | --- |
| 2026-02-12 | Product + Tech | Harmonisation du périmètre de ce document avec la source canonique MVP. |
