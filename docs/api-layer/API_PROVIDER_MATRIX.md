# API Provider Matrix — EMOPET

> **Généré** depuis `apps/web/lib/api/providerRegistry.ts` via `scripts/gen-provider-matrix.ts`.
> Ne pas éditer à la main : modifier le registre puis régénérer. Toutes les URL sont en HTTPS.
> `status` = état runtime ; `recommandé` = stratégie d'intégration ; `flag` = variable d'env d'activation.

Total : **79 providers** sur 12 catégories.

| Provider | Catégorie | URL | Auth | Free tier | Commercial | Privacy | RateLimit | Complexité | Valeur | Statut | Recommandé | Flag | Env | Adapter | Fallback |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| open-meteo | weather | https://api.open-meteo.com/v1 | non | Open data, sans clé (CC-BY 4.0). Déjà intégré (lib/weather.ts). | low | low | low | low | high | active | active_now | `API_OPEN_METEO_ENABLED` | — | adapters/openMeteo.ts | met-no |
| met-no | weather | https://api.met.no/weatherapi | non | Gratuit, User-Agent obligatoire. Repli de open-meteo. | low | low | medium | medium | high | fallback | fallback | `API_MET_NO_ENABLED` | — | — | — |
| weatherapi | weather | https://api.weatherapi.com/v1 | oui | Free tier généreux, clé requise. | medium | low | medium | medium | medium | scaffold | scaffold_now | `API_WEATHERAPI_ENABLED` | `API_WEATHERAPI_KEY` | — | — |
| openweathermap | weather | https://api.openweathermap.org/data/2.5 | oui | Free tier, clé requise. | medium | low | medium | medium | medium | scaffold | scaffold_now | `API_OPENWEATHERMAP_ENABLED` | `API_OPENWEATHERMAP_KEY` | — | — |
| pirate-weather | weather | https://api.pirateweather.net | oui | Compatible schéma Dark Sky. | low | low | medium | medium | medium | scaffold | scaffold_now | `API_PIRATE_WEATHER_ENABLED` | `API_PIRATE_WEATHER_KEY` | — | — |
| wttr-in | weather | https://wttr.in | non | Utile en dev/test, pas pour la production. | medium | low | high | medium | low | experimental | experimental | `API_WTTR_IN_ENABLED` | — | — | — |
| visual-crossing | weather | https://weather.visualcrossing.com | oui | Historique riche, quota gratuit limité. | medium | low | medium | medium | medium | scaffold | premium_candidate | `API_VISUAL_CROSSING_ENABLED` | `API_VISUAL_CROSSING_KEY` | — | — |
| oikolab | weather | https://api.oikolab.com | oui | Données historiques/réanalyse. | low | low | medium | high | medium | scaffold | premium_candidate | `API_OIKOLAB_ENABLED` | `API_OIKOLAB_KEY` | — | — |
| openuv | weather | https://api.openuv.io/api/v1 | oui | Index UV (contexte chaleur/ensoleillement). | low | low | medium | medium | medium | scaffold | scaffold_now | `API_OPENUV_ENABLED` | `API_OPENUV_KEY` | — | — |
| rainviewer | weather | https://api.rainviewer.com/public | non | Radar pluie, sans clé. | low | low | medium | medium | medium | scaffold | scaffold_now | `API_RAINVIEWER_ENABLED` | — | — | — |
| weatherbit | weather | https://api.weatherbit.io/v2.0 | oui | — | medium | low | medium | medium | medium | scaffold | premium_candidate | `API_WEATHERBIT_ENABLED` | `API_WEATHERBIT_KEY` | — | — |
| openaq | air_quality | https://api.openaq.org/v3 | non | Open data mesures qualité air. Clé recommandée v3. | low | low | medium | medium | high | active | active_now | `API_OPENAQ_ENABLED` | `API_OPENAQ_KEY` | adapters/openAQ.ts | aqicn |
| aqicn | air_quality | https://api.waqi.info | oui | Token gratuit, large couverture. Repli OpenAQ. | low | low | medium | medium | high | fallback | fallback | `API_AQICN_ENABLED` | `API_AQICN_TOKEN` | — | — |
| iqair | air_quality | https://api.airvisual.com/v2 | oui | Quota dépend de la clé. | medium | low | medium | medium | medium | scaffold | premium_candidate | `API_IQAIR_ENABLED` | `API_IQAIR_KEY` | — | — |
| purpleair | air_quality | https://api.purpleair.com/v1 | oui | Réseau de capteurs communautaires. | low | low | medium | medium | medium | scaffold | scaffold_now | `API_PURPLEAIR_ENABLED` | `API_PURPLEAIR_KEY` | — | — |
| pm25-open-data | air_quality | https://pm25.lass-net.org | non | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_PM25_OPEN_DATA_ENABLED` | — | — | — |
| breezometer-pollen | air_quality | https://api.breezometer.com | oui | Pollen — quota/clé, usage commercial à valider. | high | low | medium | medium | medium | scaffold | premium_candidate | `API_BREEZOMETER_ENABLED` | `API_BREEZOMETER_KEY` | — | — |
| carbon-interface | air_quality | https://www.carboninterface.com/api/v1 | oui | Estimations carbone — hors cœur EMOPET. | low | low | medium | medium | low | disabled | disabled_by_default | `API_CARBON_INTERFACE_ENABLED` | `API_CARBON_INTERFACE_KEY` | — | — |
| climatiq | air_quality | https://api.climatiq.io | oui | — | low | low | medium | medium | low | disabled | disabled_by_default | `API_CLIMATIQ_ENABLED` | `API_CLIMATIQ_KEY` | — | — |
| adresse-data-gouv | geocoding | https://api-adresse.data.gouv.fr | non | BAN — géocodage FR open data, sans clé. | low | low | low | low | high | active | active_now | `API_ADRESSE_DATA_GOUV_ENABLED` | — | adapters/adresseDataGouv.ts | geoapify |
| geoapi-gouv | geocoding | https://geo.api.gouv.fr | non | Communes/départements/régions FR, sans clé. | low | low | low | low | high | active | active_now | `API_GEOAPI_GOUV_ENABLED` | — | adapters/geoApiGouv.ts | — |
| geoapify | geocoding | https://api.geoapify.com/v1 | oui | Repli international hors FR. | low | low | medium | medium | medium | scaffold | fallback | `API_GEOAPIFY_ENABLED` | `API_GEOAPIFY_KEY` | — | — |
| geocode-xyz | geocoding | https://geocode.xyz | non | — | low | low | high | medium | low | experimental | experimental | `API_GEOCODE_XYZ_ENABLED` | — | — | — |
| geodb-cities | geocoding | https://wft-geo-db.p.rapidapi.com | oui | — | low | low | medium | medium | medium | scaffold | scaffold_now | `API_GEODB_CITIES_ENABLED` | `API_GEODB_KEY` | — | — |
| bigdatacloud | geocoding | https://api.bigdatacloud.net | oui | — | low | low | medium | medium | medium | scaffold | scaffold_now | `API_BIGDATACLOUD_ENABLED` | `API_BIGDATACLOUD_KEY` | — | — |
| ipstack | geocoding | https://api.ipstack.com | oui | Géoloc IP — OFF par défaut (confidentialité). | low | high | medium | medium | low | disabled | disabled_by_default | `API_IPSTACK_ENABLED` | `API_IPSTACK_KEY` | — | — |
| ipapi | geocoding | https://ipapi.com/api | non | Géoloc IP — OFF par défaut (confidentialité). | low | high | medium | medium | low | disabled | disabled_by_default | `API_IPAPI_ENABLED` | — | — | — |
| countrystatecity | geocoding | https://api.countrystatecity.in/v1 | oui | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_COUNTRYSTATECITY_ENABLED` | `API_COUNTRYSTATECITY_KEY` | — | — |
| data-gouv-fr | open_data | https://www.data.gouv.fr/api/1 | non | Catalogue open data FR. Complète lib/data/territory. | low | low | medium | medium | high | scaffold | scaffold_now | `API_DATA_GOUV_ENABLED` | — | — | — |
| nantes-open-data | open_data | https://data.nantesmetropole.fr/api | non | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_NANTES_OPEN_DATA_ENABLED` | — | — | — |
| socrata | open_data | https://api.us.socrata.com | oui | — | low | low | medium | medium | medium | scaffold | scaffold_now | `API_SOCRATA_ENABLED` | `API_SOCRATA_APP_TOKEN` | — | — |
| teleport | open_data | https://api.teleport.org/api | non | Qualité de vie urbaine — vérifier disponibilité. | low | low | medium | medium | medium | experimental | experimental | `API_TELEPORT_ENABLED` | — | — | — |
| world-bank | open_data | https://api.worldbank.org/v2 | non | Macro-contexte pays. | low | low | medium | medium | low | scaffold | scaffold_now | `API_WORLD_BANK_ENABLED` | — | — | — |
| epa | open_data | https://www.epa.gov/enviro | non | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_EPA_ENABLED` | — | — | — |
| openafrica | open_data | https://africaopendata.org/api/3 | non | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_OPENAFRICA_ENABLED` | — | — | — |
| dog-ceo | dog_knowledge | https://dog.ceo/api | non | Images de races, sans clé. Onboarding/UI. | low | low | low | low | medium | active | active_now | `API_DOG_CEO_ENABLED` | — | adapters/dogCeo.ts | the-dog-api |
| the-dog-api | dog_knowledge | https://api.thedogapi.com/v1 | oui | Métadonnées races. Complète le référentiel FCI maison. | low | low | medium | medium | medium | fallback | fallback | `API_THE_DOG_API_ENABLED` | `API_THE_DOG_API_KEY` | — | — |
| dog-facts | dog_knowledge | https://dogapi.dog/api/v2 | non | Contenu ludique uniquement. | low | low | medium | medium | low | experimental | experimental | `API_DOG_FACTS_ENABLED` | — | — | — |
| randomdog | dog_knowledge | https://random.dog | non | — | low | low | medium | medium | low | disabled | disabled_by_default | `API_RANDOMDOG_ENABLED` | — | — | — |
| petfinder | dog_knowledge | https://api.petfinder.com/v2 | oui | Écosystème adoption (futur). | low | low | medium | medium | medium | scaffold | premium_candidate | `API_PETFINDER_ENABLED` | `API_PETFINDER_KEY` `API_PETFINDER_SECRET` | — | — |
| adoptapet | dog_knowledge | https://api.adoptapet.com | oui | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_ADOPTAPET_ENABLED` | `API_ADOPTAPET_KEY` | — | — |
| movebank | dog_knowledge | https://www.movebank.org/movebank/service | oui | Recherche comportement animal — inspiration R&D, pas d'inférence clinique. | low | low | medium | high | low | scaffold | experimental | `API_MOVEBANK_ENABLED` | `API_MOVEBANK_USER` `API_MOVEBANK_PASSWORD` | — | — |
| ebird | dog_knowledge | https://api.ebird.org/v2 | oui | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_EBIRD_ENABLED` | `API_EBIRD_KEY` | — | — |
| xeno-canto | dog_knowledge | https://xeno-canto.org/api/2 | non | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_XENO_CANTO_ENABLED` | — | — | — |
| nager-date | calendar | https://date.nager.at/api/v3 | non | Jours fériés par pays, sans clé. | low | low | low | low | high | active | active_now | `API_NAGER_DATE_ENABLED` | — | adapters/nagerDate.ts | — |
| calendarific | calendar | https://calendarific.com/api/v2 | oui | — | low | low | medium | medium | medium | scaffold | fallback | `API_CALENDARIFIC_ENABLED` | `API_CALENDARIFIC_KEY` | — | — |
| non-working-days | calendar | https://api.api-ninjas.com/v1 | oui | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_NON_WORKING_DAYS_ENABLED` | `API_API_NINJAS_KEY` | — | — |
| google-calendar | calendar | https://www.googleapis.com/calendar/v3 | oui | OAuth utilisateur — futur, consentement explicite. | low | high | medium | high | medium | scaffold | premium_candidate | `API_GOOGLE_CALENDAR_ENABLED` | `API_GOOGLE_CALENDAR_CLIENT_ID` `API_GOOGLE_CALENDAR_CLIENT_SECRET` | — | — |
| libretranslate | translation | https://libretranslate.com | oui | Auto-hébergeable. Onboarding multilingue. | low | low | medium | medium | medium | active | active_now | `API_LIBRETRANSLATE_ENABLED` | `API_LIBRETRANSLATE_URL` `API_LIBRETRANSLATE_KEY` | adapters/libreTranslate.ts | detectlanguage |
| detectlanguage | translation | https://ws.detectlanguage.com/0.2 | oui | — | low | low | medium | medium | medium | fallback | fallback | `API_DETECTLANGUAGE_ENABLED` | `API_DETECTLANGUAGE_KEY` | — | — |
| languagelayer | translation | https://api.languagelayer.com | oui | — | low | low | medium | medium | medium | scaffold | scaffold_now | `API_LANGUAGELAYER_ENABLED` | `API_LANGUAGELAYER_KEY` | — | — |
| lecto-translation | translation | https://api.lecto.ai/v1 | oui | — | low | low | medium | medium | medium | scaffold | scaffold_now | `API_LECTO_ENABLED` | `API_LECTO_KEY` | — | — |
| meaningcloud-sentiment | translation | https://api.meaningcloud.com | oui | Sentiment des RETOURS UTILISATEUR uniquement — jamais l'état du chien. | low | low | medium | medium | medium | scaffold | experimental | `API_MEANINGCLOUD_ENABLED` | `API_MEANINGCLOUD_KEY` | — | — |
| watson-nlu | translation | https://api.eu-gb.natural-language-understanding.watson.cloud.ibm.com | oui | — | medium | low | medium | high | medium | scaffold | premium_candidate | `API_WATSON_NLU_ENABLED` | `API_WATSON_NLU_KEY` `API_WATSON_NLU_URL` | — | — |
| disify | email_validation | https://www.disify.com/api | non | Détection email jetable, sans clé. | low | medium | medium | medium | medium | active | active_now | `API_DISIFY_ENABLED` | — | adapters/disify.ts | eva |
| eva | email_validation | https://api.eva.pingutil.com | non | Validation email, sans clé. Repli Disify. | low | medium | medium | medium | medium | fallback | fallback | `API_EVA_ENABLED` | — | adapters/disify.ts (repli) | — |
| kickbox | email_validation | https://api.kickbox.com/v2 | oui | — | medium | low | medium | medium | medium | scaffold | premium_candidate | `API_KICKBOX_ENABLED` | `API_KICKBOX_KEY` | — | — |
| mailboxlayer | email_validation | https://apilayer.net/api | oui | — | low | low | medium | medium | medium | scaffold | scaffold_now | `API_MAILBOXLAYER_ENABLED` | `API_MAILBOXLAYER_KEY` | — | — |
| cloudmersive-validate | email_validation | https://api.cloudmersive.com/validate | oui | — | low | low | medium | medium | medium | scaffold | scaffold_now | `API_CLOUDMERSIVE_VALIDATE_ENABLED` | `API_CLOUDMERSIVE_KEY` | — | — |
| mailtrap | email_validation | https://send.api.mailtrap.io/api | oui | Tests email en staging. | low | low | medium | medium | low | scaffold | scaffold_now | `API_MAILTRAP_ENABLED` | `API_MAILTRAP_TOKEN` | — | — |
| purgomalum | moderation | https://www.purgomalum.com/service | non | Filtre profanité (EN), sans clé. Modération texte. | low | low | medium | medium | medium | active | active_now | `API_PURGOMALUM_ENABLED` | — | adapters/purgoMalum.ts | — |
| tisane | moderation | https://api.tisane.ai/parse | oui | Modération multilingue (FR). | low | low | medium | medium | medium | scaffold | premium_candidate | `API_TISANE_ENABLED` | `API_TISANE_KEY` | — | — |
| emailrep | moderation | https://emailrep.io | non | — | low | medium | medium | medium | medium | scaffold | scaffold_now | `API_EMAILREP_ENABLED` | `API_EMAILREP_KEY` | — | — |
| botd | moderation | https://api.fpjs.io | oui | — | low | medium | medium | medium | medium | scaffold | experimental | `API_BOTD_ENABLED` | `API_BOTD_KEY` | — | — |
| haveibeenpwned | moderation | https://haveibeenpwned.com/api/v3 | oui | Mots de passe compromis — k-anonymité OBLIGATOIRE, jamais de mot de passe brut. | low | high | medium | medium | medium | scaffold | premium_candidate | `API_HIBP_ENABLED` | `API_HIBP_KEY` | — | — |
| gitguardian | moderation | https://api.gitguardian.com/v1 | oui | Scan de secrets — outillage dev, hors runtime. | low | low | medium | medium | low | disabled | disabled_by_default | `API_GITGUARDIAN_ENABLED` | `API_GITGUARDIAN_KEY` | — | — |
| local-mock-ai | ai | internal://mock | non | Provider AI mock local (RAG dev, tests). Aucune donnée sortante. | low | none | medium | medium | high | active | active_now | `API_LOCAL_MOCK_AI_ENABLED` | — | — | — |
| huggingface | ai | https://api-inference.huggingface.co | oui | Embeddings/classification — jamais d'inférence clinique sur l’animal. | low | medium | medium | medium | medium | scaffold | premium_candidate | `API_HUGGINGFACE_ENABLED` | `API_HUGGINGFACE_KEY` | — | — |
| jina-ai | ai | https://api.jina.ai/v1 | oui | Embeddings/reranking pour RAG support. | low | low | medium | medium | medium | scaffold | scaffold_now | `API_JINA_ENABLED` | `API_JINA_KEY` | — | — |
| groq | ai | https://api.groq.com/openai/v1 | oui | — | low | medium | medium | medium | medium | scaffold | premium_candidate | `API_GROQ_ENABLED` | `API_GROQ_KEY` | — | — |
| deepai | ai | https://api.deepai.org/api | oui | — | low | low | medium | medium | low | scaffold | experimental | `API_DEEPAI_ENABLED` | `API_DEEPAI_KEY` | — | — |
| clarifai | ai | https://api.clarifai.com/v2 | oui | — | low | medium | medium | medium | low | scaffold | scaffold_now | `API_CLARIFAI_ENABLED` | `API_CLARIFAI_KEY` | — | — |
| imagga | ai | https://api.imagga.com/v2 | oui | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_IMAGGA_ENABLED` | `API_IMAGGA_KEY` `API_IMAGGA_SECRET` | — | — |
| graphhopper | transport | https://graphhopper.com/api/1 | oui | Itinéraires marche (contexte balade). | low | low | medium | medium | medium | scaffold | scaffold_now | `API_GRAPHHOPPER_ENABLED` | `API_GRAPHHOPPER_KEY` | — | — |
| navitia | transport | https://api.navitia.io/v1 | oui | Transport public FR. | low | low | medium | medium | medium | scaffold | scaffold_now | `API_NAVITIA_ENABLED` | `API_NAVITIA_KEY` | — | — |
| osm-overpass | transport | https://overpass-api.de/api | non | POI/lieux calmes (complète lib/osm-spots.ts). | low | low | high | medium | high | scaffold | scaffold_now | `API_OSM_OVERPASS_ENABLED` | — | — | — |
| cts-strasbourg | transport | https://api.cts-strasbourg.eu/v1 | oui | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_CTS_STRASBOURG_ENABLED` | `API_CTS_TOKEN` | — | — |
| aftership | logistics | https://api.aftership.com/v4 | oui | Suivi colis (envoi hardware/prototypes). | low | low | medium | medium | medium | scaffold | scaffold_now | `API_AFTERSHIP_ENABLED` | `API_AFTERSHIP_KEY` | — | — |
| whereparcel | logistics | https://api.whereparcel.com | oui | — | low | low | medium | medium | low | scaffold | scaffold_now | `API_WHEREPARCEL_ENABLED` | `API_WHEREPARCEL_KEY` | — | — |
