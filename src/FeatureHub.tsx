import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState } from './components';
import { colors } from './theme';

export type Feature = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
  badge?: string;
  content: { heading: string; body: string; icon?: keyof typeof MaterialCommunityIcons.glyphMap }[];
  customContent?: ReactNode;
};

export function FeatureHub({ title, subtitle, features, locationReady = true, onNestedChange }: { title: string; subtitle: string; features: Feature[]; locationReady?: boolean; onNestedChange?: (nested: boolean) => void }) {
  const [selected, setSelected] = useState<Feature | null>(null);
  if (!locationReady) return <EmptyState icon="map-marker-plus-outline" title="Set your farm location" detail="These tools use your location and local weather. Set it from the Location tab first." />;
  if (selected) return <FeatureDetail feature={selected} onBack={() => { setSelected(null); onNestedChange?.(false); }} />;
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text>
    <View style={styles.grid}>{features.map((feature) => <Pressable key={feature.id} style={styles.tile} onPress={() => { setSelected(feature); onNestedChange?.(true); }}>
      <View style={[styles.iconBox, { backgroundColor: `${feature.color ?? colors.primary}18` }]}><MaterialCommunityIcons name={feature.icon} size={28} color={feature.color ?? colors.primary} /></View>
      {feature.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{feature.badge}</Text></View> : null}
      <Text style={styles.tileTitle}>{feature.title}</Text><Text style={styles.tileSubtitle}>{feature.subtitle}</Text>
      <MaterialCommunityIcons name="arrow-right" size={19} color={colors.primary} style={styles.arrow} />
    </Pressable>)}</View>
  </ScrollView>;
}

function FeatureDetail({ feature, onBack }: { feature: Feature; onBack: () => void }) {
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; }); return () => subscription.remove(); }, [onBack]);
  return <View style={styles.detailScreen}><View style={styles.detailHeader}><Pressable accessibilityLabel="Back" style={styles.backButton} onPress={onBack}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.text} /></Pressable><View style={styles.flex}><Text numberOfLines={1} style={styles.detailHeaderTitle}>{feature.title}</Text><Text numberOfLines={1} style={styles.detailHeaderSubtitle}>{feature.subtitle}</Text></View></View><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.detailTitle}>{feature.title}</Text><Text style={styles.detailSubtitle}>{feature.subtitle}</Text>
    {feature.customContent}
    {feature.content.map((item, index) => <Card key={`${item.heading}-${index}`} style={styles.detailCard}><View style={styles.detailRow}>{item.icon ? <View style={styles.smallIcon}><MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} /></View> : null}<View style={styles.flex}><Text style={styles.heading}>{item.heading}</Text><Text style={styles.body}>{item.body}</Text></View></View></Card>)}
    <View style={styles.offline}><MaterialCommunityIcons name="cloud-check-outline" size={18} color={colors.primary} /><Text style={styles.offlineText}>Core guidance is available offline</Text></View>
  </ScrollView></View>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 110 }, title: { fontSize: 27, fontWeight: '900', color: colors.text }, subtitle: { color: colors.muted, lineHeight: 20, marginTop: 4, marginBottom: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, tile: { width: '48%', minHeight: 190, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 19, padding: 15 }, iconBox: { width: 49, height: 49, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, badge: { position: 'absolute', right: 11, top: 12, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.warningBg }, badgeText: { color: colors.warning, fontSize: 9, fontWeight: '900' }, tileTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 13 }, tileSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5, paddingBottom: 20 }, arrow: { position: 'absolute', left: 15, bottom: 13 }, detailScreen: { flex: 1 }, detailHeader: { height: 62, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, elevation: 2 }, backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, detailHeaderTitle: { color: colors.text, fontWeight: '900', fontSize: 16 }, detailHeaderSubtitle: { color: colors.muted, fontSize: 10, marginTop: 2 }, detailTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 4 }, detailSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5, marginBottom: 20 }, detailCard: { marginBottom: 11 }, detailRow: { flexDirection: 'row', gap: 12 }, smallIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, heading: { color: colors.text, fontWeight: '900', fontSize: 16 }, body: { color: colors.muted, lineHeight: 20, marginTop: 5 }, offline: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 10 }, offlineText: { color: colors.primary, fontSize: 12, fontWeight: '700' } });
