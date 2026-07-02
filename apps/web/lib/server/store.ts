/**
 * Store de persistance serveur — fichier JSON (R3, sans infra).
 *
 * Première vraie couche de persistance SERVEUR (≠ localStorage) : multi-session,
 * autoritaire côté serveur. Abstraction `collection<T>()` volontairement minimale
 * pour être remplaçable par Drizzle/Postgres plus tard sans changer les appelants.
 *
 * ⚠ Server-only (fs). Ne jamais importer côté client.
 * ⚠ En prod serverless, remplacer par Postgres (le fichier n'y persiste pas).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
      const p = filePath(name);
      if (!existsSync(p)) return [];
      return JSON.parse(readFileSync(p, 'utf8')) as T[];
    } catch {
      return [];
    }
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
