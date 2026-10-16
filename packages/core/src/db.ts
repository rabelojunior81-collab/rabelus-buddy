// Adaptador do node:sqlite (SPEC 0001, decisão 1; ficha banco-e-ipc).
// No Node 24 a classe é DatabaseSync; no 26.12+ é Database, e DatabaseSync vira
// alias obsoleto (DEP0210). Usa-se a que existir, preferindo a nova.

import * as sqlite from 'node:sqlite';
import type { DatabaseSync } from 'node:sqlite';

export type Database = DatabaseSync;

type Ctor = new (path: string, options?: { timeout?: number }) => Database;
const DatabaseCtor: Ctor = ((sqlite as unknown as { Database?: Ctor }).Database ?? sqlite.DatabaseSync) as Ctor;

export function openDatabase(path: string): Database {
  const db = new DatabaseCtor(path, { timeout: 5000 });
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;');
  return db;
}

// Transação curta e síncrona: o dono é o único escritor, e o laço de eventos serializa.
export function transaction<T>(db: Database, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
