// Market-price forecasting for the Tools → "Market prices" tool.
//
// Port of agro-price's price-prediction screen (app/predict + lib/predict.ts +
// lib/macro.ts). The price *history* is bundled in src/marketSnapshot.ts
// (generated from the WFP / HDX CSV via scripts/build_market_snapshot.js) so the
// model runs fully offline; the macro indicators (inflation, FX, lending rate,
// current FX) are fetched live from the World Bank API and open.er-api.com and
// cached in expo-sqlite. A phone cannot reach agro-price's local dev server,
// so nothing depends on it.
//
// Prediction model (unchanged from agro-price lib/predict.ts):
//   P_k = P_0 × (1 + r)^k
//   r = min(6%, 0.5·historical_trend + 0.5·(inflation + 0.5·FX + 0.3·carry))
// where P_0 is the mean of the last three observed monthly prices and the
// historical trend is the geometric month-over-month growth of the last twelve.

import { getCache, setCache } from './db';
import { marketSnapshot, marketSnapshotDate, type MarketCommodity } from './marketSnapshot';

// ---- Bundled vs live price history ------------------------------------------
//
// The bundled snapshot above is the offline fallback. When the phone is online
// the app also pulls the weekly snapshot the agropredict GitHub Action publishes
// next to its refreshed CSV (a public raw URL — small JSON, not the 4.7 MB CSV)
// and caches it in sqlite, mirroring how the web reads the latest CSV.

export type SnapshotBundle = { date: string; commodities: Record<string, MarketCommodity> };
export type SnapshotSource = 'bundled' | 'saved' | 'live';

export const MARKET_SNAPSHOT_URL =
  'https://raw.githubusercontent.com/Farmerintech/agropredict/main/data/agrocast-market.json';
const SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000; // the Action runs weekly; daily refresh is plenty

export const bundledSnapshot: SnapshotBundle = { date: marketSnapshotDate, commodities: marketSnapshot };

export function listOptions(bundle: SnapshotBundle): { name: string; unit: string }[] {
  return Object.keys(bundle.commodities)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, unit: bundle.commodities[name]!.unit }));
}


// ---- Prediction model -------------------------------------------------------

export type Point = { date: string; price: number };
export type MacroSeriesPoint = { year: string; value: number | null };
export type MarketMacro = {
  inflation: MacroSeriesPoint[];
  exchangeRate: MacroSeriesPoint[];
  lendingRate: MacroSeriesPoint[];
  currentFx: number | null;
  /** ISO timestamp of the newest successful fetch (or cached-at time). */
  fetchedAt: string | null;
  errors: string[];
  isCached: boolean;
};

export type ForecastInputs = {
  basePrice: number;
  historicalMonthlyTrend: number;
  inflationAnnual: number | null;
  fxChangeAnnual: number | null;
  costOfCapitalAnnual: number | null;
  blendedMonthlyRate: number;
  lastObserved: string;
};
export type ForecastResult = {
  history: Point[];
  forecast: Point[];
  inputs: ForecastInputs;
  warnings: string[];
};

const FX_PASSTHROUGH = 0.5;
const CARRY_WEIGHT = 0.3;
const TREND_WEIGHT = 0.5;
const MAX_MONTHLY = 0.06;

const EMPTY_INPUTS: ForecastInputs = {
  basePrice: 0,
  historicalMonthlyTrend: 0,
  inflationAnnual: null,
  fxChangeAnnual: null,
  costOfCapitalAnnual: null,
  blendedMonthlyRate: 0,
  lastObserved: '',
};

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

function monthSpan(fromYm: string, toYm: string): number {
  const [fy, fm] = fromYm.split('-').map(Number);
  const [ty, tm] = toYm.split('-').map(Number);
  return ty * 12 + tm - (fy * 12 + fm);
}

function latestValue(series: { value: number | null }[]): number | null {
  return series.find((p) => p.value != null)?.value ?? null;
}

function fxYearOverYear(series: { value: number | null }[]): number | null {
  const values = series.filter((p) => p.value != null).map((p) => p.value as number);
  if (values.length < 2) return null;
  return values[0] / values[1] - 1;
}

