import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getLocation, getSetting, initializeDatabase, saveLocation, setSetting } from './src/db';
import { HomeScreen } from './src/HomeScreen';
import { RainfallScreen } from './src/RainfallScreen';
import { SettingsScreen } from './src/SettingsScreen';
import { colors } from './src/theme';
import { FarmLocation } from './src/types';
import { useFarmData } from './src/useFarmData';
import { OnboardingScreen } from './src/OnboardingScreen';
import { CropsScreen } from './src/CropsScreen';
import { ToolsScreen } from './src/ToolsScreen';
import { scheduleFarmNotifications } from './src/notifications';

type Tab = 'home' | 'rain' | 'crops' | 'tools' | 'settings';
export default function App() {
  const [ready, setReady] = useState(false); const [onboarded, setOnboarded] = useState(false); const [location, setLocation] = useState<FarmLocation | null>(null); const [tab, setTab] = useState<Tab>('home'); const [nested, setNested] = useState(false);
  useEffect(() => { (async () => { try { await initializeDatabase(); setLocation(await getLocation()); setOnboarded((await getSetting('onboarding_complete')) === 'true'); } finally { setReady(true); } })(); }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (nested) { setNested(false); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [tab]);
  const farm = useFarmData(ready ? location : null);
  function selectTab(next: Tab) { setNested(false); setTab(next); }
  useEffect(() => { if (ready && onboarded && farm.weather.data) void scheduleFarmNotifications(farm.weather.data).catch(() => false); }, [ready, onboarded, farm.weather.data]);
  async function updateLocation(next: FarmLocation) { await saveLocation(next); setLocation(next); setTab('home'); }
  async function finishOnboarding(next?: FarmLocation) { if (next) await updateLocation(next); await setSetting('onboarding_complete', 'true'); setOnboarded(true); if (!next) setTab('settings'); }
  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Preparing offline storage...</Text></View>;
  if (!onboarded) return <SafeAreaProvider style={{backgroundColor:colors.background}}><SafeAreaView style={styles.safe}><StatusBar style="dark" /><OnboardingScreen onFinish={finishOnboarding} /></SafeAreaView></SafeAreaProvider>;
  return <SafeAreaProvider style={{backgroundColor:colors.background}}><SafeAreaView style={styles.safe} edges={['top', 'bottom']}><StatusBar style="dark" /><View style={styles.screen}>
    {!nested ? <AppHeader tab={tab} location={location} cached={farm.weather.isCached} hasWeather={Boolean(farm.weather.data)} /> : null}
    <View style={styles.content}>
    {tab === 'home' ? <HomeScreen location={location} weather={farm.weather} soil={farm.soil} loading={farm.loading} error={farm.error} refresh={farm.refresh} /> : null}
    {tab === 'rain' ? <RainfallScreen location={location} rainfall={farm.rainfall} loading={farm.loading} refresh={farm.refresh} /> : null}
    {tab === 'crops' ? <CropsScreen location={location} weather={farm.weather} rainfall={farm.rainfall} soil={farm.soil} onNestedChange={setNested} /> : null}
    {tab === 'tools' ? <ToolsScreen location={location} weather={farm.weather} rainfall={farm.rainfall} soil={farm.soil} onNestedChange={setNested} /> : null}
    {tab === 'settings' ? <SettingsScreen location={location} onLocation={updateLocation} /> : null}
    </View>
  </View><View style={styles.tabs}><TabButton active={tab === 'home'} icon="weather-partly-cloudy" label="Forecast" onPress={() => selectTab('home')} /><TabButton active={tab === 'rain'} icon="chart-bar" label="Rainfall" onPress={() => selectTab('rain')} /><TabButton active={tab === 'crops'} icon="sprout-outline" label="Crops" onPress={() => selectTab('crops')} /><TabButton active={tab === 'tools'} icon="toolbox-outline" label="Tools" onPress={() => selectTab('tools')} /><TabButton active={tab === 'settings'} icon="map-marker-outline" label="Location" onPress={() => selectTab('settings')} /></View></SafeAreaView></SafeAreaProvider>;
}
const headerConfig: Record<Tab, { title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  home: { title: 'Forecast', subtitle: 'Farm weather outlook', icon: 'weather-partly-cloudy' },
  rain: { title: 'Rainfall', subtitle: 'Seasonal climate context', icon: 'chart-bar' },
  crops: { title: 'Crops', subtitle: 'Planning and field decisions', icon: 'sprout-outline' },
  tools: { title: 'Farm tools', subtitle: 'Guides, records, and business', icon: 'toolbox-outline' },
  settings: { title: 'Farm location', subtitle: 'GPS and location settings', icon: 'map-marker-outline' },
};
function AppHeader({ tab, location, cached, hasWeather }: { tab: Tab; location: FarmLocation | null; cached: boolean; hasWeather: boolean }) {
  const config = headerConfig[tab];
  return <View style={styles.header}><View style={styles.headerBrand}><View style={styles.headerLogo}><MaterialCommunityIcons name="leaf" size={18} color="#FFF" /></View><View><Text style={styles.headerTitle}>{config.title}</Text><Text style={styles.headerSubtitle}>{config.subtitle}</Text></View></View><View style={styles.headerRight}><View style={styles.headerLocation}><MaterialCommunityIcons name={config.icon} size={16} color={colors.primary} /><Text numberOfLines={1} style={styles.headerLocationText}>{location ? location.name.split(',')[0] : 'No farm set'}</Text></View>{hasWeather ? <View style={[styles.headerStatus, cached && styles.headerStatusCached]}><View style={[styles.headerStatusDot, cached && styles.headerStatusDotCached]} /><Text style={[styles.headerStatusText, cached && styles.headerStatusTextCached]}>{cached ? 'Cached' : 'Live'}</Text></View> : null}</View></View>;
}
function TabButton({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.tab, active && styles.tabButtonActive]}><MaterialCommunityIcons name={icon} size={25} color={active ? colors.primary : colors.muted} /><Text style={[styles.tabText, active && styles.tabActive]}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, screen: { flex: 1 }, content: { flex: 1 }, loading: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }, loadingText: { color: colors.muted, marginTop: 12 }, header: { height: 68, backgroundColor: colors.background, borderBottomWidth: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',  }, headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }, headerLogo: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: colors.text, fontWeight: '900', fontSize: 17 }, headerSubtitle: { color: colors.muted, fontSize: 9, marginTop: 1 }, headerRight: { alignItems: 'flex-end', marginLeft: 8, maxWidth: '38%' }, headerLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' }, headerLocationText: { color: colors.text, fontSize: 11, fontWeight: '800', flexShrink: 1 }, headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginTop: 4 }, headerStatusCached: { backgroundColor: colors.warningBg }, headerStatusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary }, headerStatusDotCached: { backgroundColor: colors.warning }, headerStatusText: { color: colors.primary, fontWeight: '900', fontSize: 8 }, headerStatusTextCached: { color: colors.warning }, tabs: { minHeight: 72, flexDirection: 'row', backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 6 }, tab: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 3, marginHorizontal: 3, marginVertical: 5, borderRadius: 12 }, tabButtonActive: { backgroundColor: '#FFF' }, tabText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, tabActive: { color: colors.primary, fontWeight: '900' } });
