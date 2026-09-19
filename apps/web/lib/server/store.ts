/**
 * Store de persistance serveur — fichier JSON (R3, sans infra).
 *
 * Première vraie couche de persistance SERVEUR (≠ localStorage) : multi-session,
 * autoritaire côté serveur. Abstraction `collection<T>()` volontairement minimale
 * pour être remplaçable par Drizzle/Postgres plus tard sans changer les appelants.
 *
 * ⚠ Server-only (fs). Ne jamais importer côté client.
 * ⚠ En prod serverless, remplacer par Postgres (le fichier n'y persiste pas).
 *
 * RÈGLE DE VÉRITÉ : « illisible » n'est pas « vide ».
 * Un fichier absent est une collection légitimement vide. Un fichier présent mais
 * illisible ou corrompu est un état INCONNU : il lève. Renvoyer `[]` dans ce cas
 * ne se contentait pas de mentir en lecture — comme toute écriture repart de
 * `readAll()`, la ligne suivante réécrivait le fichier depuis cette base vide et
 * détruisait les données encore sur le disque.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * La collection existe mais son état n'a pas pu être établi.
 *
 * Distincte d'une collection vide : un appelant peut afficher « rien à montrer »
 * pour une collection vide, jamais pour celle-ci. Aucune écriture ne doit partir
 * d'un état inconnu.
 */
export class StoreUnreadableError extends Error {
  readonly collectionName: string;

  constructor(collectionName: string, reason: string, options?: { cause?: unknown }) {
    super(`Collection « ${collectionName} » illisible : ${reason}. État inconnu, pas vide.`, options);
    this.name = 'StoreUnreadableError';
    this.collectionName = collectionName;
  }
}

const DATA_DIR = join(process.cwd(), '.data');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string): string {
  return join(DATA_DIR, `${name}.json`);
}

/** Accès typé à une collection persistée (un fichier JSON par collection). */
export function collection<T extends { id: string }>(name: string) {
  function readAll(): T[] {
    try {
      ensureDir();
    } catch (cause) {
      throw new StoreUnreadableError(name, 'répertoire de données inaccessible', { cause });
    }

    const p = filePath(name);
    // Fichier absent = collection légitimement vide. C'est le SEUL cas de vide.
    if (!existsSync(p)) return [];

    let raw: string;
    try {
      raw = readFileSync(p, 'utf8');
    } catch (cause) {
      throw new StoreUnreadableError(name, 'lecture du fichier impossible', { cause });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw new StoreUnreadableError(name, 'contenu JSON invalide', { cause });
    }

    if (!Array.isArray(parsed)) {
      throw new StoreUnreadableError(name, 'le contenu n’est pas un tableau');
    }

    return parsed as T[];
  }
  function writeAll(items: T[]): void {
    ensureDir();
    writeFileSync(filePath(name), JSON.stringify(items, null, 2), 'utf8');
  }
  return {
    list(): T[] {
      return readAll();
    },
    insert(item: T): T {
      const all = readAll();
      all.unshift(item);
      writeAll(all);
      return item;
    },
    remove(id: string): T[] {
      const next = readAll().filter((x) => x.id !== id);
      writeAll(next);
      return next;
    },
    removeWhere(predicate: (item: T) => boolean): T[] {
      const next = readAll().filter((x) => !predicate(x));
      writeAll(next);
      return next;
    },
    update(id: string, patch: Partial<T>): T | null {
      const all = readAll();
      const idx = all.findIndex((x) => x.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx]!, ...patch };
      writeAll(all);
      return all[idx]!;
    },
  };
}
