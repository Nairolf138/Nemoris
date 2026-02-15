# Politique opérationnelle — récupération de compte

## Objectif
Définir un processus opérable, traçable et proportionné pour la récupération d'un compte Capsule en cas de perte d'accès, suspicion de compromission ou changement de terminal principal.

> Cette politique complète le runbook incident et doit être exécutée en coordination avec `docs/operations/incident-runbook.md` (qualification, journalisation, communication, post-mortem).

## Scénarios couverts
1. **Perte d'accès simple**: oubli du mot de passe mais email encore maîtrisé.
2. **Compromission suspectée**: activité inhabituelle, notification de login inconnu, fuite potentielle d'identifiants.
3. **Perte de terminal + email dégradé**: besoin d'escalade opérateur pour vérification renforcée.

## Délais et SLA
- **Prise en charge initiale**: < 4h ouvrées.
- **Traitement standard** (preuve complète): < 24h ouvrées.
- **Traitement renforcé** (doute identité / compromission): 24–72h ouvrées.
- **Gel de sécurité post-récupération**: actions sensibles bloquées pendant `CAPSULE_RECOVERY_SENSITIVE_ACTION_DELAY_MS` (30 min par défaut).

## Preuves demandées
Au moins une preuve forte + une preuve contextuelle:
- Preuve forte (exemples): email signé, ticket de support vérifié, code de récupération transmis via canal primaire.
- Preuve contextuelle: éléments de capsule connus (non sensibles), horodatage de dernière activité, métadonnées de connexion habituelles.

## Limitations et garde-fous
- La récupération ne permet pas de contourner les contrôles de consentement (`data_export`, `posthumous_visibility`, etc.).
- Après récupération, les actions sensibles (export, coffre documentaire, orchestration des messages posthumes, consentements) sont temporairement bloquées.
- Toute demande incomplète ou incohérente est rejetée avec demande de preuves complémentaires.
- Tous les événements sont auditables (`auth.recovery.completed`) et doivent être reliés au ticket d'incident/support.

## Procédure opératoire synthétique
1. Ouvrir/mettre à jour le ticket incident-support avec niveau de risque.
2. Vérifier les preuves et journaliser les artefacts de validation.
3. Exécuter la récupération (endpoint API dédié) avec preuve(s) validée(s).
4. Informer l'utilisateur du délai de gel post-récupération.
5. Vérifier l'absence d'actions sensibles durant la fenêtre de gel.
6. Clôturer avec preuves d'audit + actions préventives (rotation secrets côté utilisateur, revue sécurité si nécessaire).
