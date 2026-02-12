# Périmètre MVP (v1)

## 1) Fonctionnalités incluses en v1

Le MVP v1 inclut les briques essentielles suivantes :

- **Authentification (Auth)**
  - Inscription, connexion, déconnexion.
  - Gestion basique de session utilisateur.
- **Module Mémoire**
  - Création, édition, suppression d’entrées mémoire.
  - Consultation chronologique simple.
- **Convictions**
  - Création et édition de convictions personnelles.
  - Association optionnelle à des entrées du module Mémoire.
- **Leçons**
  - Ajout de leçons apprises.
  - Mise à jour et archivage simple.
- **Valeurs**
  - Définition et priorisation des valeurs clés.
  - Liaison avec convictions/leçons si pertinent.
- **Liens simples**
  - Capacité à relier manuellement des éléments entre eux (Mémoire, Convictions, Leçons, Valeurs).
  - Navigation basique entre éléments liés.
- **Export basique**
  - **Export PDF** : vue lisible, structurée, non personnalisable avancée.
  - **Export JSON** : format brut structuré pour réutilisation.

---

## 2) Fonctionnalités explicitement exclues du MVP

Les éléments suivants sont hors périmètre v1 :

- **Recherche avancée**
  - Pas de recherche sémantique, filtres complexes, ni indexation poussée.
- **IA complexe**
  - Pas de génération automatique avancée, pas d’assistant conversationnel contextuel riche.
- **Workflows juridiques post-mortem complets**
  - Pas de parcours notarial intégré, ni d’automatisation de conformité juridique complète.

---

## 3) KPI de succès (5)

1. **Taux d’onboarding terminé**
   - % d’utilisateurs ayant complété le parcours initial.
2. **Nombre moyen d’entrées créées par utilisateur actif (30 jours)**
   - Mesure de l’adoption du cœur produit.
3. **Taux de création de liens entre éléments**
   - % d’utilisateurs ayant relié au moins 2 types d’objets (ex: Mémoire ↔ Valeurs).
4. **Taux d’export réussi (PDF/JSON)**
   - % d’exports terminés sans erreur.
5. **Rétention à J+7**
   - % d’utilisateurs revenant au moins une fois dans les 7 jours après onboarding.

---

## 4) Définition claire de “Done MVP”

Le MVP est considéré comme **Done** quand un utilisateur peut, de bout en bout :

1. S’authentifier de manière fiable.
2. Créer et modifier des contenus dans les modules **Mémoire, Convictions, Leçons et Valeurs**.
3. Relier simplement ces contenus entre eux.
4. Exporter son corpus en **PDF** et en **JSON** sans blocage.

**Formulation synthétique :**
> Un utilisateur peut créer, relier et exporter son héritage cognitif de manière autonome.

---

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
