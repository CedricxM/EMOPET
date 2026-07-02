# EMOPET GPT Prompts

Document de gouvernance V1 pour les prompts EMOPET.

Invariants globaux:
- jamais de diagnostic
- jamais de langage clinique
- jamais de certitude excessive
- jamais d'usage de signaux physiologiques au repos sans baseline suffisante et couverture minimale
- toujours respecter les budgets anti-spam et la minimisation des donnees
- si les donnees sont incompletes: reformuler en mode observationnel, educatif ou ne rien publier

## Prompt 1 - Relevance Filter

But: decider si une nouvelle information merite d'entrer dans le systeme.

Questions:
1. Est-ce utile au proprietaire dans les 30 prochains jours ?
2. Est-ce actionnable sans formuler d'avis medical ?
3. Est-ce compatible avec un usage freemium sans capteur ?
4. Est-ce explicable avec un wording simple, non alarmiste et non clinique ?
5. Est-ce necessaire au produit ou seulement interessant en R&D ?

Sortie attendue:
- `KEEP`
- `DEFER`
- `REJECT`

## Prompt 2 - Data Model Designer

But: transformer une information retenue en champs strictement necessaires.

Questions:
1. Quelle source produit ce signal: capteur, saisie utilisateur, communaute, calendrier, meteo ?
2. Quels champs sont indispensables ?
3. Quels champs sont optionnels ?
4. Quel champ appartient a `required_fields` ?
5. Quel consentement est necessaire ?
6. Quelle politique de retention minimale faut-il appliquer ?

Sortie attendue:
- nouveaux champs
- flags qualite / coverage
- required_fields
- politique de minimisation

## Prompt 3 - Trigger Gate

But: verifier qu'un template peut se declencher.

Checklist:
1. Le template a-t-il des `required_fields` suffisants ?
2. Les entitlements utilisateur autorisent-ils ce contenu ?
3. Le hardware est-il lie si le template depend de capteurs ?
4. La baseline au repos est-elle valide si le template utilise RR/PVDF ?
5. Le cooldown et le budget hebdo sont-ils respectes ?

Sortie attendue:
- `PUBLISH`
- `DEGRADE`
- `REJECT`

## Prompt 4 - Non-Medical Writer

But: produire un message user-facing.

Regles:
- parler d'observation, routine, tendance, confort, repere
- ne jamais parler de pathologie, symptome, traitement, urgence, anxiete, stress, agressivite
- utiliser un ton court, doux et concret
- si la confiance est degradee: expliciter le manque de recul, pas la donnee brute

Sortie attendue:
- un texte bref
- eventuellement un suffixe de prudence du type: `votre veterinaire peut vous conseiller`

## Prompt 5 - Confidence-Aware Rewriter

But: adapter le texte au niveau de confiance.

Regles:
- `PUBLISH`: message normal, factuel, non-medical
- `DEGRADE`: message educatif ou observationnel, jamais de push sante
- `REJECT`: aucune publication

## Prompt 6 - Privacy & Safety Reviewer

But: relire prompt et sortie finale.

Checklist:
1. Blacklist globale respectee ?
2. `never_say` du template respectee ?
3. Prompt et sortie ne contiennent aucun terme interdit ?
4. Le contenu n'expose-t-il pas une donnee sensible inutile ?
5. La localisation ou la communaute sont-elles utilisees seulement avec consentement ?

## Prompt 7 - UX Delivery Gate

But: choisir le bon canal.

Regles:
- priorite stable: Sante > Comportement > Activite > Communaute
- budgets quotidiens:
  - push <= 1
  - home insights <= 2
  - chat <= 1
  - posts communaute <= 3
- si freemium sans capteur: uniquement education, relation, communaute, annuaires

## Grille Finale

| Critere | Question | Verdict |
|---|---|---|
| Relevance | utile au produit maintenant ? | yes/no |
| Data | champs minimaux bien definis ? | yes/no |
| Required fields | chaque template sensible declare ses champs ? | yes/no |
| Confidence | baseline + coverage suffisants ? | yes/no |
| Entitlements | contenu autorise pour ce tier ? | yes/no |
| Safety | blacklist + never_say appliques ? | yes/no |
| Privacy | donnees minimales + consentements verifies ? | yes/no |
| UX | canal et budget respectes ? | yes/no |

## Process d'integration d'une nouvelle info

1. Passer par le Relevance Filter.
2. Si `KEEP`, definir les champs minimaux et les flags qualite.
3. Declarer les `required_fields`.
4. Definir les regles de baseline / coverage si le signal est physiologique.
5. Evaluer le tier cible: free, trial, kit, premium.
6. Ajouter ou modifier le template Bleiz avec `never_say`, `weeklyBudget`, `cooldownHours`.
7. Valider le wording non-medical.
8. Verifier le canal, le budget et l'anti-spam.
9. Ajouter un test pour missing data, gating et safety.
10. Documenter le changement dans la PR.
