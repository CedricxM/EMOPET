/**
 * Registre des providers EMOPET — matrice large, typée et auditable.
 *
 * Source de vérité unique pour : la matrice provider (docs), les feature flags
 * (.env), l'activation et l'arbitrage. Aucune clé ici — uniquement des NOMS de
 * variables d'env. « scaffold » = typé/documenté mais adaptateur non câblé ;
 * « disabled »/`disabled_by_default` = présent mais jamais appelé (enjeu
 * privacy/commercial). On ne retient pas que les API faciles : les API utiles mais
 * complexes/risquées sont cataloguées en scaffold/premium_candidate, pas activées.
 */

import type { ProviderCategory, ProviderDescriptor } from './types';
import { resolveActivation } from './config';

type DefaultedFields =
  | 'requiresAuth'
  | 'envKeys'
  | 'freeTierNotes'
  | 'commercialUseRisk'
  | 'privacyRisk'
  | 'rateLimitRisk'
  | 'implementationComplexity'
  | 'productValueForEMOPET';

/** Fabrique : valeurs par défaut prudentes, surchargées au besoin. */
function p(
  d: Omit<ProviderDescriptor, DefaultedFields> & Partial<Pick<ProviderDescriptor, DefaultedFields>>,
): ProviderDescriptor {
  return {
    requiresAuth: false,
    envKeys: [],
    freeTierNotes: '',
    commercialUseRisk: 'low',
    privacyRisk: 'low',
    rateLimitRisk: 'medium',
    implementationComplexity: 'medium',
    productValueForEMOPET: 'medium',
    ...d,
  };
}

