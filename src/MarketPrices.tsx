import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from './components';
import { colors } from './theme';
import { bundledSnapshot, ensureLatestSnapshot, futureForecast, listOptions, loadMarketMacro, predictCommodity } from './market';
import type { MarketMacro, SnapshotBundle, SnapshotSource } from './market';

const HORIZONS = [3, 6, 12, 24];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PREFERRED_DEFAULT = ['Rice (imported)', 'Maize flour', 'Tomatoes', 'Yam', 'Bananas'];

function fmtInt(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
const naira = (n: number) => `₦${fmtInt(n)}`;
function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[(m - 1) % 12]} ${y}`;
}
function unitLabel(unit: string) {
  if (unit === 'kg') return 'per kg';
  if (unit === 'L') return 'per litre';
  return `per ${unit}`;
}
function fxPct(ratio: number | null) {
  return ratio == null ? null : `${ratio >= 0 ? '+' : ''}${(ratio * 100).toFixed(1)}%`;
}
function latest(series: { value: number | null }[]) {
  return series.find((p) => p.value != null)?.value ?? null;
}

export function MarketPrices() {
  const [snap, setSnap] = useState<SnapshotBundle>(bundledSnapshot);
  const [snapSource, setSnapSource] = useState<SnapshotSource>('bundled');
  const [checking, setChecking] = useState(false);
  const options = useMemo(() => listOptions(snap), [snap]);
  const [active, setActive] = useState(() => {
    const base = listOptions(bundledSnapshot);
    return PREFERRED_DEFAULT.find((n) => base.some((o) => o.name === n)) ?? base[0]?.name ?? '';
  });
  const [horizon, setHorizon] = useState(12);
  const [coc, setCoc] = useState('');
  const [macro, setMacro] = useState<MarketMacro | null>(null);
  const [loadingMacro, setLoadingMacro] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const m = await loadMarketMacro();
      if (mounted) {
        setMacro(m);
        setLoadingMacro(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Swap the bundled copy for a newer online snapshot (if any) once per open.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const status = await ensureLatestSnapshot();
      if (mounted) {
        setSnap(status.bundle);
        setSnapSource(status.source);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // If the online snapshot dropped the currently selected commodity, fall back to a valid one.
  useEffect(() => {
    if (active && !snap.commodities[active]) {
      setActive(PREFERRED_DEFAULT.find((n) => snap.commodities[n]) ?? options[0]?.name ?? '');
    }
  }, [active, snap, options]);

  async function checkForUpdate() {
    setChecking(true);
    const status = await ensureLatestSnapshot(true);
    setSnap(status.bundle);
    setSnapSource(status.source);
    setChecking(false);
  }

  const activeName = active && snap.commodities[active] ? active : options[0]?.name ?? '';
  const commodity = activeName ? snap.commodities[activeName] : undefined;
  const option = commodity ? { name: activeName, unit: commodity.unit } : undefined;

  const result = useMemo(() => {
    if (!commodity || commodity.months.length === 0) return null;
    const parsed = Number(coc);
    const override = coc === '' || !Number.isFinite(parsed) ? undefined : parsed;
    return predictCommodity(commodity, macro, horizon, override);
  }, [commodity, macro, horizon, coc]);

  const future = useMemo(() => (result ? futureForecast(result.forecast, horizon) : []), [result, horizon]);

  if (!commodity || !option || !result) {
    return <Text style={styles.mutedBody}>No price history is available for this commodity right now. Check that the online snapshot can be reached, or regenerate the bundled market snapshot.</Text>;
  }

  const unit = unitLabel(option.unit);
  const lastActual = commodity.months[commodity.months.length - 1]!;
  const basePrice = result.inputs.basePrice;
  const horizonPoint = future[future.length - 1];
  const changePct = horizonPoint && basePrice > 0 ? (horizonPoint.price / basePrice - 1) * 100 : null;
  const rising = (changePct ?? 0) >= 0;

  const latestInflation = latest(macro?.inflation ?? []);
  const fxYoY = fxYoYRatio(macro?.exchangeRate ?? []);
  const costOfCapital = result.inputs.costOfCapitalAnnual;

  function refreshMacro() {
    setLoadingMacro(true);
    (async () => {
      const m = await loadMarketMacro(true);
      setMacro(m);
      setLoadingMacro(false);
    })();
  }

  const macroStatus = loadingMacro
    ? 'Fetching indicators…'
    : !macro
      ? 'Unavailable offline'
      : macro.errors.length
        ? 'Last saved · some sources failed'
        : macro.isCached
          ? `Saved ${macro.fetchedAt ? `at ${new Date(macro.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
          : 'Live now';

  return (
    <View>
      <Text style={styles.eyebrow}>PRICE FORECAST</Text>
      <Text style={styles.lede}>Projects {activeName} prices from WFP/HDX market history plus Nigeria's live inflation, exchange-rate and financing conditions.</Text>

      {/* Commodity selector */}
      <Text style={styles.sectionLabel}>COMMODITY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail}>
        {options.map((o) => {
          const selected = o.name === activeName;
          return (
            <Pressable key={o.name} style={[styles.chip, selected && styles.chipActive]} onPress={() => setActive(o.name)}>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{o.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.noteRow}>
        <Text style={styles.unitNote}>History is the national monthly average, {unit}, from WFP market reports through {snap.date}. {snapSource === 'live' ? 'Refreshed online' : snapSource === 'saved' ? 'Showing the last saved online copy' : 'Bundled copy (offline)'}.</Text>
        {checking ? <ActivityIndicator size="small" color={colors.primary} /> : <Pressable accessibilityLabel="Check for price data update" hitSlop={8} onPress={checkForUpdate}><Text style={styles.checkLink}>Check for update</Text></Pressable>}
      </View>

      {/* Horizon + cost of capital */}
      <Card style={styles.card}>
        <View style={styles.controlRow}>
          <Text style={styles.sectionLabel2}>HORIZON</Text>
          <View style={styles.segmented}>
            {HORIZONS.map((h) => {
              const on = h === horizon;
              return (
                <Pressable key={h} style={[styles.seg, on && styles.segActive]} onPress={() => setHorizon(h)}>
                  <Text style={[styles.segText, on && styles.segTextActive]}>{h} mo</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.controlRow}>
          <Text style={styles.sectionLabel2}>COST OF CAPITAL</Text>
          <View style={styles.overrideBox}>
            <TextInput
              style={styles.overrideInput}
              value={coc}
              onChangeText={setCoc}
              keyboardType="decimal-pad"
              placeholder={costOfCapital != null ? `auto ${costOfCapital.toFixed(1)}%` : 'auto'}
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.overrideSuffix}>%</Text>
          </View>
        </View>
        <Text style={styles.hint}>Annual financing/storage cost. Blank uses the latest World Bank lending rate.</Text>
      </Card>

      {/* Projection */}
      {horizonPoint && (
        <Card style={styles.projCard}>
          <Text style={styles.projEyebrow}>PROJECTED {monthLabel(horizonPoint.date).toUpperCase()}</Text>
          <View style={styles.projValueRow}>
            <Text style={[styles.projValue, { color: rising ? colors.accent : colors.primary }]}>{naira(horizonPoint.price)}</Text>
            <Text style={styles.projUnit}>/ {option.unit}</Text>
          </View>
          <View style={styles.projRow}>
            <MaterialCommunityIcons name={rising ? 'trending-up' : 'trending-down'} size={17} color={rising ? colors.accent : colors.primary} />
            <Text style={[styles.projDelta, { color: rising ? colors.warning : colors.primary }]}>
              {changePct != null ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%` : '—'} vs {naira(basePrice)} {unit} base
            </Text>
          </View>
          <View style={styles.projMetaRow}>
            <View style={styles.projMeta}><Text style={styles.projMetaK}>LAST OBSERVED</Text><Text style={styles.projMetaV}>{monthLabel(lastActual.date)} · {naira(lastActual.price)}</Text></View>
            <View style={styles.projMeta}><Text style={styles.projMetaK}>MONTHLY RATE</Text><Text style={styles.projMetaV}>{(result.inputs.blendedMonthlyRate * 100).toFixed(2)}%</Text></View>
          </View>
        </Card>
      )}

      {/* Price path */}
      {result.history.length > 0 && <PricePath history={result.history} future={future} unit={unit} />}

      {/* Macro conditions */}
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.flex}><Text style={styles.cardTitle}>Macro conditions</Text><Text style={styles.macroStatus}>{macroStatus}</Text></View>
          {loadingMacro ? <ActivityIndicator size="small" color={colors.primary} /> : (
            <Pressable accessibilityLabel="Refresh indicators" onPress={refreshMacro} style={styles.refresh}><MaterialCommunityIcons name="refresh" size={19} color={colors.primary} /></Pressable>
          )}
        </View>
        <View style={styles.statGrid}>
          <Stat label="Current FX (NGN/USD)" value={macro?.currentFx != null ? `₦${fmtInt(macro.currentFx)}` : '—'} />
          <Stat label="Inflation (annual)" value={latestInflation != null ? `${latestInflation.toFixed(1)}%` : '—'} />
          <Stat label="Cost of capital" value={costOfCapital != null ? `${costOfCapital.toFixed(1)}%` : '—'} />
          <Stat label="FX change (YoY)" value={fxYoY != null ? fxPct(fxYoY) ?? '—' : '—'} />
        </View>
        {macro && macro.errors.length > 0 && (
          <View style={styles.macroNote}><MaterialCommunityIcons name="cloud-off-outline" size={15} color={colors.warning} /><Text style={styles.macroNoteText}>Some live indicators could not be reached — the projection then leans on the price trend alone.</Text></View>
        )}
      </Card>

      {/* Month-by-month table */}
      {future.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Month by month</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.cell, styles.monthCell]}>MONTH</Text>
            <Text style={[styles.cell, styles.priceCell]}>PREDICTED</Text>
            <Text style={[styles.cell, styles.deltaCell]}>VS BASE</Text>
          </View>
          {future.map((p, i) => {
            const pct = basePrice > 0 ? (p.price / basePrice - 1) * 100 : null;
            const up = (pct ?? 0) >= 0;
            return (
              <View key={p.date} style={[styles.row, i === future.length - 1 && styles.lastRow]}>
                <Text style={[styles.cell, styles.monthCell]}>{monthLabel(p.date)}</Text>
                <Text style={[styles.cell, styles.priceCell, styles.price]}>{naira(p.price)}</Text>
                <Text style={[styles.cell, styles.deltaCell, { color: pct == null ? colors.muted : up ? colors.warning : colors.primary }]}>
                  {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                </Text>
              </View>
            );
          })}
          <View style={styles.divider} />
          <Text style={styles.footNote}>Base = mean of the last three observed monthly prices ({naira(basePrice)} {unit}). Projection assumes the blended monthly rate holds steady.</Text>
        </Card>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <View style={styles.warnBox}>
          <MaterialCommunityIcons name="alert-outline" size={18} color={colors.warning} />
          <Text style={styles.warnText}>{result.warnings.join(' ')}</Text>
        </View>
      )}

      {/* Assumptions */}
      <Card style={styles.assumeCard}>
        <Text style={styles.cardTitle}>Model assumptions</Text>
        <Metric k="Base price (last 3 months)" v={`${naira(basePrice)} ${unit}`} />
        <Metric k="Last observation" v={result.inputs.lastObserved || '—'} />
        <Metric k="Historical monthly trend" v={`${(result.inputs.historicalMonthlyTrend * 100).toFixed(2)}%`} />
        <Metric k="Inflation (annual)" v={result.inputs.inflationAnnual != null ? `${result.inputs.inflationAnnual.toFixed(1)}%` : '—'} />
        <Metric k="FX change (annual)" v={result.inputs.fxChangeAnnual != null ? fxPct(result.inputs.fxChangeAnnual) ?? '—' : '—'} />
        <Metric k="Cost of capital (annual)" v={result.inputs.costOfCapitalAnnual != null ? `${result.inputs.costOfCapitalAnnual.toFixed(1)}%` : '—'} />
        <Metric k="Blended monthly rate" v={`${(result.inputs.blendedMonthlyRate * 100).toFixed(2)}%`} />
        <Text style={styles.formula}>Pₖ = P₀ × (1 + r)ᵏ, with r = min(6%, 0.5·trend + 0.5·(inflation + 0.5·FX + 0.3·carry))</Text>
      </Card>

      <Text style={styles.disclaimer}>A simple trend + macro model — not financial advice. Bundled WFP/HDX national averages can lag or miss your local market; compare against current buyer prices in your area.</Text>
    </View>
  );
}

