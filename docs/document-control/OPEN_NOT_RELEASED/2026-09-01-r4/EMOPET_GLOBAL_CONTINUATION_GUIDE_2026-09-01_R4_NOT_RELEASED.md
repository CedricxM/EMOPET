# EMOPET — Guide global de continuation contrôlée

**Document ID :** EMOPET-GLOBAL-GUIDE-R4-001  
**Révision :** R4  
**Date :** 2026-09-01  
**Autorité de décision :** Founder — EMOPET  
**Classification :** INTERNAL CONTROLLED / RESTRICTED  
**Statut :** PASS_WITH_NOTES — CONTROLLED CONSOLIDATION — NOT RELEASED  
**Conversion massive :** BLOCKED — OPEN-DOC-005  

## 1. Résultat exécutif

Ce paquet est le point d’entrée global pour la continuité documentaire EMOPET. Il réunit, sans les reconstruire :

- le ZIP source global immuable ;
- le checkpoint global R2 immuable ;
- le delta R3 proposé, toujours `HOLD / NOT RELEASED` ;
- la lignée MOKO exacte r1.4, r1.5 et r1.6 ;
- le pilote v2 exact, conservé comme preuve QA ;
- le delta de préparation présignature associé, classé restreint ;
- un registre détaillé et un résumé de préparation à la présentation.

La consolidation ne ferme aucun gate technique, scientifique, juridique, industriel, de transmission ou de publication. Elle ne transforme aucun document source et ne promeut aucun document à `RELEASED`.

## 2. Périmètre contrôlé et bon dénominateur

Le nombre `410` ne correspond à aucun dénominateur contrôlé actuel.

| Mesure | Compte | Interprétation |
|---|---:|---|
| Membres du ZIP source immuable | 430 | Fichiers exacts du corpus source |
| Décisions de clôture discovery | 4 | Entrées contrôlées postérieures au ZIP source |
| Entrées Work post-discovery | 10 | Rapports, registres et checkpoints contrôlés |
| Lignes de la matrice globale | 444 | Dénominateur documentaire contrôlé actuel |
| Identifiants documentaires logiques non vides | 206 | Identités logiques, pas un compte de release |

Les 444 lignes sont toutes réconciliées au niveau documentaire et affectées à un batch. Ce fait signifie que leur statut et leur autorité sont enregistrés ; il ne signifie pas qu’elles sont publiables.

## 3. Combien de documents sont présentables ?

La réponse dépend du public visé.

| Niveau | Compte | Autorisation réelle |
|---|---:|---|
| Candidats de revue interne avec contrôles visibles | 287 / 444 | Oui, pour revue interne contrôlée uniquement |
| Décision d’inclusion interne encore ouverte | 157 / 444 | Non, sélection préalable requise |
| QA visuelle source avec limites | 27 / 444 | Source lisible seulement ; pas une QA de publication v2 |
| Sorties du pilote QA | 9 | 7 PDF + 2 XLSX, `PASS_WITH_NOTES / NOT RELEASED` |
| Publication externe finale approuvée | 0 / 444 | Aucune approbation finale enregistrée |

Les 287 candidats internes se répartissent ainsi : Batch 0 = 57, Batch 1 = 18, Batch 4 = 69, Batch 5 = 22, Batch 6 = 14, Batch 7 = 6, Batch 8 = 52 et Batch 9 = 49. Les 157 décisions d’inclusion encore ouvertes concernent Batch 2 = 147, Batch 3 = 9 et Batch 0 = 1.

`Présentable en revue interne` signifie : montrer le document avec son statut, sa classification, ses limites et ses supersessions visibles. Cela ne signifie ni document final, ni diffusion publique, ni transmission partenaire, ni validation du contenu.

## 4. Baselines exactes

| Archive | SHA-256 | Rôle |
|---|---|---|
| `EMOPET_GLOBAL_CURRENT_2026-08-25(1).zip` | `f464f15959e2010e77302289d8622129673af613d3350bb863b85173b270b376` | Source globale immuable ; anomalie historique de release-control conservée |
| `EMOPET_DOCUMENT_CONTROL_GLOBAL_CHECKPOINT_2026-08-29_R2_NOT_RELEASED.zip` | `1fda848d1bb7a77513450f797171ba672f9a7fc7062b701f6af8c088ad713ce7` | Baseline de contrôle globale immuable |
| `EMOPET_DOCUMENT_CONTROL_GLOBAL_CHECKPOINT_2026-08-31_R3_PROPOSED_NOT_RELEASED.zip` | `fff0d6683ceaae087c7beb098fb31db7abc5a6bd24f4f8dafb19cf41e5ea3b37` | Delta proposé ; `HOLD / NOT RELEASED` |
| MOKO r1.4 | `2043fe122de169132192abd103913de237ea4691d2054c4160637fb71cc89690` | Historique/source immuable |
| MOKO r1.5 | `1e4d71af213cf34f84ad808b415d86c9f034bf08beec7b7b83374fdd37bc9cb4` | Candidat supersédé / `PREPARED_NOT_SENT` |
| MOKO r1.6 | `ca08ef8f81154a17cf1862884c19df6ff5d3a9a68163aded0fb587365794066c` | Candidat courant exact / `PREPARED_NOT_SENT / NOT RELEASED` |
| Pilote v2 | `04410ba80917fca415df48c5775ee8547bb81c20683662d01d61343a77938153` | Preuve QA immuable / `PASS_WITH_NOTES` |
| Delta associé R3 | `490e5390bee47831e98b6ff8af01672745fbf46462d01a688e2d6408e23e2676` | Préparation présignature restreinte / `NOT FOR SIGNATURE` |

## 5. Règles d’utilisation par dossier

### `00_GUIDES`

