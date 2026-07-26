# AUDIT.md — Audit du code réel

**Objet :** audit du dépôt `CedricxM/EMOPET`, branche `main`, sur le code effectivement présent.
**Méthode :** clone, inventaire, lecture ciblée, recherches lexicales, vérification de l'historique. Aucune supposition de mémoire, aucune performance annoncée sans preuve dans le code.
**Date :** 23 juillet 2026.
**Remplace :** le fichier `AUDIT.md` antérieur, qui était un rapport de découverte de skills Claude (16 juin 2026) et non un audit de code.

---

## 0. Verdict en une phrase

Le code existe, il est substantiel (environ 71 000 lignes) et discipliné sur le cœur d'inférence ; les deux problèmes dominants ne sont pas algorithmiques mais documentaires (dérive entre documents d'entrée et pile réelle) et éditoriaux (garde-fou lexical appliqué à du contenu statique).

---

## 1. Périmètre mesuré

| Zone | Technologie réelle | Volume | Maturité |
|---|---|---|---|
| `apps/mobile` + `apps/web` | Expo 52 / Next.js 15 | environ 35 000 lignes, 286 fichiers | avancé |
| `backend` | Hono 4, Drizzle, PostgreSQL, jose | environ 22 000 lignes, 44 fichiers (seeds inclus) | avancé, routes capteurs en TODO |
| `packages` | eli-engine, ble-protocol, ai-personality, shared | environ 9 900 lignes, 58 fichiers | solide sur le cœur |
| `firmware` | C, amorces DSP | 381 lignes, 7 fichiers | embryonnaire |
| `data`, `scripts` | référence et outillage | environ 3 200 lignes | support |

Écart au plan plateforme cible : ni `world-unity`, ni `realtime-social`, ni `city-data`. Le dépôt est plus focalisé que le plan, ce qui est cohérent avec la priorité au cœur produit.

---

## 2. Points forts vérifiés

**2.1 L'abstention est implémentée, pas seulement documentée.** `packages/eli-engine/src/rsm/index.ts` définit une machine d'états VALID, DEGRADED, SUPPRESSED avec hystérésis par séries, état initial DEGRADED (conservateur tant que non prouvé), et surtout un multiplicateur de bruit d'observation à 1,0, 3,0 et l'infini. Un capteur supprimé est neutralisé par la structure du filtre, pas par des conditions dispersées dans le code appelant. Le gating de confiance (`hooks/`) et le gating baseline (`baseline/`) complètent la chaîne.

**2.2 La fiabilité voyage avec la donnée.** `packages/ble-protocol/src/frames/types.ts` transporte un état de fiabilité par capteur (PVDF, cellules de charge, IMU, microphone, piézo) et une qualité d'orientation du collier, dans la trame elle-même. L'invariant « aucun indicateur ne circule sans son état de fiabilité » est porté au niveau du lien.

**2.3 Le contrôle de propriété est correct.** `backend/api/middleware/authorization.ts` renvoie 404 (et non 403) lorsqu'un utilisateur demande un chien qui ne lui appartient pas, ce qui évite de divulguer l'existence de la ressource. Le middleware est appliqué sur `dogs`, `sensors`, `health` et `community`.

**2.4 Le non médical est outillé et testé.** `apps/web/lib/context-engine/policies/nonMedicalPolicy.ts` interdit explicitement `emotion_as_fact`. Des tests assertent qu'aucun terme émotionnel ni médical n'apparaît dans les textes destinés à l'utilisateur. Le système d'icônes interdit les visages expressifs. Une culture de garde-fous vérifiés par tests est présente.

**2.5 Hygiène des secrets.** Aucun secret en clair détecté dans le code ni dans l'historique de `.env.example` (placeholders uniquement). `SECURITY_ROTATION_REQUIRED.md` et `SECURITY_CHECKLIST.md` existent et sont pertinents.

---

## 3. Défauts et risques

### D1. Dérive documentation contre code, sévère

`README.md` et `ARCHITECTURE.md` décrivaient une pile Python, Flutter, FastAPI, Alembic (`src/api/emopet_api.py`, `requirements.txt`, `flutter_app/`) qui n'existe pas : zéro fichier Python significatif, pas de dossier `src/`, backend en Hono TypeScript. `AUDIT.md` n'était pas un audit de code. Un nouveau contributeur échouait dès la première commande.

Corrigé par le présent lot documentaire pour `README.md`, `ARCHITECTURE.md` et `AUDIT.md`. Reste : `docker-compose.yml` déclare toujours un service `api` lancé par `python -m uvicorn src.api.emopet_api:app` avec un `Dockerfile` absent du dépôt. Ce service ne peut pas démarrer. Correction volontairement hors périmètre (modification de pile).

### D2. Tension entre le principe « aucune émotion » et les variables affectives internes

