/**
 * Barrel des adaptateurs — namespacé (chaque adaptateur expose `descriptor`,
 * `healthCheck`, `mockResponse`, etc. : on évite les collisions de noms).
 */
export * as openMeteo from './openMeteo';
export * as metNo from './metNo';
export * as openAQ from './openAQ';
export * as adresseDataGouv from './adresseDataGouv';
export * as geoApiGouv from './geoApiGouv';
export * as nagerDate from './nagerDate';
export * as dogCeo from './dogCeo';
export * as libreTranslate from './libreTranslate';
export * as disify from './disify';
export * as purgoMalum from './purgoMalum';
export { createScaffoldAdapter, type ScaffoldAdapter } from './scaffold';
