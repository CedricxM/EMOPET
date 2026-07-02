/**
 * Fabrique d'adaptateur SCAFFOLD générique.
 *
 * Pour tout provider catalogué dans le registre mais non encore câblé : on dispose
 * immédiatement d'un adaptateur conforme (descriptor + healthCheck + mockResponse)
 * dont les appels réseau lèvent une erreur explicite. Cela permet d'enregistrer,
 * documenter et tester un provider AVANT son implémentation complète — sans écrire
 * un fichier stub par provider.
 */

import { ProviderUnavailableError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderAdapter, ProviderHealthResult } from '../types';
import { nowIso } from './_shared';

export interface ScaffoldAdapter extends ProviderAdapter {
  /** Marqueur explicite : appel non implémenté pour ce scaffold. */
  notImplemented(method?: string): never;
}

export function createScaffoldAdapter(providerName: string): ScaffoldAdapter {
  const descriptor = mustGetProvider(providerName);
  return {
    descriptor,
    async healthCheck(): Promise<ProviderHealthResult> {
      return { provider: providerName, ok: false, status: 'scaffold', checkedAt: nowIso(), error: 'scaffold: adaptateur non implémenté' };
    },
    mockResponse(): ContextSignal[] {
      return [];
    },
    notImplemented(method = 'fetch'): never {
      throw new ProviderUnavailableError(providerName, `scaffold: ${method} non implémenté pour ${providerName}.`);
    },
  };
}