export function predictCommodity(
  commodity: MarketCommodity,
  macro: MarketMacro | null,
  horizon: number,
  costOfCapitalOverride?: number
): ForecastResult {
  const warnings: string[] = [];
  const monthly = commodity.months;
  if (monthly.length === 0) {
    return { history: [], forecast: [], inputs: EMPTY_INPUTS, warnings: ['No historical data for this commodity.'] };
  }

  const history = monthly.slice(-24);
  const baseWindow = monthly.slice(-3);
  const basePrice = baseWindow.reduce((a, p) => a + p.price, 0) / baseWindow.length;

  // Historical month-over-month growth over the last 12 points.
  const trendWindow = monthly.slice(-12);
  let gHist = 0;
  if (trendWindow.length >= 2) {
    const first = trendWindow[0].price;
    const last = trendWindow[trendWindow.length - 1].price;
    if (first > 0 && last > 0) gHist = Math.pow(last / first, 1 / (trendWindow.length - 1)) - 1;
  }

  const inflationAnnual = latestValue(macro?.inflation ?? []);
  const fxChangeAnnual = fxYearOverYear(macro?.exchangeRate ?? []);
  const costOfCapitalAnnual = costOfCapitalOverride ?? latestValue(macro?.lendingRate ?? []);

  const inflM = inflationAnnual != null ? Math.pow(1 + inflationAnnual / 100, 1 / 12) - 1 : 0;
  const fxM = fxChangeAnnual != null ? Math.pow(1 + fxChangeAnnual / 100, 1 / 12) - 1 : 0;
  const carryM = costOfCapitalAnnual != null ? Math.pow(1 + costOfCapitalAnnual / 100, 1 / 12) - 1 : 0;
  const macroM = inflM + FX_PASSTHROUGH * fxM + CARRY_WEIGHT * carryM;
  const blended = Math.min(MAX_MONTHLY, TREND_WEIGHT * gHist + (1 - TREND_WEIGHT) * macroM);

  const lastMonth = monthly[monthly.length - 1].date;
  const currentMonth = currentMonthKey();
  const endMonth = addMonths(currentMonth, horizon);
  const monthsAhead = Math.max(horizon, monthSpan(lastMonth, endMonth));
  const bridgeMonths = monthSpan(lastMonth, currentMonth);

  const forecast: Point[] = [];
  for (let k = 1; k <= monthsAhead; k += 1) {
    forecast.push({ date: addMonths(lastMonth, k), price: Math.round(basePrice * Math.pow(1 + blended, k)) });
  }

  if (bridgeMonths > 3) {
    warnings.push(
      `Last observation ${lastMonth} — forecast bridges ${bridgeMonths} months to ${currentMonth} using this commodity's own history.`
    );
  }

  return {
    history,
    forecast,
    inputs: {
      basePrice,
      historicalMonthlyTrend: gHist,
      inflationAnnual,
      fxChangeAnnual,
      costOfCapitalAnnual,
      blendedMonthlyRate: blended,
      lastObserved: lastMonth,
    },
    warnings,
  };
}

/** Forecast points for months strictly ahead of today, up to the horizon. */
export function futureForecast(forecast: Point[], horizon: number): Point[] {
  const currentMonth = currentMonthKey();
  return forecast.filter((p) => p.date > currentMonth).slice(0, horizon);
}

// ---- Macro indicators (World Bank + open.er-api, cached in sqlite) ----------

const WORLD_BANK_BASE = 'https://api.worldbank.org/v2/country/NGA/indicator';
const INDICATORS: Record<'inflation' | 'exchangeRate' | 'lendingRate', string> = {
  inflation: 'FP.CPI.TOTL.ZG',
  exchangeRate: 'PA.NUS.FCRF',
  lendingRate: 'FR.INR.LEND',
};

// World Bank annual series barely moves; FX is refreshed more often. A single
// 6-hour cache keeps this simple while staying fresh enough for a forecast.
const MACRO_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetchWithTimeout(url);
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

async function fetchWorldBankSeries(indicator: string): Promise<MacroSeriesPoint[]> {
  const res = await fetchWithRetry(`${WORLD_BANK_BASE}/${indicator}?format=json&per_page=12`);
  if (!res.ok) throw new Error(`World Bank ${indicator}: HTTP ${res.status}`);
  const json = (await res.json()) as unknown[];
  const rows = Array.isArray(json[1]) ? (json[1] as Array<{ date: string; value: number | null }>) : [];
  // World Bank returns newest-first; keep that order.
  return rows.map((r) => ({ year: String(r.date), value: r.value ?? null }));
}

