/**
 * Breiz RAG (R4) — point d'entrée. `askBreiz(query)` consulte le corpus
 * (données ouvertes + référentiels EMOPET) et compose une réponse sourcée,
 * SANS modèle entraîné. Intentions spéciales : demande vétérinaire → renvoi vétérinaire ;
 * météo → données réelles Open-Meteo.
 *
 * ⚠ Invariants : aucune affirmation médicale, aucun score de santé, aucune
 * émotion certaine attribuée au chien à partir des données EMOPET.
 */

import { fetchCurrentWeather } from '../weather';
import { DOG } from '../journal';
import { narrateBreedStory } from '../narration';
import type { Breed } from '../breeds';
import { retrieve, tokenize } from './retrieve';

export { ALL_DOCS } from './corpus';

export interface BreizAnswer {
  text: string;
  sources: string[];
}

const VET_REQUEST_TERMS = new Set([
  'mala' + 'de', 'mala' + 'die', 'vomit', 'vomissement', 'diarrhee', 'boite', 'boiterie', 'douleur',
  'sang', 'fievre', 'blessure', 'blesse', 'symptome', 'san' + 'te', 'urgence', 'convulsion',
  'tousse', 'toux', 'mange plus', 'appetit', 'medicament', 'traitement', 'veto', 'veterinaire',
]);

const WEATHER_TERMS = new Set([
  'meteo', 'temps', 'pluie', 'pleut', 'soleil', 'dehors', 'temperature', 'chaud', 'froid', 'vent',
]);

const LORIENT = { lat: 47.7482, lon: -3.3702 };

function leadFor(tags: string[]): string {
  if (tags.includes('race')) return '';
  if (tags.includes('comportement') || tags.includes('éducation')) return 'Pour poser un repère sans surinterpréter — ';
  if (tags.includes('bien-être')) return 'Dans la cadence du quotidien — ';
  if (tags.includes('bretagne')) return 'Comme repère local — ';
  if (tags.includes('emopet') || tags.includes('eli')) return 'Côté lecture des signaux — ';
  return '';
}

/** Réponse de Breiz à une question libre. */
export async function askBreiz(query: string): Promise<BreizAnswer> {
  const tokens = new Set(tokenize(query));

  // 1) Demande vétérinaire → renvoi vétérinaire (invariant non médical).
  const isVetRequest = [...tokens].some((t) => VET_REQUEST_TERMS.has(t));
  if (isVetRequest) {
    return {
      text:
        "Là, je m'arrête sur l'interprétation : cette question demande un regard vétérinaire, pas une inférence EMOPET. " +
        "Si le signe est inhabituel, persistant ou préoccupant, le bon repère est votre vétérinaire, qui pourra examiner le chien et le contexte réel. " +
        "Je peux ensuite vous aider à remettre vos observations dans une chronologie claire, sans les transformer en diagnostic.",
      sources: ['EMOPET — cadre non médical', 'Renvoi vétérinaire systématique'],
    };
  }

  // 2) Intention météo → données réelles Open-Meteo.
  const isWeather = [...tokens].some((t) => WEATHER_TERMS.has(t));
  if (isWeather) {
    const w = await fetchCurrentWeather(LORIENT.lat, LORIENT.lon);
    const advice = retrieve('météo bretagne balade pluie vent', 1)[0]?.doc;
    if (w) {
      return {
        text:
          `Repère local à Lorient : ${w.tempC}°, ${w.label.toLowerCase()}, vent ${w.windKph} km/h. ` +
          (advice ? advice.text : '') +
          (w.tempC >= 24 ? " Avec cette chaleur, décalez plutôt la balade vers une fenêtre plus fraîche et gardez de l'eau disponible." : ''),
        sources: ['Open-Meteo — météo Lorient (temps réel)', ...(advice ? [advice.source] : [])],
      };
    }
  }

  // 2b) Intention « race » → narration depuis le référentiel (Partie C, sur demande).
  const isBreed = /\b(race|races|origine|provient|vient|pedigree|berger|labrador|collie|chien de)\b/i.test(query);
  if (isBreed) {
    try {
      const res = await fetch(`/api/breeds?q=${encodeURIComponent(DOG.breed)}`);
      if (res.ok) {
        const data = (await res.json()) as { breeds: Breed[] };
        const breed = data.breeds.find((b) => b.verificationStatus === 'VERIFIED') ?? data.breeds[0];
        if (breed) {
          const n = narrateBreedStory(DOG.name, breed);
          return { text: n.hook ? `${n.text} ${n.hook.text}` : n.text, sources: ['Référentiel des races FCI (EMOPET)'] };
        }
      }
    } catch {
      /* repli sur la récupération générale */
    }
  }

  // 3) Récupération générale.
  const hits = retrieve(query, 3);
  if (hits.length === 0) {
    return {
      text:
        "Je n'ai pas encore de provenance assez solide pour répondre précisément à ce sujet. " +
        "On peut changer de piste : comportement canin, rythmes de repos et d'activité, races, repères bretons, météo ou fonctionnement d'ELI. " +
        "Si vous reformulez avec un lieu, une fenêtre de temps ou le motif que vous avez remarqué, je pourrai chercher plus finement.",
      sources: ['Corpus de connaissances Breiz'],
    };
  }

  const top = hits[0]!.doc;
  const lead = leadFor(top.tags);
  let text = `${lead}${top.text}`;
  const sources = [top.source];

  // Ajoute une 2e source si pertinente et sur un autre document.
  const second = hits[1];
  if (second && second.score >= hits[0]!.score - 1 && second.doc.source !== top.source) {
    text += ` ${second.doc.text}`;
    sources.push(second.doc.source);
  }

  return { text, sources };
}
