# Spécification fonctionnelle — périmètre médias & secrets (Capsule v1)

## Objectif

Ce document cadre **ce qui est réellement pris en charge au lancement (v1)** pour les contenus média et sensibles,
et ce qui reste explicitement hors périmètre pour éviter les ambiguïtés produit, tech et marketing.

## 1) Types d’actifs pris en charge au lancement

### Taxonomie v1 (canonique)

| Type d’actif | Statut v1 | Support concret actuel |
| --- | --- | --- |
| Photo | **Pris en charge (partiel)** | Upload binaire possible uniquement pour documents essentiels image (`image/jpeg`, `image/png`) via `/vault/documents/upload`; pas de galerie média complète. |
| Vidéo | **Hors scope v1** | Pas d’upload binaire vidéo natif ni de pipeline transcodage/streaming. |
| Audio | **Hors scope v1** | Pas d’upload binaire audio natif en v1. |
| Texte libre | **Pris en charge (nativement)** | Champs textuels des entités (`title`, `description`, `message`, `lesson_text`, etc.). |
| Codes / secrets (mot de passe, phrase de récupération, code coffre, etc.) | **Pris en charge (format texte + document essentiel)** | Texte dans les entités métier + pièces justificatives essentielles (PDF/TXT/DOC/DOCX/JPEG/PNG) via `VaultFile`; **pas de coffre-fort média généraliste**. |

### Clarification importante

Le terme “média supporté” en v1 signifie:
- support du **contexte métier** (classification, liens, transmission),
- et non un pipeline natif d’ingestion/stockage binaire avec transcodage.

## 2) Contraintes par type (taille, format, chiffrement, partage, exportabilité)

## Règles transverses v1

- **Canaux d’écriture**: API JSON `/data/{collection}` + module objet ciblé `/vault/documents/upload` (backend S3-compatible).
- **Chiffrement au repos**: chiffrement applicatif AES-GCM des payloads sensibles dans SQLite.
- **Contrôle d’accès**: `owner_id` obligatoire + auth bearer.
- **Consentements**: contraintes de transmission/export pilotées par scopes (`data_export`, `post_mortem_transmission`, `posthumous_visibility`).

## Matrice de contraintes v1

| Type | Taille max v1 | Format v1 | Chiffrement v1 | Partage v1 | Export v1 |
| --- | --- | --- | --- | --- | --- |
| Photo (documents essentiels) | 25 Mo / fichier; quota capsule 50–500 Mo (configurable) | `image/jpeg`, `image/png` | Oui (objet + métadonnées) | Selon `visibility`; `posthumous_visibility` requis si posthume | Téléchargeable; `purpose=data_export` impose consentement `data_export` |
| Document texte/PDF/DOC | 25 Mo / fichier; quota capsule 50–500 Mo | `text/plain`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Oui | Selon `visibility` + consentements | Oui (download objet, gouverné par `data_export` si usage export) |
| Vidéo | Hors scope upload binaire v1 | N/A | N/A | N/A | N/A |
| Audio | Hors scope upload binaire v1 | N/A | N/A | N/A | N/A |
| Texte métier | Limite technique JSON/DB | UTF-8 texte | Oui | Selon `visibility` + consentements | Inclus en export JSON |

### Limites explicitement hors scope v1

- Pas de galerie média complète (albums, recherche multimédia, prévisualisations, transcodage).
- Pas d’upload binaire vidéo/audio en v1.
- Pas de chiffrement côté client (E2EE) contractualisé.
- Pas de mécanisme de partage par lien public signé (URL temporaire) dans le contrat v1.

## 3) Politique d’accès post-mortem et révocabilité (contenus sensibles)

## Principes v1

1. **Transmission post-mortem contrôlée par consentement explicite**:
   - le scope `post_mortem_transmission` gouverne la logique de livraison des `legacy_messages`.
2. **Visibilité posthume dissociée**:
   - le scope `posthumous_visibility` gouverne l’ouverture de visibilité posthume.
3. **Révocabilité**:
   - consentement révocable via `/consent/revoke`.
   - les `legacy_messages` sont révocables via `/legacy-messages/{id}/revoke`.
4. **Effet temporel de révocation**:
   - la révocation s’applique aux actions futures (pas de “retour arrière” garanti sur une livraison déjà effectuée).

## Règles opérationnelles recommandées pour contenus sensibles

- Définir `visibility = private` par défaut pour les éléments contenant des secrets.
- N’autoriser la transmission post-mortem qu’aux bénéficiaires vérifiés/actifs.
- Journaliser systématiquement les opérations de consentement, déclenchement et livraison.

## 4) Couverture OpenAPI v1 et alignements réalisés

## Couverture confirmée

- CRUD unifié pour collections métier via `/data/{collection}`.
- Module `VaultFile` via `/vault/documents/upload`, `/vault/documents`, `/vault/documents/{id}/download`.
- Orchestration post-mortem via endpoints `legacy-messages` (`arm`, `trigger`, `revoke`, `deliver`).
- Gouvernance consentements (`grant`, `revoke`, `history`).
- Export (`/exports`, `/exports/{id}/download`, `/exports/audit`).

## Limites actuelles documentées dans le contrat

- Upload binaire limité aux documents essentiels (MIME explicitement contractualisés).
- Poids max par fichier 25 Mo et quota capsule 50–500 Mo configurable.
- Contrôles consentement alignés: `posthumous_visibility` pour visibilité posthume, `data_export` pour téléchargement à finalité export.

## Alignements appliqués dans `openapi.yaml`

- Ajout d’une section de limites connues dans `info.description`.
- Renforcement de la description de `/data/{collection}` pour expliciter la prise en charge “métadonnée/référence” des médias et l’absence d’upload binaire natif.

## 5) Promesse marketing vs capacité réelle actuelle

| Promesse marketing potentielle | Capacité réelle v1 | Formulation recommandée |
| --- | --- | --- |
| “Stockez toutes vos photos/vidéos/audios dans Capsule.” | V1 ne fournit pas d’upload binaire natif ni de media pipeline. | “Référencez et organisez vos médias dans votre capsule, avec transmission contextualisée.” |
| “Vos secrets sont gérés comme dans un coffre-fort numérique dédié.” | V1 stocke les secrets comme texte chiffré applicatif dans les entités métier; pas de vault spécialisé. | “Vos informations sensibles sont chiffrées au repos et gouvernées par consentement.” |
| “Révocation totale instantanée de toute transmission.” | Révocation future garantie; une livraison déjà effectuée ne peut être annulée rétroactivement. | “Vous pouvez révoquer les futures transmissions et garder une traçabilité complète.” |
| “Export universel tous formats média.” | Export JSON des données métier et métadonnées; pas d’export binaire multimédia natif. | “Export structuré de vos données et références de contenus.” |

## Décision produit

Pour v1, la proposition de valeur doit insister sur:
- la **continuité narrative et la transmission contrôlée**,
- la **gouvernance d’accès/consentement**,
- la **sécurisation des données texte et métadonnées**,

et éviter toute promesse de coffre-fort média binaire complet avant une phase dédiée.