export const PROVIDERS: readonly ProviderDescriptor[] = [
  // ── 1. Météo ───────────────────────────────────────────────────────────────
  p({ providerName: 'open-meteo', category: 'weather', baseUrl: 'https://api.open-meteo.com/v1', flagKey: 'API_OPEN_METEO_ENABLED', status: 'active', recommended: 'active_now', commercialUseRisk: 'low', privacyRisk: 'low', rateLimitRisk: 'low', implementationComplexity: 'low', productValueForEMOPET: 'high', freeTierNotes: 'Open data, sans clé (CC-BY 4.0). Déjà intégré (lib/weather.ts).', fallbackProvider: 'met-no' }),
  p({ providerName: 'met-no', category: 'weather', baseUrl: 'https://api.met.no/weatherapi', flagKey: 'API_MET_NO_ENABLED', status: 'fallback', recommended: 'fallback', rateLimitRisk: 'medium', implementationComplexity: 'medium', productValueForEMOPET: 'high', freeTierNotes: 'Gratuit, User-Agent obligatoire. Repli de open-meteo.' }),
  p({ providerName: 'weatherapi', category: 'weather', baseUrl: 'https://api.weatherapi.com/v1', flagKey: 'API_WEATHERAPI_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_WEATHERAPI_KEY'], commercialUseRisk: 'medium', freeTierNotes: 'Free tier généreux, clé requise.' }),
  p({ providerName: 'openweathermap', category: 'weather', baseUrl: 'https://api.openweathermap.org/data/2.5', flagKey: 'API_OPENWEATHERMAP_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_OPENWEATHERMAP_KEY'], commercialUseRisk: 'medium', freeTierNotes: 'Free tier, clé requise.' }),
  p({ providerName: 'pirate-weather', category: 'weather', baseUrl: 'https://api.pirateweather.net', flagKey: 'API_PIRATE_WEATHER_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_PIRATE_WEATHER_KEY'], freeTierNotes: 'Compatible schéma Dark Sky.' }),
  p({ providerName: 'wttr-in', category: 'weather', baseUrl: 'https://wttr.in', flagKey: 'API_WTTR_IN_ENABLED', status: 'experimental', recommended: 'experimental', commercialUseRisk: 'medium', rateLimitRisk: 'high', productValueForEMOPET: 'low', freeTierNotes: 'Utile en dev/test, pas pour la production.' }),
  p({ providerName: 'visual-crossing', category: 'weather', baseUrl: 'https://weather.visualcrossing.com', flagKey: 'API_VISUAL_CROSSING_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_VISUAL_CROSSING_KEY'], commercialUseRisk: 'medium', freeTierNotes: 'Historique riche, quota gratuit limité.' }),
  p({ providerName: 'oikolab', category: 'weather', baseUrl: 'https://api.oikolab.com', flagKey: 'API_OIKOLAB_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_OIKOLAB_KEY'], implementationComplexity: 'high', freeTierNotes: 'Données historiques/réanalyse.' }),
  p({ providerName: 'openuv', category: 'weather', baseUrl: 'https://api.openuv.io/api/v1', flagKey: 'API_OPENUV_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_OPENUV_KEY'], freeTierNotes: 'Index UV (contexte chaleur/ensoleillement).' }),
  p({ providerName: 'rainviewer', category: 'weather', baseUrl: 'https://api.rainviewer.com/public', flagKey: 'API_RAINVIEWER_ENABLED', status: 'scaffold', recommended: 'scaffold_now', freeTierNotes: 'Radar pluie, sans clé.' }),
  p({ providerName: 'weatherbit', category: 'weather', baseUrl: 'https://api.weatherbit.io/v2.0', flagKey: 'API_WEATHERBIT_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_WEATHERBIT_KEY'], commercialUseRisk: 'medium' }),

  // ── 2. Qualité de l'air / pollution / pollen ──────────────────────────────
  p({ providerName: 'openaq', category: 'air_quality', baseUrl: 'https://api.openaq.org/v3', flagKey: 'API_OPENAQ_ENABLED', status: 'active', recommended: 'active_now', privacyRisk: 'low', rateLimitRisk: 'medium', productValueForEMOPET: 'high', freeTierNotes: 'Open data mesures qualité air. Clé recommandée v3.', envKeys: ['API_OPENAQ_KEY'], fallbackProvider: 'aqicn' }),
  p({ providerName: 'aqicn', category: 'air_quality', baseUrl: 'https://api.waqi.info', flagKey: 'API_AQICN_ENABLED', status: 'fallback', recommended: 'fallback', requiresAuth: true, envKeys: ['API_AQICN_TOKEN'], productValueForEMOPET: 'high', freeTierNotes: 'Token gratuit, large couverture. Repli OpenAQ.' }),
  p({ providerName: 'iqair', category: 'air_quality', baseUrl: 'https://api.airvisual.com/v2', flagKey: 'API_IQAIR_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_IQAIR_KEY'], commercialUseRisk: 'medium', freeTierNotes: 'Quota dépend de la clé.' }),
  p({ providerName: 'purpleair', category: 'air_quality', baseUrl: 'https://api.purpleair.com/v1', flagKey: 'API_PURPLEAIR_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_PURPLEAIR_KEY'], freeTierNotes: 'Réseau de capteurs communautaires.' }),
  p({ providerName: 'pm25-open-data', category: 'air_quality', baseUrl: 'https://pm25.lass-net.org', flagKey: 'API_PM25_OPEN_DATA_ENABLED', status: 'scaffold', recommended: 'scaffold_now', productValueForEMOPET: 'low' }),
  p({ providerName: 'breezometer-pollen', category: 'air_quality', baseUrl: 'https://api.breezometer.com', flagKey: 'API_BREEZOMETER_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_BREEZOMETER_KEY'], commercialUseRisk: 'high', freeTierNotes: 'Pollen — quota/clé, usage commercial à valider.' }),
  p({ providerName: 'carbon-interface', category: 'air_quality', baseUrl: 'https://www.carboninterface.com/api/v1', flagKey: 'API_CARBON_INTERFACE_ENABLED', status: 'disabled', recommended: 'disabled_by_default', requiresAuth: true, envKeys: ['API_CARBON_INTERFACE_KEY'], productValueForEMOPET: 'low', freeTierNotes: 'Estimations carbone — hors cœur EMOPET.' }),
  p({ providerName: 'climatiq', category: 'air_quality', baseUrl: 'https://api.climatiq.io', flagKey: 'API_CLIMATIQ_ENABLED', status: 'disabled', recommended: 'disabled_by_default', requiresAuth: true, envKeys: ['API_CLIMATIQ_KEY'], productValueForEMOPET: 'low' }),

  // ── 3. Géocodage / localisation ───────────────────────────────────────────
  p({ providerName: 'adresse-data-gouv', category: 'geocoding', baseUrl: 'https://api-adresse.data.gouv.fr', flagKey: 'API_ADRESSE_DATA_GOUV_ENABLED', status: 'active', recommended: 'active_now', privacyRisk: 'low', rateLimitRisk: 'low', implementationComplexity: 'low', productValueForEMOPET: 'high', freeTierNotes: 'BAN — géocodage FR open data, sans clé.', fallbackProvider: 'geoapify' }),
  p({ providerName: 'geoapi-gouv', category: 'geocoding', baseUrl: 'https://geo.api.gouv.fr', flagKey: 'API_GEOAPI_GOUV_ENABLED', status: 'active', recommended: 'active_now', privacyRisk: 'low', rateLimitRisk: 'low', implementationComplexity: 'low', productValueForEMOPET: 'high', freeTierNotes: 'Communes/départements/régions FR, sans clé.' }),
  p({ providerName: 'geoapify', category: 'geocoding', baseUrl: 'https://api.geoapify.com/v1', flagKey: 'API_GEOAPIFY_ENABLED', status: 'scaffold', recommended: 'fallback', requiresAuth: true, envKeys: ['API_GEOAPIFY_KEY'], freeTierNotes: 'Repli international hors FR.' }),
  p({ providerName: 'geocode-xyz', category: 'geocoding', baseUrl: 'https://geocode.xyz', flagKey: 'API_GEOCODE_XYZ_ENABLED', status: 'experimental', recommended: 'experimental', rateLimitRisk: 'high', productValueForEMOPET: 'low' }),
  p({ providerName: 'geodb-cities', category: 'geocoding', baseUrl: 'https://wft-geo-db.p.rapidapi.com', flagKey: 'API_GEODB_CITIES_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_GEODB_KEY'] }),
  p({ providerName: 'bigdatacloud', category: 'geocoding', baseUrl: 'https://api.bigdatacloud.net', flagKey: 'API_BIGDATACLOUD_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_BIGDATACLOUD_KEY'] }),
  p({ providerName: 'ipstack', category: 'geocoding', baseUrl: 'https://api.ipstack.com', flagKey: 'API_IPSTACK_ENABLED', status: 'disabled', recommended: 'disabled_by_default', requiresAuth: true, envKeys: ['API_IPSTACK_KEY'], privacyRisk: 'high', productValueForEMOPET: 'low', freeTierNotes: 'Géoloc IP — OFF par défaut (confidentialité).' }),
  p({ providerName: 'ipapi', category: 'geocoding', baseUrl: 'https://ipapi.com/api', flagKey: 'API_IPAPI_ENABLED', status: 'disabled', recommended: 'disabled_by_default', privacyRisk: 'high', productValueForEMOPET: 'low', freeTierNotes: 'Géoloc IP — OFF par défaut (confidentialité).' }),
  p({ providerName: 'countrystatecity', category: 'geocoding', baseUrl: 'https://api.countrystatecity.in/v1', flagKey: 'API_COUNTRYSTATECITY_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_COUNTRYSTATECITY_KEY'], productValueForEMOPET: 'low' }),

  // ── 4. Open data / territoire ─────────────────────────────────────────────
  p({ providerName: 'data-gouv-fr', category: 'open_data', baseUrl: 'https://www.data.gouv.fr/api/1', flagKey: 'API_DATA_GOUV_ENABLED', status: 'scaffold', recommended: 'scaffold_now', productValueForEMOPET: 'high', freeTierNotes: 'Catalogue open data FR. Complète lib/data/territory.' }),
  p({ providerName: 'nantes-open-data', category: 'open_data', baseUrl: 'https://data.nantesmetropole.fr/api', flagKey: 'API_NANTES_OPEN_DATA_ENABLED', status: 'scaffold', recommended: 'scaffold_now', productValueForEMOPET: 'low' }),
  p({ providerName: 'socrata', category: 'open_data', baseUrl: 'https://api.us.socrata.com', flagKey: 'API_SOCRATA_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_SOCRATA_APP_TOKEN'] }),
  p({ providerName: 'teleport', category: 'open_data', baseUrl: 'https://api.teleport.org/api', flagKey: 'API_TELEPORT_ENABLED', status: 'experimental', recommended: 'experimental', productValueForEMOPET: 'medium', freeTierNotes: 'Qualité de vie urbaine — vérifier disponibilité.' }),
  p({ providerName: 'world-bank', category: 'open_data', baseUrl: 'https://api.worldbank.org/v2', flagKey: 'API_WORLD_BANK_ENABLED', status: 'scaffold', recommended: 'scaffold_now', productValueForEMOPET: 'low', freeTierNotes: 'Macro-contexte pays.' }),
  p({ providerName: 'epa', category: 'open_data', baseUrl: 'https://www.epa.gov/enviro', flagKey: 'API_EPA_ENABLED', status: 'scaffold', recommended: 'scaffold_now', productValueForEMOPET: 'low' }),
  p({ providerName: 'openafrica', category: 'open_data', baseUrl: 'https://africaopendata.org/api/3', flagKey: 'API_OPENAFRICA_ENABLED', status: 'scaffold', recommended: 'scaffold_now', productValueForEMOPET: 'low' }),

  // ── 5. Connaissance chien / onboarding ────────────────────────────────────
  p({ providerName: 'dog-ceo', category: 'dog_knowledge', baseUrl: 'https://dog.ceo/api', flagKey: 'API_DOG_CEO_ENABLED', status: 'active', recommended: 'active_now', rateLimitRisk: 'low', implementationComplexity: 'low', freeTierNotes: 'Images de races, sans clé. Onboarding/UI.', fallbackProvider: 'the-dog-api' }),
  p({ providerName: 'the-dog-api', category: 'dog_knowledge', baseUrl: 'https://api.thedogapi.com/v1', flagKey: 'API_THE_DOG_API_ENABLED', status: 'fallback', recommended: 'fallback', requiresAuth: true, envKeys: ['API_THE_DOG_API_KEY'], freeTierNotes: 'Métadonnées races. Complète le référentiel FCI maison.' }),
  p({ providerName: 'dog-facts', category: 'dog_knowledge', baseUrl: 'https://dogapi.dog/api/v2', flagKey: 'API_DOG_FACTS_ENABLED', status: 'experimental', recommended: 'experimental', productValueForEMOPET: 'low', freeTierNotes: 'Contenu ludique uniquement.' }),
  p({ providerName: 'randomdog', category: 'dog_knowledge', baseUrl: 'https://random.dog', flagKey: 'API_RANDOMDOG_ENABLED', status: 'disabled', recommended: 'disabled_by_default', productValueForEMOPET: 'low' }),
  p({ providerName: 'petfinder', category: 'dog_knowledge', baseUrl: 'https://api.petfinder.com/v2', flagKey: 'API_PETFINDER_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_PETFINDER_KEY', 'API_PETFINDER_SECRET'], freeTierNotes: 'Écosystème adoption (futur).' }),
  p({ providerName: 'adoptapet', category: 'dog_knowledge', baseUrl: 'https://api.adoptapet.com', flagKey: 'API_ADOPTAPET_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_ADOPTAPET_KEY'], productValueForEMOPET: 'low' }),
  p({ providerName: 'movebank', category: 'dog_knowledge', baseUrl: 'https://www.movebank.org/movebank/service', flagKey: 'API_MOVEBANK_ENABLED', status: 'scaffold', recommended: 'experimental', requiresAuth: true, envKeys: ['API_MOVEBANK_USER', 'API_MOVEBANK_PASSWORD'], implementationComplexity: 'high', productValueForEMOPET: 'low', freeTierNotes: 'Recherche comportement animal — inspiration R&D, pas d\'inférence clinique.' }),
  p({ providerName: 'ebird', category: 'dog_knowledge', baseUrl: 'https://api.ebird.org/v2', flagKey: 'API_EBIRD_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_EBIRD_KEY'], productValueForEMOPET: 'low' }),
  p({ providerName: 'xeno-canto', category: 'dog_knowledge', baseUrl: 'https://xeno-canto.org/api/2', flagKey: 'API_XENO_CANTO_ENABLED', status: 'scaffold', recommended: 'scaffold_now', productValueForEMOPET: 'low' }),

  // ── 6. Calendrier / routine ───────────────────────────────────────────────
  p({ providerName: 'nager-date', category: 'calendar', baseUrl: 'https://date.nager.at/api/v3', flagKey: 'API_NAGER_DATE_ENABLED', status: 'active', recommended: 'active_now', rateLimitRisk: 'low', implementationComplexity: 'low', productValueForEMOPET: 'high', freeTierNotes: 'Jours fériés par pays, sans clé.' }),
  p({ providerName: 'calendarific', category: 'calendar', baseUrl: 'https://calendarific.com/api/v2', flagKey: 'API_CALENDARIFIC_ENABLED', status: 'scaffold', recommended: 'fallback', requiresAuth: true, envKeys: ['API_CALENDARIFIC_KEY'] }),
  p({ providerName: 'non-working-days', category: 'calendar', baseUrl: 'https://api.api-ninjas.com/v1', flagKey: 'API_NON_WORKING_DAYS_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_API_NINJAS_KEY'], productValueForEMOPET: 'low' }),
  p({ providerName: 'google-calendar', category: 'calendar', baseUrl: 'https://www.googleapis.com/calendar/v3', flagKey: 'API_GOOGLE_CALENDAR_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_GOOGLE_CALENDAR_CLIENT_ID', 'API_GOOGLE_CALENDAR_CLIENT_SECRET'], privacyRisk: 'high', implementationComplexity: 'high', freeTierNotes: 'OAuth utilisateur — futur, consentement explicite.' }),

  // ── 7. Traduction / langue / texte ────────────────────────────────────────
  p({ providerName: 'libretranslate', category: 'translation', baseUrl: 'https://libretranslate.com', flagKey: 'API_LIBRETRANSLATE_ENABLED', status: 'active', recommended: 'active_now', requiresAuth: true, envKeys: ['API_LIBRETRANSLATE_URL', 'API_LIBRETRANSLATE_KEY'], freeTierNotes: 'Auto-hébergeable. Onboarding multilingue.', fallbackProvider: 'detectlanguage' }),
  p({ providerName: 'detectlanguage', category: 'translation', baseUrl: 'https://ws.detectlanguage.com/0.2', flagKey: 'API_DETECTLANGUAGE_ENABLED', status: 'fallback', recommended: 'fallback', requiresAuth: true, envKeys: ['API_DETECTLANGUAGE_KEY'] }),
  p({ providerName: 'languagelayer', category: 'translation', baseUrl: 'https://api.languagelayer.com', flagKey: 'API_LANGUAGELAYER_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_LANGUAGELAYER_KEY'] }),
  p({ providerName: 'lecto-translation', category: 'translation', baseUrl: 'https://api.lecto.ai/v1', flagKey: 'API_LECTO_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_LECTO_KEY'] }),
  p({ providerName: 'meaningcloud-sentiment', category: 'translation', baseUrl: 'https://api.meaningcloud.com', flagKey: 'API_MEANINGCLOUD_ENABLED', status: 'scaffold', recommended: 'experimental', requiresAuth: true, envKeys: ['API_MEANINGCLOUD_KEY'], freeTierNotes: 'Sentiment des RETOURS UTILISATEUR uniquement — jamais l\'état du chien.' }),
  p({ providerName: 'watson-nlu', category: 'translation', baseUrl: 'https://api.eu-gb.natural-language-understanding.watson.cloud.ibm.com', flagKey: 'API_WATSON_NLU_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_WATSON_NLU_KEY', 'API_WATSON_NLU_URL'], commercialUseRisk: 'medium', implementationComplexity: 'high' }),

  // ── 8. Email / validation ─────────────────────────────────────────────────
  p({ providerName: 'disify', category: 'email_validation', baseUrl: 'https://www.disify.com/api', flagKey: 'API_DISIFY_ENABLED', status: 'active', recommended: 'active_now', privacyRisk: 'medium', freeTierNotes: 'Détection email jetable, sans clé.', fallbackProvider: 'eva' }),
  p({ providerName: 'eva', category: 'email_validation', baseUrl: 'https://api.eva.pingutil.com', flagKey: 'API_EVA_ENABLED', status: 'fallback', recommended: 'fallback', privacyRisk: 'medium', freeTierNotes: 'Validation email, sans clé. Repli Disify.' }),
  p({ providerName: 'kickbox', category: 'email_validation', baseUrl: 'https://api.kickbox.com/v2', flagKey: 'API_KICKBOX_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_KICKBOX_KEY'], commercialUseRisk: 'medium' }),
  p({ providerName: 'mailboxlayer', category: 'email_validation', baseUrl: 'https://apilayer.net/api', flagKey: 'API_MAILBOXLAYER_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_MAILBOXLAYER_KEY'] }),
  p({ providerName: 'cloudmersive-validate', category: 'email_validation', baseUrl: 'https://api.cloudmersive.com/validate', flagKey: 'API_CLOUDMERSIVE_VALIDATE_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_CLOUDMERSIVE_KEY'] }),
  p({ providerName: 'mailtrap', category: 'email_validation', baseUrl: 'https://send.api.mailtrap.io/api', flagKey: 'API_MAILTRAP_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_MAILTRAP_TOKEN'], productValueForEMOPET: 'low', freeTierNotes: 'Tests email en staging.' }),

  // ── 9. Modération / sécurité / anti-abus ──────────────────────────────────
  p({ providerName: 'purgomalum', category: 'moderation', baseUrl: 'https://www.purgomalum.com/service', flagKey: 'API_PURGOMALUM_ENABLED', status: 'active', recommended: 'active_now', privacyRisk: 'low', freeTierNotes: 'Filtre profanité (EN), sans clé. Modération texte.' }),
  p({ providerName: 'tisane', category: 'moderation', baseUrl: 'https://api.tisane.ai/parse', flagKey: 'API_TISANE_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_TISANE_KEY'], freeTierNotes: 'Modération multilingue (FR).' }),
  p({ providerName: 'emailrep', category: 'moderation', baseUrl: 'https://emailrep.io', flagKey: 'API_EMAILREP_ENABLED', status: 'scaffold', recommended: 'scaffold_now', privacyRisk: 'medium', envKeys: ['API_EMAILREP_KEY'] }),
  p({ providerName: 'botd', category: 'moderation', baseUrl: 'https://api.fpjs.io', flagKey: 'API_BOTD_ENABLED', status: 'scaffold', recommended: 'experimental', requiresAuth: true, envKeys: ['API_BOTD_KEY'], privacyRisk: 'medium' }),
  p({ providerName: 'haveibeenpwned', category: 'moderation', baseUrl: 'https://haveibeenpwned.com/api/v3', flagKey: 'API_HIBP_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_HIBP_KEY'], privacyRisk: 'high', freeTierNotes: 'Mots de passe compromis — k-anonymité OBLIGATOIRE, jamais de mot de passe brut.' }),
  p({ providerName: 'gitguardian', category: 'moderation', baseUrl: 'https://api.gitguardian.com/v1', flagKey: 'API_GITGUARDIAN_ENABLED', status: 'disabled', recommended: 'disabled_by_default', requiresAuth: true, envKeys: ['API_GITGUARDIAN_KEY'], productValueForEMOPET: 'low', freeTierNotes: 'Scan de secrets — outillage dev, hors runtime.' }),

  // ── 10. IA / embeddings / RAG ─────────────────────────────────────────────
  p({ providerName: 'local-mock-ai', category: 'ai', baseUrl: 'internal://mock', flagKey: 'API_LOCAL_MOCK_AI_ENABLED', status: 'active', recommended: 'active_now', privacyRisk: 'none', productValueForEMOPET: 'high', freeTierNotes: 'Provider AI mock local (RAG dev, tests). Aucune donnée sortante.' }),
  p({ providerName: 'huggingface', category: 'ai', baseUrl: 'https://api-inference.huggingface.co', flagKey: 'API_HUGGINGFACE_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_HUGGINGFACE_KEY'], privacyRisk: 'medium', freeTierNotes: 'Embeddings/classification — jamais d\'inférence clinique sur l’animal.' }),
  p({ providerName: 'jina-ai', category: 'ai', baseUrl: 'https://api.jina.ai/v1', flagKey: 'API_JINA_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_JINA_KEY'], freeTierNotes: 'Embeddings/reranking pour RAG support.' }),
  p({ providerName: 'groq', category: 'ai', baseUrl: 'https://api.groq.com/openai/v1', flagKey: 'API_GROQ_ENABLED', status: 'scaffold', recommended: 'premium_candidate', requiresAuth: true, envKeys: ['API_GROQ_KEY'], privacyRisk: 'medium' }),
  p({ providerName: 'deepai', category: 'ai', baseUrl: 'https://api.deepai.org/api', flagKey: 'API_DEEPAI_ENABLED', status: 'scaffold', recommended: 'experimental', requiresAuth: true, envKeys: ['API_DEEPAI_KEY'], productValueForEMOPET: 'low' }),
  p({ providerName: 'clarifai', category: 'ai', baseUrl: 'https://api.clarifai.com/v2', flagKey: 'API_CLARIFAI_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_CLARIFAI_KEY'], privacyRisk: 'medium', productValueForEMOPET: 'low' }),
  p({ providerName: 'imagga', category: 'ai', baseUrl: 'https://api.imagga.com/v2', flagKey: 'API_IMAGGA_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_IMAGGA_KEY', 'API_IMAGGA_SECRET'], productValueForEMOPET: 'low' }),

  // ── 11. Transport / itinéraires / lieux calmes ────────────────────────────
  p({ providerName: 'graphhopper', category: 'transport', baseUrl: 'https://graphhopper.com/api/1', flagKey: 'API_GRAPHHOPPER_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_GRAPHHOPPER_KEY'], freeTierNotes: 'Itinéraires marche (contexte balade).' }),
  p({ providerName: 'navitia', category: 'transport', baseUrl: 'https://api.navitia.io/v1', flagKey: 'API_NAVITIA_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_NAVITIA_KEY'], freeTierNotes: 'Transport public FR.' }),
  p({ providerName: 'osm-overpass', category: 'transport', baseUrl: 'https://overpass-api.de/api', flagKey: 'API_OSM_OVERPASS_ENABLED', status: 'scaffold', recommended: 'scaffold_now', rateLimitRisk: 'high', productValueForEMOPET: 'high', freeTierNotes: 'POI/lieux calmes (complète lib/osm-spots.ts).' }),
  p({ providerName: 'cts-strasbourg', category: 'transport', baseUrl: 'https://api.cts-strasbourg.eu/v1', flagKey: 'API_CTS_STRASBOURG_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_CTS_TOKEN'], productValueForEMOPET: 'low' }),

  // ── 12. Logistique / opérations matériel ──────────────────────────────────
  p({ providerName: 'aftership', category: 'logistics', baseUrl: 'https://api.aftership.com/v4', flagKey: 'API_AFTERSHIP_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_AFTERSHIP_KEY'], freeTierNotes: 'Suivi colis (envoi hardware/prototypes).' }),
  p({ providerName: 'whereparcel', category: 'logistics', baseUrl: 'https://api.whereparcel.com', flagKey: 'API_WHEREPARCEL_ENABLED', status: 'scaffold', recommended: 'scaffold_now', requiresAuth: true, envKeys: ['API_WHEREPARCEL_KEY'], productValueForEMOPET: 'low' }),
];

