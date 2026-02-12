# Nemoris

**Nemoris** est un projet d’**identité cognitive augmentée** : une infrastructure qui transforme des souvenirs dispersés en trajectoire humaine intelligible, transmissible et gouvernable.

Le projet fusionne deux dimensions :
- la **capsule numérique personnelle/familiale** (mémoire, documents, messages),
- le **patrimoine cognitif** (convictions, erreurs, valeurs, narration causale de vie).

---

## Vision globale

Nemoris ne se limite pas au stockage. L’objectif est de permettre à chaque personne de :
1. documenter son parcours de manière structurée,
2. rendre visible l’évolution de ses choix et de ses repères,
3. transmettre un héritage utile (et non seulement émotionnel) à ses proches,
4. contribuer, sous consentement, à une intelligence collective intergénérationnelle.

**Positionnement :** de l’archive passive vers une **continuité cognitive active**.

---

## Problème adressé

Aujourd’hui, la plupart des systèmes de “mémoire numérique” conservent des contenus mais peu de contexte décisionnel :
- ce qui a changé une conviction,
- quelles erreurs ont été commises,
- quelles leçons ont été tirées,
- comment les valeurs se sont incarnées dans les actes.

Nemoris formalise ces couches pour réduire la perte de savoir humain entre générations.

---

## Les 6 modules cœur

1. **Mémoire de vie** — timeline multimédia personnelle.
2. **Évolution des convictions** — versions de croyances + déclencheurs de bascule.
3. **Erreurs majeures & leçons** — capitalisation structurée de l’apprentissage.
4. **Valeurs à différents âges** — cartographie de l’éthique déclarée et vécue.
5. **Graphe narratif de vie** — modélisation causale événements/personnes/décisions.
6. **Transmission post-mortem volontaire** — envoi conditionnel, réversible et auditable.

---

## Principes fondateurs

- **Souveraineté utilisateur** (consentement explicite, granularité des accès).
- **Révocabilité** (droits dynamiques de partage).
- **Sécurité by design** (chiffrement, audit, traçabilité).
- **Lisibilité humaine** (sortie compréhensible, pas uniquement technique).
- **Responsabilité intergénérationnelle** (transmettre des repères exploitables).

---

## Impact visé

À l’échelle individuelle :
- meilleure introspection,
- meilleure cohérence de trajectoire,
- meilleure transmission familiale.

À l’échelle collective (si standard ouvert et gouvernance forte) :
- réduction de la répétition d’erreurs générationnelles,
- base de recherche sociologique longitudinale inédite,
- infrastructure de responsabilisation biographique.

---

## Documents du projet

- `docs/manifeste-fondateur.md` — socle philosophique et politique.
- `docs/architecture-mvp.md` — périmètre produit/technique de la première version.
- `web/landing-page.html` — landing page conceptuelle.
- `docs/*.pdf` — dossiers complémentaires (marché, finance, architecture, UX/UI, sécurité, confiance/éthique, business).

---

## Tâches nécessaires (roadmap opérationnelle)

### A. Produit & UX
- [ ] Concevoir les parcours utilisateur détaillés pour les 6 modules (onboarding, création, consultation, transmission).
- [ ] Définir les interactions entre timeline, convictions, leçons, valeurs et graphe narratif.
- [ ] Prototyper les vues critiques : frise temporelle, graphe causal, écran de gouvernance des accès.
- [ ] Écrire la taxonomie commune (types d’événements, types d’erreurs, types de liens narratifs).

### B. Data model & plateforme
- [ ] Formaliser le schéma de données unifié (`Memory`, `Belief`, `Lesson`, `ValueProfile`, `NarrativeNode`, `LegacyMessage`).
- [ ] Définir l’historisation/versionning pour les convictions et valeurs.
- [ ] Concevoir un moteur de liaisons croisées (références entre modules).
- [ ] Préparer les mécanismes d’export/import (portabilité utilisateur).

### C. Sécurité, confiance, conformité
- [ ] Spécifier chiffrement au repos/en transit et stratégie de gestion des clés.
- [ ] Implémenter un journal d’audit immuable pour les actions sensibles.
- [ ] Modéliser consentements, délégations et révocations fines.
- [ ] Produire les artefacts conformité RGPD (registre, DPA, droits d’accès/effacement).

### D. Transmission post-mortem
- [ ] Définir les déclencheurs autorisés et preuves de déclenchement.
- [ ] Concevoir la chaîne de validation (contacts de confiance, opérateur, preuve documentaire).
- [ ] Prévoir des politiques de sécurité anti-abus et anti-usurpation.
- [ ] Définir les modalités juridiques de testament numérique selon juridictions cibles.

### E. Recherche & impact collectif
- [ ] Définir un mode “contribution recherche” strictement opt-in et anonymisé.
- [ ] Établir un cadre éthique de réutilisation des données biographiques.
- [ ] Spécifier les indicateurs d’impact (apprentissage intergénérationnel, qualité de transmission).
- [ ] Monter un comité externe (éthique, droit, sciences sociales, cybersécurité).

### F. Go-to-market
- [ ] Segmenter les premiers utilisateurs (familles, seniors actifs, créateurs, entrepreneurs, thérapeutes/coachs).
- [ ] Définir une offre MVP claire (B2C premium + partenariats institutionnels pilotes).
- [ ] Construire la preuve de confiance (certifications, audits, transparence publique).
- [ ] Préparer la stratégie de standardisation (formats ouverts, API, interopérabilité).

---

## État du dépôt

Ce dépôt contient le cadrage stratégique et fonctionnel initial. La prochaine étape recommandée est la transformation en backlog exécutable (epics, user stories, critères d’acceptation techniques).