function PricePath({ history, future, unit }: { history: { date: string; price: number }[]; future: { date: string; price: number }[]; unit: string }) {
  const actual = history.slice(-6);
  const shown = [...actual, ...future];
  const max = Math.max(...shown.map((p) => p.price), 1);
  const area = 118;
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Price path</Text>
      <View style={styles.bars}>
        {shown.map((p, i) => {
          const isFuture = i >= actual.length;
          const h = Math.max(6, (p.price / max) * area);
          return (
            <View key={`${p.date}-${isFuture}`} style={styles.barCol}>
              <View style={[styles.bar, { height: h, backgroundColor: isFuture ? colors.accent : colors.primary }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.barMeta}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Observed</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.accent }]} /><Text style={styles.legendText}>Projected</Text></View>
        <Text style={styles.barRange}>… {monthLabel(shown[shown.length - 1]!.date)}</Text>
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statK}>{label.toUpperCase()}</Text>
      <Text style={styles.statV}>{value}</Text>
    </View>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricK}>{k}</Text>
      <Text style={styles.metricV}>{v}</Text>
    </View>
  );
}

function fxYoYRatio(series: { value: number | null }[]) {
  const values = series.filter((p) => p.value != null).map((p) => p.value as number);
  if (values.length < 2) return null;
  return values[0] / values[1] - 1;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  lede: { color: colors.muted, lineHeight: 20, fontSize: 13, marginTop: 6, marginBottom: 16 },
  sectionLabel: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 9 },
  sectionLabel2: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginRight: 12 },
  chipRail: { gap: 8, paddingRight: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  unitNote: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 15 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7, marginBottom: 14 },
  checkLink: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  card: { marginBottom: 14 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  segmented: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: 11, padding: 3 },
  seg: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9 },
  segActive: { backgroundColor: colors.primary },
  segText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  segTextActive: { color: '#FFFFFF' },
  overrideBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 10, width: 108 },
  overrideInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8, minWidth: 0 },
  overrideSuffix: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  projCard: { backgroundColor: colors.primarySoft, marginBottom: 14 },
  projEyebrow: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  projValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 5, flexWrap: 'wrap' },
  projValue: { fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  projUnit: { color: colors.muted, fontSize: 13, fontWeight: '800', marginBottom: 6, marginLeft: 5 },
  projRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  projDelta: { fontSize: 13, fontWeight: '900' },
  projMetaRow: { flexDirection: 'row', gap: 10, marginTop: 13 },
  projMeta: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10 },
  projMetaK: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  projMetaV: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 3 },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 11 },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  macroStatus: { color: colors.muted, fontSize: 10, marginTop: 2 },
  refresh: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48.5%', backgroundColor: colors.background, borderRadius: 12, padding: 10 },
  statK: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  statV: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 4 },
  macroNote: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 11, backgroundColor: colors.warningBg, borderRadius: 10, padding: 9 },
  macroNoteText: { flex: 1, color: colors.warning, fontSize: 11, lineHeight: 16 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 118, gap: 4, marginTop: 6 },
  barCol: { flex: 1, height: 118, justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 6 },
  barMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  barRange: { color: colors.muted, fontSize: 10, marginLeft: 'auto' },
  tableHead: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  cell: { fontSize: 12 },
  monthCell: { flex: 1.3, color: colors.text, fontWeight: '700' },
  priceCell: { flex: 1, color: colors.muted, textAlign: 'right' },
  deltaCell: { flex: 0.9, textAlign: 'right', fontWeight: '800' },
  price: { color: colors.text, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 9 },
  footNote: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  warnBox: { flexDirection: 'row', gap: 7, backgroundColor: colors.warningBg, borderRadius: 12, padding: 11, marginBottom: 14, alignItems: 'flex-start' },
  warnText: { flex: 1, color: colors.warning, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  assumeCard: { backgroundColor: colors.surface, marginBottom: 14 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 },
  metricK: { color: colors.muted, fontSize: 11 },
  metricV: { color: colors.text, fontWeight: '800', fontSize: 11, textAlign: 'right' },
  formula: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 12, fontStyle: 'italic' },
  disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 16, fontStyle: 'italic', marginBottom: 6 },
  mutedBody: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