/** Index par nom (unicité garantie par le test de registre). */
const BY_NAME = new Map<string, ProviderDescriptor>(PROVIDERS.map((d) => [d.providerName, d]));

export function getProvider(providerName: string): ProviderDescriptor | undefined {
  return BY_NAME.get(providerName);
}

/** Comme `getProvider` mais lève si absent — pour les adaptateurs (erreur de config au boot). */
export function mustGetProvider(providerName: string): ProviderDescriptor {
  const d = BY_NAME.get(providerName);
  if (!d) throw new Error(`Provider non enregistré : ${providerName}`);
  return d;
}

export function providersByCategory(category: ProviderCategory): ProviderDescriptor[] {
  return PROVIDERS.filter((d) => d.category === category);
}

/** Tous les flags d'activation (pour générer .env.example / la doc). */
export function allFlagKeys(): string[] {
  return PROVIDERS.map((d) => d.flagKey);
}

/**
 * Providers réellement utilisables maintenant pour une catégorie :
 * status `active`, flag activé, et (si auth) variables d'env présentes.
 * L'arbitrage ajoutera les `fallback` à la demande.
 */
export function activeProviders(category: ProviderCategory): ProviderDescriptor[] {
  return providersByCategory(category).filter(
    (d) =>
      d.status === 'active' &&
      resolveActivation({ flagKey: d.flagKey, requiresAuth: d.requiresAuth, envKeys: d.envKeys }).activable,
  );
}

/**
 * Providers de repli activables pour une catégorie : status `fallback`, flag activé,
 * env présentes. Utilisés UNIQUEMENT si les providers actifs échouent (cf. orchestrateur).
 */
export function fallbackProviders(category: ProviderCategory): ProviderDescriptor[] {
  return providersByCategory(category).filter(
    (d) =>
      d.status === 'fallback' &&
      resolveActivation({ flagKey: d.flagKey, requiresAuth: d.requiresAuth, envKeys: d.envKeys }).activable,
  );
}
