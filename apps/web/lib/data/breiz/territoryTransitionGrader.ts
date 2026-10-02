export type TerritoryTransition = 'TEMPORARY_TRAVEL' | 'PERMANENT_MOVE' | 'RETURN_HOME' | 'UNKNOWN';

export interface TerritoryContext {
  homeRegion: string;
  currentTerritory: string;
  transition: TerritoryTransition;
  regionalIdentity: 'AVAILABLE' | 'UNAVAILABLE';
  fallback: 'REGIONAL_PACK' | 'GLOBAL_CORE';
}

const REGION = {
  bretagne: 'Bretagne',
  lorient: 'Bretagne',
  lyon: 'Auvergne-Rhone-Alpes',
  marseille: "Provence-Alpes-Cote-dAzur",
  bordeaux: 'Nouvelle-Aquitaine',
  strasbourg: 'Grand-Est',
} as const;

function normalise(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function mentionedTerritory(text: string): string | null {
  const n = normalise(text);
  for (const [place, region] of Object.entries(REGION)) if (n.includes(place)) return region;
  return null;
}

export function resolveTerritoryTransition(
  turns: string[],
  initialHome = 'Bretagne',
  destinationPackAvailable = true,
): TerritoryContext {
  let homeRegion = initialHome;
  let currentTerritory = initialHome;
  let transition: TerritoryTransition = 'UNKNOWN';

  for (const raw of turns) {
    const n = normalise(raw);
    const territory = mentionedTerritory(raw);

    if (/rentr(e|er|ons)|retour/.test(n) && /lorient|bretagne/.test(n)) {
      currentTerritory = initialHome;
      transition = 'RETURN_HOME';
      continue;
    }

    if (territory && /demenag|installe|on y vit|habite maintenant|vit maintenant/.test(n)) {
      homeRegion = territory;
      currentTerritory = territory;
      transition = 'PERMANENT_MOVE';
      continue;
    }

    if (territory && /semaine|week-?end|quelques jours|vacances|visite|aujourd'hui|pars?/.test(n)) {
      currentTerritory = territory;
      transition = 'TEMPORARY_TRAVEL';
    }

    if (/juste en visite|habite toujours|vit toujours/.test(n)) {
      homeRegion = initialHome;
      transition = 'TEMPORARY_TRAVEL';
    }
  }

  return {
    homeRegion,
    currentTerritory,
    transition,
    regionalIdentity: destinationPackAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
    fallback: destinationPackAvailable ? 'REGIONAL_PACK' : 'GLOBAL_CORE',
  };
}

export function regionalizationMayRaiseSemanticAuthority(): false {
  return false;
}
