/**
 * Breiz RAG (R4) — point d'entrée. `askBreiz(query)` consulte le corpus
 * (données ouvertes + référentiels EMOPET) et compose une réponse sourcée,
 * SANS modèle entraîné. Intentions spéciales : demande vétérinaire → renvoi vétérinaire ;
 * météo → données réelles Open-Meteo.
 *
 * ⚠ Invariants : aucune affirmation médicale, aucune émotion humaine du chien.
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
  if (tags.includes('comportement') || tags.includes('éducation')) return 'Côté comportement — ';
  if (tags.includes('bien-être')) return 'Pour le bien-être au quotidien — ';
  if (tags.includes('bretagne')) return 'En Bretagne — ';
  if (tags.includes('emopet') || tags.includes('eli')) return '';
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
        "Je ne suis pas un outil médical et je ne peux pas évaluer une situation qui demande un avis vétérinaire. " +
        "Pour tout signe inhabituel ou persistant, le bon réflexe est de prendre rendez-vous avec votre vétérinaire, qui pourra examiner le contexte. " +
        "Je peux en revanche vous aider sur le comportement, les balades, les races ou la lecture de vos indicateurs ELI.",
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
          `À Lorient en ce moment : ${w.tempC}°, ${w.label.toLowerCase()}, vent ${w.windKph} km/h. ` +
          (advice ? advice.text : '') +
          (w.tempC >= 24 ? ' Avec cette chaleur, privilégiez les heures fraîches et de l’eau.' : ''),
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
        "Je n’ai pas encore de fiche sur ce sujet précis. Je peux vous renseigner sur le comportement canin " +
        "(signaux d’apaisement, renforcement positif), le bien-être (exercice, repos, chaleur), les races, " +
        "la Bretagne (plages, météo) ou le fonctionnement d’ELI. Reformulez si vous voulez.",
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
