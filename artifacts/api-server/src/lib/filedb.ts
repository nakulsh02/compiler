import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = process.env["DATA_DIR"] || join(process.cwd(), "data");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readCollection<T>(collection: string): T[] {
  ensureDir();
  const file = join(DATA_DIR, `${collection}.json`);
  if (!existsSync(file)) return [];
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T[];
  } catch {
    return [];
  }
}

function writeCollection<T>(collection: string, data: T[]): void {
  ensureDir();
  const file = join(DATA_DIR, `${collection}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

export function generateId(): string {
  return randomUUID();
}

export function findAll<T extends Record<string, unknown>>(
  collection: string,
  filter?: Partial<T>
): T[] {
  const data = readCollection<T>(collection);
  if (!filter) return data;
  return data.filter((item) =>
    Object.entries(filter).every(([k, v]) => item[k] === v)
  );
}

export function findOne<T extends Record<string, unknown>>(
  collection: string,
  filter: Partial<T>
): T | null {
  return findAll<T>(collection, filter)[0] ?? null;
}

export function findById<T extends Record<string, unknown>>(
  collection: string,
  id: string
): T | null {
  return findOne<T>(collection, { id } as Partial<T>);
}

export function insertOne<T extends Record<string, unknown>>(
  collection: string,
  doc: Omit<T, "id" | "createdAt" | "updatedAt">
): T {
  const data = readCollection<T>(collection);
  const now = new Date().toISOString();
  const record = { ...doc, id: generateId(), createdAt: now, updatedAt: now } as T;
  data.push(record);
  writeCollection(collection, data);
  return record;
}

export function updateById<T extends Record<string, unknown>>(
  collection: string,
  id: string,
  update: Partial<T>
): T | null {
  const data = readCollection<T>(collection);
  const idx = data.findIndex((item) => item["id"] === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  data[idx] = { ...data[idx], ...update, updatedAt: now };
  writeCollection(collection, data);
  return data[idx];
}

export function deleteById<T extends Record<string, unknown>>(
  collection: string,
  id: string
): boolean {
  const data = readCollection<T>(collection);
  const idx = data.findIndex((item) => item["id"] === id);
  if (idx === -1) return false;
  data.splice(idx, 1);
  writeCollection(collection, data);
  return true;
}

export function deleteManyWhere<T extends Record<string, unknown>>(
  collection: string,
  filter: Partial<T>
): number {
  const data = readCollection<T>(collection);
  const before = data.length;
  const filtered = data.filter(
    (item) => !Object.entries(filter).every(([k, v]) => item[k] === v)
  );
  writeCollection(collection, filtered);
  return before - filtered.length;
}
