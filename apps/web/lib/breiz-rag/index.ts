/**
 * Breiz RAG (R4) — point d'entrée. `askBreiz(query)` consulte le corpus
 * (données ouvertes + référentiels EMOPET) et compose une réponse sourcée,
 * SANS modèle entraîné. Intentions spéciales : demande vétérinaire → renvoi vétérinaire ;
 * météo → données réelles Open-Meteo.
 *
 * ⚠ Invariants : aucune affirmation médicale, aucune émotion humaine du chien.
 */

import { fetchCurrentWeather } from '../weather';
import { narrateBreedStory } from '../narration';
import type { Breed } from '../breeds';
import { ALL_DOCS, type KnowledgeDoc } from './corpus';
import { isServable, sourceLabel } from './provenance';
import { retrieve, tokenize } from './retrieve';

export { ALL_DOCS } from './corpus';

export interface BreizAnswer {
  text: string;
  /**
   * Références réellement consultées pour composer la réponse. Vide pour un
   * gabarit (renvoi vétérinaire, absence de fiche) : une règle produit n'est
   * pas une source, et l'afficher sous « Source » gonflerait la provenance.
   */
  sources: string[];
}

/**
 * Contexte confirmé par le propriétaire. Sans lui, Breiz ne présume rien du
 * chien : raconter la race du chien de démonstration à n'importe quel
 * utilisateur reviendrait à inventer un souvenir (#226, audit de transparence).
 */
export interface BreizAskContext {
  confirmedDog?: { name: string; breed: string };
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

/** Libellé de provenance d'une fiche servie (D1, #226) ; vide si non publiable. */
function sourcesOf(doc: KnowledgeDoc): string[] {
  const label = sourceLabel(doc.provenance);
  return label ? [label] : [];
}

/** Fiches publiables : un fait de tiers sans autorité de publication revue est ignoré. */
function servable(query: string, k: number) {
  return retrieve(query, ALL_DOCS.length).filter((hit) => isServable(hit.doc.provenance)).slice(0, k);
}

function leadFor(tags: string[]): string {
  if (tags.includes('race')) return '';
  if (tags.includes('comportement') || tags.includes('éducation')) return 'Côté comportement — ';
  if (tags.includes('bien-être')) return 'Pour le bien-être au quotidien — ';
  if (tags.includes('bretagne')) return 'En Bretagne — ';
  if (tags.includes('emopet') || tags.includes('eli')) return '';
  return '';
}

/** Réponse de Breiz à une question libre. */
export async function askBreiz(query: string, context: BreizAskContext = {}): Promise<BreizAnswer> {
  const tokens = new Set(tokenize(query));

  // 1) Demande vétérinaire → renvoi vétérinaire (invariant non médical).
  // Ce chemin n'a accès à aucune donnée ELI : il ne propose donc pas de les lire.
  const isVetRequest = [...tokens].some((t) => VET_REQUEST_TERMS.has(t));
  if (isVetRequest) {
    return {
      text:
        "Je ne suis pas un outil médical et je ne peux pas évaluer une situation qui demande un avis vétérinaire. " +
        "Pour tout signe inhabituel ou persistant, le bon réflexe est de prendre rendez-vous avec votre vétérinaire, qui pourra examiner le contexte. " +
        "Je peux en revanche vous renseigner sur le comportement, les balades, les races ou le fonctionnement d’ELI.",
      sources: [],
    };
  }

  // 2) Intention météo → données réelles Open-Meteo.
  const isWeather = [...tokens].some((t) => WEATHER_TERMS.has(t));
  if (isWeather) {
    const w = await fetchCurrentWeather(LORIENT.lat, LORIENT.lon);
    const advice = servable('météo bretagne balade pluie vent', 1)[0]?.doc;
    if (w) {
      return {
        text:
          `À Lorient en ce moment : ${w.tempC}°, ${w.label.toLowerCase()}, vent ${w.windKph} km/h. ` +
          (advice ? advice.text : '') +
          (w.tempC >= 24 ? ' Avec cette chaleur, privilégiez les heures fraîches et de l’eau.' : ''),
        sources: ['Open-Meteo — météo Lorient (temps réel)', ...(advice ? sourcesOf(advice) : [])],
      };
    }
  }

  // 2b) Intention « race » → narration depuis le référentiel (Partie C, sur demande),
  // seulement pour un chien confirmé par le propriétaire.
  const dog = context.confirmedDog;
  const isBreed = /\b(race|races|origine|provient|vient|pedigree|berger|labrador|collie|chien de)\b/i.test(query);
  if (isBreed && dog) {
    try {
      const res = await fetch(`/api/breeds?q=${encodeURIComponent(dog.breed)}`);
      if (res.ok) {
        const data = (await res.json()) as { breeds: Breed[] };
        const breed = data.breeds.find((b) => b.verificationStatus === 'VERIFIED') ?? data.breeds[0];
        if (breed) {
          const n = narrateBreedStory(dog.name, breed);
          return { text: n.hook ? `${n.text} ${n.hook.text}` : n.text, sources: ['Référentiel des races FCI (EMOPET)'] };
        }
      }
    } catch {
      /* repli sur la récupération générale */
    }
  }

  // 3) Récupération générale. Toutes les fiches de race partagent « race » et
  // « origine » : sans ce filtre, « l'origine de sa race » servait la première
  // race du référentiel comme si c'était celle du chien. Une fiche de race ne
  // répond donc qu'à une question qui nomme cette race.
  const namesBreed = (doc: KnowledgeDoc) =>
    doc.tags.some((tag) => tag !== 'race' && tokenize(tag).some((t) => tokens.has(t)));
  const hits = servable(query, ALL_DOCS.length)
    .filter((hit) => !hit.doc.tags.includes('race') || namesBreed(hit.doc))
    .slice(0, 3);
  // « sa race », « la race de mon chien » : la réponse dépend d'un chien que
  // Breiz ne connaît pas. Demander plutôt que servir une fiche voisine.
  const asksOwnDogBreed = /\b(sa|ta|votre)\s+race\b|\brace\s+de\s+(mon|ma|notre)\b/i.test(query);
  const namedBreedHit = hits.some((hit) => hit.doc.tags.includes('race'));
  if (asksOwnDogBreed && !dog && !namedBreedHit) {
    return {
      text:
        "Je ne connais pas la race de votre chien et je préfère ne rien supposer. " +
        "Laquelle est-ce ? Je vous dirai ce que le référentiel des races en dit.",
      sources: [],
    };
  }
  if (hits.length === 0) {
    return {
      text:
        "Je n’ai pas encore de fiche sur ce sujet précis. Je peux vous renseigner sur le comportement canin " +
        "(signaux d’apaisement, renforcement positif), le bien-être (exercice, repos, chaleur), les races, " +
        "la Bretagne (plages, météo) ou le fonctionnement d’ELI. Reformulez si vous voulez.",
      sources: [],
    };
  }

  const top = hits[0]!.doc;
  const lead = leadFor(top.tags);
  let text = `${lead}${top.text}`;
  const sources = sourcesOf(top);

  // Ajoute une 2e source si pertinente et sur un autre document.
  const second = hits[1];
  if (second && second.score >= hits[0]!.score - 1 && sourceLabel(second.doc.provenance) !== sourceLabel(top.provenance)) {
    text += ` ${second.doc.text}`;
    sources.push(...sourcesOf(second.doc));
  }

  return { text, sources };
}
