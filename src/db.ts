import * as SQLite from 'expo-sqlite';
import { FarmLocation } from './types';

const dbPromise = SQLite.openDatabaseAsync('agrocast.db');

export type FarmRecord = { id: number; date: string; crop: string; category: string; title: string; amount: string; notes: string; createdAt: string };

export async function initializeDatabase() {
  const db = await dbPromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS farm_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      crop TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      amount TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);
}

export async function addFarmRecord(record: Omit<FarmRecord, 'id' | 'createdAt'>) {
  const db = await dbPromise;
  const createdAt = new Date().toISOString();
  await db.runAsync('INSERT INTO farm_records (date, crop, category, title, amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', record.date, record.crop, record.category, record.title, record.amount, record.notes, createdAt);
}

export async function getFarmRecords(): Promise<FarmRecord[]> {
  const db = await dbPromise;
  return db.getAllAsync<FarmRecord>('SELECT id, date, crop, category, title, amount, notes, created_at as createdAt FROM farm_records ORDER BY date DESC, id DESC');
}

export async function deleteFarmRecord(id: number) {
  const db = await dbPromise;
  await db.runAsync('DELETE FROM farm_records WHERE id = ?', id);
}

export async function saveLocation(location: FarmLocation) {
  const db = await dbPromise;
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    'farm_location',
    JSON.stringify(location),
  );
}

export async function getLocation(): Promise<FarmLocation | null> {
  const db = await dbPromise;
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    'farm_location',
  );
  return row ? JSON.parse(row.value) : null;
}

export async function setSetting(key: string, value: string) {
  const db = await dbPromise;
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await dbPromise;
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setCache(key: string, payload: unknown) {
  const db = await dbPromise;
  const updatedAt = new Date().toISOString();
  await db.runAsync(
    'INSERT OR REPLACE INTO cache (key, payload, updated_at) VALUES (?, ?, ?)',
    key,
    JSON.stringify(payload),
    updatedAt,
  );
  return updatedAt;
}

export async function getCache<T>(key: string): Promise<{ data: T; updatedAt: string } | null> {
  const db = await dbPromise;
  const row = await db.getFirstAsync<{ payload: string; updated_at: string }>(
    'SELECT payload, updated_at FROM cache WHERE key = ?',
    key,
  );
  return row ? { data: JSON.parse(row.payload), updatedAt: row.updated_at } : null;
}

export function locationCacheKey(prefix: string, location: FarmLocation) {
  return `${prefix}:${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
}