`backend/db/schema/sensors.ts` définit `eli_states.arousal` et `eli_states.valence` en `notNull`, `eli-v5` porte `peak_arousal`, et `packages/shared/src/types/sensor.ts` expose des compteurs `elevated_arousal_episodes_*`. L'intention correcte existe déjà dans le code sous forme de commentaire (`Valence proxy v_t. Internal to V1, NOT published`) et la projection `eliToDisplay` ne publie effectivement ni `arousal` ni `valence`.

Le défaut est que cet invariant n'était porté que par un commentaire, donc non exécutoire. Les routes `sensors` étant encore des TODO, la surface d'exposition n'existe pas : c'est le bon moment pour poser le garde-fou avant que la surface n'apparaisse.

Traité par `docs/architecture/ADR-0001-variables-affectives-latentes.md` et `backend/test/contract-affective-exposure.test.mjs`.

### D3. Le garde-fou lexical corrompt le contenu éditorial statique

`packages/ai-personality/src/bleiz/bleiz-content-scheduler.ts` applique une table de substitution (diagnostic vers observation, maladie vers inconfort, stress vers forte sollicitation). Appliquée en aveugle à des textes rédigés, elle produit des phrases cassées dans les seeds : « un forte sollicitation intense », « doit vigilancer », « vous présenteez », « présenteir le vide », « signal d'vigilance ». Plusieurs centaines de lignes de `backend/db/seeds/` sont affectées et partiraient en production en l'état.

Correction attendue : appliquer la substitution uniquement à la sortie générée par modèle, au moment de la génération, jamais à du contenu éditorial statique ; restaurer les seeds depuis une source propre puis relecture humaine. Hors périmètre du lot en cours (modification de seeds).

### D4. Contenu de premiers secours proche du domaine vétérinaire

`backend/db/seeds/freemium-templates-first-aid.ts` traite halètement, couleur des gencives, position latérale de sécurité, toxicité de l'alcool et de la pâte à levure, avec renvoi vétérinaire explicite. C'est de l'éducation générale et non une interprétation de capteur, donc défendable, mais cela longe la ligne non médicale et engage une responsabilité.

Correction attendue : maintenir la séparation physique avec la chaîne d'inférence ELI (déjà le cas), marquer ce contenu comme éducatif général, et le faire relire par un vétérinaire et par un conseil juridique.

### D5. Intégrité de trame BLE en XOR simple

`packages/ble-protocol/src/frames/types.ts` documente un contrôle d'intégrité par XOR de tous les octets précédents. Le XOR laisse passer de nombreux motifs d'erreurs multi-bits. Pour une liaison dont dépend le gating de fiabilité, un CRC-8 ou CRC-16-CCITT est indiqué, à coût de calcul négligeable. Confidentialité et authenticité au niveau lien restent à confirmer séparément.

### D6. ELI calibré avant preuve de signal

Le moteur est tuné et testé (tests EKF, vetoes, variabilité respiratoire, intégration 14 jours) contre des données synthétiques, alors que le banc SNS-1 n'a pas encore établi le rapport signal sur bruit de la respiration à travers mousse et pelage, et que le PCB TAG n'existe pas. Risque : des constantes provisoires deviennent des constantes de production.

Correction attendue : marquer structurellement les seuils comme provisoires, inscrire une phase de recalibration après le banc, empêcher les valeurs de test de migrer vers la production.

### D7. Firmware quasi inexistant

381 lignes d'amorces DSP. Aucune machine d'états de cycle de vie, aucun ERROR_SAFE, aucune pile BLE, aucun provisioning. Le prochain incrément firmware devrait commencer par la machine d'états et l'état de repli sûr, pas par davantage de traitement du signal.

---

## 4. Recoupement avec le plan plateforme

Le plan plateforme affirmait « base code : aucune, audit BLOCKED ». C'est factuellement faux. Le code existe, il est focalisé sur le cœur, et il implémente déjà des invariants que le plan listait comme à faire. Le gate G0 est donc franchissable et passe en PARTIAL_PASS (voir la carte des gates de la feuille de route).

Divergence de pile à réconcilier : le plan raisonne en Supabase et RLS, le code réel utilise PostgreSQL avec Drizzle, JWT `jose` et contrôle de propriété applicatif. La matrice RLS du plan ne s'applique pas telle quelle.

---

## 5. Actions priorisées

1. Réécrire les documents d'entrée sur la pile réelle. **Fait par ce lot.**
2. Confirmer la rotation des secrets listés dans `SECURITY_ROTATION_REQUIRED.md` (dépôt public, prudence maximale).
3. Formaliser et automatiser l'interdiction d'exposition des variables affectives latentes. **Fait par ce lot.**
4. Corriger le garde-fou lexical et restaurer les seeds.
5. Remplacer le XOR de trame par un CRC.
6. Marquer les seuils ELI comme provisoires et poser le jalon de recalibration après le banc SNS-1.
7. Réconcilier `docker-compose.yml` avec la pile réelle.