async function fetchCurrentFx(): Promise<number | null> {
  const res = await fetchWithRetry('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) throw new Error(`open.er-api: HTTP ${res.status}`);
  const json = (await res.json()) as { rates?: { NGN?: unknown } };
  const ngn = json?.rates?.NGN;
  if (typeof ngn !== 'number') throw new Error('open.er-api: NGN rate missing');
  return ngn;
}

const EMPTY_MACRO: MarketMacro = {
  inflation: [],
  exchangeRate: [],
  lendingRate: [],
  currentFx: null,
  fetchedAt: null,
  errors: [],
  isCached: false,
};

/** True if today is a valid (non-null) ISO date in the past. */
function ageMs(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Date.now() - t;
}

/**
 * Returns Nigeria macro conditions. Uses the sqlite cache when it is fresh or
 * when the network is unavailable, otherwise fetches the World Bank indicators
 * and the live NGN/USD rate and stores the result for offline reuse.
 */
export async function loadMarketMacro(force = false): Promise<MarketMacro> {
  const cached = await getCache<MarketMacro>('market:macro').catch(() => null);
  const cachedAge = ageMs(cached?.data.fetchedAt ?? null);
  if (!force && cached && cachedAge != null && cachedAge < MACRO_TTL_MS) {
    return { ...cached.data, isCached: true };
  }

  const errors: string[] = [];
  const fetchedAt = new Date().toISOString();
  const loadSeries = async (key: keyof typeof INDICATORS) => {
    try {
      return await fetchWorldBankSeries(INDICATORS[key]);
    } catch (e) {
      errors.push(`World Bank ${INDICATORS[key]}: ${e instanceof Error ? e.message : String(e)}`);
      return [] as MacroSeriesPoint[];
    }
  };
  const [inflation, exchangeRate, lendingRate] = await Promise.all([
    loadSeries('inflation'),
    loadSeries('exchangeRate'),
    loadSeries('lendingRate'),
  ]);

  let currentFx: number | null = null;
  try {
    currentFx = await fetchCurrentFx();
  } catch (e) {
    errors.push(`open.er-api: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (errors.length === 0) {
    const fresh: MarketMacro = { inflation, exchangeRate, lendingRate, currentFx, fetchedAt, errors: [], isCached: false };
    await setCache('market:macro', fresh).catch(() => undefined);
    return fresh;
  }

  // Network/API trouble: fall back to the last saved macro rather than nothing.
  if (cached) {
    return { ...cached.data, errors: [...(cached.data.errors ?? []), ...errors], isCached: true };
  }
  return { ...EMPTY_MACRO, errors };
}

/** Coerce an untrusted remote payload into a SnapshotBundle. */
function coerceSnapshot(raw: unknown): SnapshotBundle | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { date?: unknown; commodities?: unknown };
  if (typeof obj.date !== 'string') return null;
  const source = obj.commodities;
  if (!source || typeof source !== 'object') return null;
  const commodities: Record<string, MarketCommodity> = {};
  for (const [name, entry] of Object.entries(source as Record<string, unknown>)) {
    const c = entry as { unit?: unknown; months?: unknown } | null;
    if (!c || typeof c !== 'object' || typeof c.unit !== 'string' || !Array.isArray(c.months)) continue;
    const months = (c.months as unknown[])
      .filter(
        (m): m is { date: string; price: number } =>
          !!m &&
          typeof (m as { date?: unknown }).date === 'string' &&
          typeof (m as { price?: unknown }).price === 'number' &&
          Number.isFinite((m as { price: number }).price)
      )
      .map((m) => ({ date: m.date, price: m.price }));
    if (months.length) commodities[name] = { unit: c.unit, months };
  }
  if (Object.keys(commodities).length === 0) return null;
  return { date: obj.date, commodities };
}

export type SnapshotStatus = { bundle: SnapshotBundle; source: SnapshotSource };

/**
 * Returns the freshest WFP snapshot the phone knows, in order of preference:
 * cached online copy (fresh) → newest from the agropredict repo → cached copy
 * (stale/offline) → the bundled copy. Never throws; never blocks the forecast.
 */
export async function ensureLatestSnapshot(force = false): Promise<SnapshotStatus> {
  const cached = await getCache<SnapshotBundle>('market:snapshot').catch(() => null);
  const cachedAge = ageMs(cached?.updatedAt ?? null);
  if (!force && cached && cachedAge != null && cachedAge < SNAPSHOT_TTL_MS) {
    return { bundle: cached.data, source: 'saved' };
  }
  try {
    const res = await fetchWithRetry(MARKET_SNAPSHOT_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: unknown = await res.json();
    const live = coerceSnapshot(json);
    if (live && live.date >= bundledSnapshot.date) {
      await setCache('market:snapshot', live).catch(() => undefined);
      return { bundle: live, source: 'live' };
    }
  } catch {
    // offline or unreachable — fall through to cache or the bundled copy
  }
  if (cached) return { bundle: cached.data, source: 'saved' };
  return { bundle: bundledSnapshot, source: 'bundled' };
}

