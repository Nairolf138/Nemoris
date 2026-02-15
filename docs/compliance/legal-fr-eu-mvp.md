# Cadre légal FR/UE — MVP Nemoris

> **Objectif**: cadrer le MVP dans une logique de conformité pragmatique, sans se substituer à un conseil juridique individualisé.

## 1) Articulation RGPD / post-mortem

### RGPD (UE) — données de personnes vivantes

Le RGPD s'applique aux traitements de données à caractère personnel concernant des **personnes physiques vivantes** (utilisateurs, bénéficiaires, héritiers contactés, administrateurs).

Implications MVP:
- base légale documentée par finalité (ex. exécution du service, obligations légales, intérêt légitime cadré),
- transparence (information claire, compréhensible, versionnée),
- minimisation (collecter le strict nécessaire),
- sécurité et confidentialité (mesures techniques + organisationnelles),
- droits des personnes (accès, rectification, effacement, limitation, opposition, portabilité selon cas),
- accountability (preuves de conformité, registre, décisions tracées).

### Post-mortem (France) — Loi Informatique et Libertés

Les données d'une personne décédée ne relèvent pas du RGPD au sens strict, mais le droit français prévoit des règles spécifiques (notamment directives post-mortem et gestion des données du défunt dans le cadre de la **Loi Informatique et Libertés**).

Implications MVP:
- prévoir un mécanisme de recueil de directives de l'utilisateur sur le sort de ses données,
- encadrer les demandes de proches/héritiers avec vérification stricte,
- limiter la communication aux cas prévus par la loi et/ou les directives laissées par l'utilisateur,
- tracer chaque décision et chaque accès.

### Rôle CNIL

La CNIL est l'autorité de contrôle en France:
- référent d'interprétation et de bonnes pratiques,
- point de contact en cas de violation de données nécessitant notification,
- autorité susceptible de contrôler la documentation de conformité.

Le MVP doit maintenir une documentation exploitable en audit interne/externe (registre, analyses de risques, preuves de mesures).

## 2) Limites d'accès des héritiers (principe MVP)

Le service doit éviter toute promesse d'accès "automatique" et inconditionnel.

Règles minimales recommandées:
1. **Vérification d'identité** du demandeur (niveau proportionné au risque).
2. **Justificatifs** (décès, qualité à agir, lien avec le défunt, mandat le cas échéant).
3. **Contrôle des directives** laissées par l'utilisateur (si présentes).
4. **Accès limité** au périmètre autorisé (besoin d'en connaître).
5. **Journalisation** complète (qui, quoi, quand, base de décision).
6. **Double validation interne** pour les cas sensibles (Legal + Ops/Security).

## 3) Mécanismes de consentement, directives et preuve

## 3.1 Consentement (quand requis)

Quand la base légale retenue est le consentement:
- consentement libre, spécifique, éclairé et univoque,
- collecte séparée par finalité sensible,
- retrait possible aussi simplement que l'acceptation,
- conservation de la preuve (horodatage, version de texte, contexte).

## 3.2 Directives post-mortem

Pour le MVP, prévoir un format simple et opposable en interne:
- état de directive: `absente | brouillon | validée | révoquée`,
- version de directive et horodatage,
- périmètres couverts (suppression, conservation, transmission partielle),
- personnes désignées (si applicable),
- historique des modifications.

## 3.3 Gouvernance et décisions

Chaque demande héritier/proche doit aboutir à une décision tracée:
- `acceptée`, `acceptée partiellement`, `refusée`,
- motif juridique/opérationnel,
- contrôles réalisés,
- approbateurs internes,
- date d'effet et actions exécutées.

## 4) Clauses de limites (MVP)

À afficher dans les parcours concernés:
- le service **n'est pas** un coffre-fort légal universel,
- le service **ne remplace pas** un testament notarié ni un conseil juridique personnalisé,
- l'accès des proches/héritiers est soumis aux règles applicables et aux vérifications prévues,
- en cas de conflit, la loi applicable et les décisions d'autorités/tribunaux prévalent.

## 5) Checklist conformité minimale avant beta/public

- [ ] Registre des traitements MVP à jour (`docs/compliance/registre-traitements-mvp.md`).
- [ ] Plan DPIA validé et niveau de risque résiduel accepté (`docs/compliance/dpia-plan.md`).
- [ ] Parcours consentement/directives versionnés et testés.
- [ ] Procédure demandes héritiers testée sur cas nominaux.
- [ ] Clauses de non-substitution juridique publiées (README + interfaces).
- [ ] Sign-off explicite Legal + Security + Ops avant ouverture beta/public.
