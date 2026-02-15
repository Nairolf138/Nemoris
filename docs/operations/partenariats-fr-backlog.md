# Backlog partenariats FR — readiness pilote

Objectif : prioriser les intégrations partenaires en France avec un niveau de préparation juridique et technique suffisant avant passage en pilote.

| Cible | Proposition d’intégration | Prérequis conformité/tech |
| --- | --- | --- |
| **Assureur** | **Cas d’usage MVP** : transmission automatisée d’un justificatif de décès et des coordonnées du bénéficiaire pour pré-remplir l’ouverture d’un dossier décès.

**Données minimales échangées** : identifiant contrat, identité défunt (nom/prénom/date de naissance), identité bénéficiaire, preuve de décès (référence + hash), horodatage de consentement/directive.

**Risques juridiques** : base légale insuffisamment documentée, partage excessif de données sensibles, ambiguïté sur la qualité de responsable/sous-traitant, conservation au-delà des durées prévues.

**Métriques pilote** : taux de dossiers créés sans reprise manuelle, délai médian de prise en charge, taux de rejet conformité, nombre d’incidents de consentement. | DPA signé + matrice responsable/sous-traitant validée; minimisation des champs via contrat d’interface; chiffrement TLS + journal d’accès; preuve de consentement vérifiable; purge automatique testée. |
| **Notaire** | **Cas d’usage MVP** : préparation d’un paquet documentaire numérique (directives, inventaire d’actifs déclaratifs, contacts héritiers) pour accélérer l’ouverture de succession.

**Données minimales échangées** : identité défunt, liste héritiers/contacts, documents transmis par l’utilisateur (métadonnées + empreintes), statut de vérification des pièces, journal de transmission.

**Risques juridiques** : valeur probatoire contestée des documents, transmission à un office non mandaté, divergence entre directives numériques et actes authentiques, exposition de données familiales non nécessaires.

**Métriques pilote** : taux de dossiers exploitables au premier envoi, délai d’ouverture de succession, volume de pièces rejetées, satisfaction étude notariale (NPS/opérationnel). | Convention de mandat et canal sécurisé par étude; politique de qualification documentaire explicite; contrôle d’habilitation du notaire destinataire; traçabilité horodatée des transmissions; revue Legal sur articulation avec acte notarié. |
| **Funéraire** | **Cas d’usage MVP** : déclenchement d’un parcours d’assistance administrative post-décès (checklist démarches + orientation services) lors de la prise en charge funéraire.

**Données minimales échangées** : identité défunt, identité déclarant/proche, commune du décès, statut des démarches (non commencé/en cours/terminé), préférences de contact.

**Risques juridiques** : collecte de données de proches sans information claire, réutilisation commerciale non consentie, partage prématuré avant vérification du décès, confusion sur la responsabilité d’information.

**Métriques pilote** : taux d’activation du parcours, taux de complétion des démarches clés, délai moyen de première prise de contact, taux d’opposition RGPD. | Clauses d’information co-brandées validées; double opt-in pour proches; séparation stricte données service vs marketing; contrôle de déclenchement sur preuve de décès; procédure d’exercice des droits RGPD opérationnelle. |
| **Secteur public** | **Cas d’usage MVP** : interface de suivi d’état des démarches administratives post-décès (sans décision automatisée), avec retour de statuts vers l’espace usager.

**Données minimales échangées** : identifiant dossier administratif, identité défunt minimale, type de démarche, statut de traitement, horodatage des mises à jour, canal de notification.

**Risques juridiques** : transfert hors périmètre de mission d’intérêt public, incompatibilité de finalités, exigences de souveraineté/hébergement non respectées, accessibilité et archivage non conformes.

**Métriques pilote** : taux de synchronisation des statuts, réduction des relances usagers, conformité SLA de mise à jour, nombre d’écarts de sécurité/conformité détectés. | Convention d’échange avec base légale explicite; PIA/DPIA spécifique flux public; exigences SecNumCloud/hébergement documentées si requis; API avec authentification forte + journal d’audit; tests d’accessibilité et de continuité de service validés. |

## Règle de priorisation go/no-go

Un partenariat ne peut passer en pilote que si :
1. la ligne correspondante est remplie et validée (cas d’usage, données minimales, risques, métriques),
2. les prérequis conformité/tech sont marqués « prêts » avec preuves,
3. la checklist `docs/operations/go-no-go-checklist.md` (section P6) est au vert sur les validations Juridique + Sécurité + Ops.
