import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CachedBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <View style={styles.cached}><MaterialCommunityIcons name="cloud-off-outline" size={18} color={colors.warning} /><Text style={styles.cachedText}>Offline view · showing last saved data</Text></View>;
}

export function EmptyState({ icon, title, detail }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; detail: string }) {
  return <View style={styles.empty}><MaterialCommunityIcons name={icon} size={44} color={colors.primary} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text></View>;
}

export function weatherLabel(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  return 'Thunderstorms';
}

export function weatherIcon(code: number): keyof typeof MaterialCommunityIcons.glyphMap {
  if (code === 0) return 'weather-sunny';
  if (code <= 3) return 'weather-partly-cloudy';
  if (code <= 48) return 'weather-fog';
  if (code <= 67) return 'weather-rainy';
  if (code <= 77) return 'weather-snowy';
  if (code <= 82) return 'weather-pouring';
  return 'weather-lightning-rainy';
}

export function formatUpdated(iso: string | null) {
  if (!iso) return 'Not updated yet';
  return `Updated ${new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border },
  cached: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningBg, borderRadius: 12, padding: 12, marginBottom: 14 },
  cachedText: { color: colors.warning, fontWeight: '700', fontSize: 13 },
  empty: { paddingVertical: 50, paddingHorizontal: 28, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontSize: 19, fontWeight: '800', color: colors.text },
  emptyDetail: { marginTop: 6, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