Lire d’abord ce guide. Le guide R2 exact reste disponible en Markdown, DOCX et PDF. Les copies R2 sont byte-identiques aux versions du checkpoint R2 et conservent leur statut `PASS_WITH_NOTES / NOT RELEASED`.

### `01_IMMUTABLE_SOURCE`

Ne jamais modifier ni « réparer » le ZIP source. Son anomalie historique de manifeste fait partie de l’audit. Toute future release doit être une nouvelle révision avec un nouveau manifeste et un nouveau jeu de sommes.

### `02_GLOBAL_CONTROL`

R2 est la baseline immuable. R3 est un delta proposé et ne remplace pas R2. Utiliser le registre v1.8 de R3 pour les avancées post-R2, tout en conservant les gates ouverts.

### `03_MOKO_LINEAGE`

Utiliser r1.6 comme unique candidat courant exact. Ne pas reconstruire r1.6 depuis r1.4. Ne pas modifier, réemballer ou rehasher silencieusement ces archives. Aucune transmission n’est enregistrée. Toute future publication à typographie contrôlée doit être une nouvelle révision.

### `04_PILOT_QA`

Conserver le pilote intact. Il peut servir de référence de QA et, après fermeture formelle d’OPEN-DOC-005, de référence de template. Il n’est pas une autorisation de conversion massive.

### `05_CONFIDENTIALITY_RESTRICTED`

Accès need-to-know uniquement. Le ZIP NDA du 21 juillet n’est pas banni : il est conservé dans la lignée R2 comme source historique immuable. Le delta R3 comporte 6 instruments actifs, 406 champs visibles et 14 gates présignature ; aucun instrument n’est `READY_FOR_SIGNATURE`, aucune identité d’associé n’est fournie et aucune signature ou transmission n’est revendiquée.

### `06_READINESS`

Le résumé donne les comptes. Le registre à 444 lignes donne, pour chaque occurrence, le statut interne, le profil public, la QA visuelle et la règle GitHub. Toujours filtrer sur la classification et le public avant de construire un pack de présentation.

## 6. Ce qui reste à fermer

| Gate | État | Preuve ou décision requise |
|---|---|---|
| OPEN-DOC-003 | ADVANCED / OPEN | Résoudre 13 candidats Drive↔ZIP par comparaison binaire ou métadonnées d’export exactes |
| OPEN-DOC-004 | MATRIX PREPARED / OPEN | Nommer les responsables humains et faire approuver les affectations par la Founder |
| OPEN-DOC-005 | HOLD / OPEN | Installer Fraunces, Instrument Sans et JetBrains Mono, ou enregistrer une acceptation Founder explicite des fallbacks |
| OPEN-PUB-001 | OPEN | Produire une révision de publication à typographie contrôlée et effectuer la QA page par page |
| OPEN-DOC-007 | ACTIVE / BLOCKED | Fournir les exports contrôlés actuels L4 Routing et MAT Stack avant réémission engineering |
| OPEN-VAL-B4-001 | ADVANCED / OPEN | Fournir preuves target/production, migrations, runtime auth/RLS, sécurité complète et approbations nommées |
| OPEN-DOC-009 | BLOCKED | Fournir devis fournisseurs actuels et confirmation écrite EMOPET-spécifique d’AudéLor |
| Gates présignature associé | 13 ouverts/conditionnels + 1 bloqué | Choisir l’instrument, compléter les parties, vérifier pouvoirs et identité, puis revue par conseil qualifié en droit français |

Les autres gates Produit, composant, validation physique, science, droit, manufacturing, transmission et financement restent gouvernés par leurs registres. Une mise en forme, une archive valide ou un lien source ne peut pas les fermer.

## 7. GitHub

Le corpus n’a actuellement **aucun document approuvé pour publication publique finale**. Par conséquent :

- ne pas pousser ce ZIP global, le lot associé, les NDA, les packages MOKO ou les documents internal/confidential/restricted vers un dépôt public ;
- ne pas interpréter les 4 gates fermés du registre comme 4 documents publiables ;
- séparer, dans tout dépôt privé approuvé, les artefacts `CLOSED_CONTROL_EVIDENCE` des artefacts `OPEN_NOT_RELEASED` ;
- conserver les statuts dans les noms de dossiers et dans un README ;
- obtenir une décision de release explicite avant toute promotion vers un dépôt public.

La présente consolidation n’effectue aucune promotion GitHub externe.

## 8. Ordre de continuation recommandé

1. Affecter les responsables humains d’OPEN-DOC-004.
2. Fermer le chemin typographique d’OPEN-DOC-005 sur un micro-batch, puis décider de la conversion massive.
3. Résoudre les 157 décisions d’inclusion, en commençant par Batch 2 et Batch 3.
4. Fournir les exports engineering manquants pour OPEN-DOC-007.
5. Fournir les preuves production/sécurité pour OPEN-VAL-B4-001.
6. Fournir devis et confirmation AudéLor pour OPEN-DOC-009.
7. Pour chaque associé réel, sélectionner un instrument et fermer les gates présignature avant signature.
8. Geler seulement ensuite un nouveau corpus de publication, générer le manifeste et `SHA256SUMS`, vérifier toutes les tailles/sommes, puis obtenir l’approbation de release.

## 9. Résultat de contrôle

**GLOBAL CONSOLIDATION R4: PASS_WITH_NOTES — NOT RELEASED**  
**CORPUS-WIDE MASS CONVERSION: BLOCKED**  
**FINAL PUBLICATION APPROVAL: 0 DOCUMENT**  
**INTERNAL REVIEW CANDIDATES WITH CONTROLS: 287 / 444**  
**INTERNAL INCLUSION DECISION OPEN: 157 / 444**

