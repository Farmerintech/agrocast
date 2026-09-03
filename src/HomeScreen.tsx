import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CachedBanner, Card, EmptyState, formatUpdated, weatherIcon, weatherLabel } from './components';
import { hazardsForDay } from './EnvironmentalAlerts';
import { colors } from './theme';
import { FarmLocation, Loadable, SoilData, WeatherData, WeatherDay } from './types';

function advice(data: WeatherData) {
  const next = data.daily.slice(0, 3);
  const rain = next.reduce((sum, d) => sum + d.precipitation, 0);
  const wind = Math.max(...next.map((d) => d.windSpeedMax));
  if (rain >= 20) return { icon: 'water-alert-outline' as const, title: 'Heavy rain possible', text: 'Check drainage and avoid applying fertilizer just before rainfall.' };
  if (rain >= 5) return { icon: 'sprout-outline' as const, title: 'Useful rain ahead', text: 'Good moisture is expected. Consider planting or transplanting if soil is ready.' };
  if (wind >= 30) return { icon: 'weather-windy' as const, title: 'Strong winds ahead', text: 'Delay spraying and secure young plants or lightweight covers.' };
  return { icon: 'watering-can-outline' as const, title: 'Mostly dry ahead', text: 'Check soil moisture and plan irrigation for sensitive crops.' };
}

export function HomeScreen({ location, weather, soil, loading, error, refresh }: { location: FarmLocation | null; weather: Loadable<WeatherData>; soil: Loadable<SoilData>; loading: boolean; error: string | null; refresh: () => void }) {
  const now = new Date(); const [calendarMonth, setCalendarMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1)); const [selectedDate, setSelectedDate] = useState(now.toISOString().slice(0, 10)); const [picked, setPicked] = useState<WeatherDay | null>(null);
  if (!location) return <EmptyState icon="map-marker-plus-outline" title="Set your farm location" detail="Open Settings to use GPS or search for your farm area." />;
  const data = weather.data;
  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} colors={[colors.primary]} />}>
    <Text style={styles.eyebrow}>YOUR FARM</Text><Text numberOfLines={2} style={styles.location}>{location.name}</Text>
    <Text style={styles.updated}>{formatUpdated(weather.updatedAt)}</Text>
    <CachedBanner visible={weather.isCached} />
    {loading && !data ? <ActivityIndicator style={styles.loader} size="large" color={colors.primary} /> : null}
    {error && !data ? <Card><Text style={styles.error}>{error}</Text></Card> : null}
    {data ? <>
      <Card style={styles.hero}>
        <View><Text style={styles.now}>NOW</Text><Text style={styles.temp}>{Math.round(data.current.temperature)}°</Text><Text style={styles.condition}>{weatherLabel(data.current.weatherCode)}</Text><Text style={styles.feels}>Feels like {Math.round(data.current.apparentTemperature)}°</Text>{data.daily[0] ? <Text style={styles.todayLine}>High {Math.round(data.daily[0].temperatureMax)}° · Low {Math.round(data.daily[0].temperatureMin)}° · {Math.round(data.daily[0].precipitationProbability)}% rain</Text> : null}</View>
        <MaterialCommunityIcons name={weatherIcon(data.current.weatherCode)} size={82} color={colors.accent} />
        <View style={styles.metrics}>
          <Metric icon="water-percent" value={`${Math.round(data.current.humidity)}%`} label="Humidity" />
          <Metric icon="weather-windy" value={`${Math.round(data.current.windSpeed)} km/h`} label="Wind" />
          <Metric icon="weather-rainy" value={`${data.current.precipitation.toFixed(1)} mm`} label="Rain now" />
        </View>
      </Card>
      <Text style={styles.sectionTitle}>7-day forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>{data.daily.map((day, i) => <ForecastDayCard key={day.date} day={day} index={i} onPress={() => setPicked(day)} />)}</ScrollView>
      <Text style={styles.tapHint}>Tap a day for its location and environmental alerts</Text>
      <Text style={styles.sectionTitle}>Forecast calendar</Text><ForecastCalendar data={data} month={calendarMonth} selectedDate={selectedDate} onMonth={setCalendarMonth} onDate={setSelectedDate} />
      <Text style={styles.sectionTitle}>Farm outlook</Text>
      <Card style={styles.advice}>{(() => { const tip = advice(data); return <><View style={styles.adviceIcon}><MaterialCommunityIcons name={tip.icon} size={28} color={colors.primary} /></View><View style={styles.flex}><Text style={styles.adviceTitle}>{tip.title}</Text><Text style={styles.adviceText}>{tip.text}</Text></View></>; })()}</Card>
      {soil.data ? <><Text style={styles.sectionTitle}>Soil context</Text><Card><Text style={styles.soilTitle}>{soil.data.texture} topsoil</Text><Text style={styles.soilText}>{soil.data.sand?.toFixed(0) ?? '–'}% sand · {soil.data.clay?.toFixed(0) ?? '–'}% clay · pH {soil.data.ph?.toFixed(1) ?? '–'}</Text><Text style={styles.source}>Source: SoilGrids, 0–5 cm estimate</Text></Card></> : null}
    </> : null}
    {data && location ? <DaySheet day={picked} location={location} humidity={data.current.humidity} soil={soil.data} onClose={() => setPicked(null)} /> : null}
  </ScrollView>;
}

function ForecastCalendar({ data, month, selectedDate, onMonth, onDate }: { data: WeatherData; month: Date; selectedDate: string; onMonth: (date: Date) => void; onDate: (date: string) => void }) {
  const cells = useMemo(() => { const year = month.getFullYear(); const monthIndex = month.getMonth(); const first = new Date(year, monthIndex, 1).getDay(); const count = new Date(year, monthIndex + 1, 0).getDate(); return [...Array(first).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)]; }, [month]);
  const forecast = data.daily.find((day) => day.date === selectedDate); const today = new Date().toISOString().slice(0, 10);
  const toKey = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return <><Card style={styles.calendar}><View style={styles.calendarHeader}><Pressable style={styles.monthButton} onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><MaterialCommunityIcons name="chevron-left" size={23} color={colors.text} /></Pressable><View><Text style={styles.calendarTitle}>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text><Text style={styles.calendarHint}>Tap a date to view its forecast</Text></View><Pressable style={styles.monthButton} onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><MaterialCommunityIcons name="chevron-right" size={23} color={colors.text} /></Pressable></View><View style={styles.weekRow}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}</View><View style={styles.dateGrid}>{cells.map((day, index) => { if (!day) return <View key={`blank-${index}`} style={styles.dateCell} />; const key = toKey(day); const available = data.daily.some((item) => item.date === key); const chosen = key === selectedDate; const isToday = key === today; return <Pressable key={key} onPress={() => onDate(key)} style={[styles.dateCell, available && styles.dateAvailable, chosen && styles.dateSelected, isToday && !chosen && styles.dateToday]}><Text style={[styles.dateText, available && styles.dateAvailableText, chosen && styles.dateSelectedText]}>{day}</Text>{available ? <View style={[styles.forecastDot, chosen && styles.forecastDotSelected]} /> : null}</Pressable>; })}</View></Card><Card style={styles.selectedForecast}>{forecast ? <><View style={styles.selectedForecastTop}><View><Text style={styles.selectedDate}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</Text><Text style={styles.selectedCondition}>{weatherLabel(forecast.weatherCode)}</Text></View><MaterialCommunityIcons name={weatherIcon(forecast.weatherCode)} size={42} color={colors.rain} /></View><View style={styles.selectedMetrics}><SmallMetric label="Temperature" value={`${Math.round(forecast.temperatureMax)}° / ${Math.round(forecast.temperatureMin)}°`} /><SmallMetric label="Rain chance" value={`${Math.round(forecast.precipitationProbability)}%`} /><SmallMetric label="Rainfall" value={`${forecast.precipitation.toFixed(1)} mm`} /><SmallMetric label="Wind" value={`${Math.round(forecast.windSpeedMax)} km/h`} /></View></> : <View style={styles.unavailable}><MaterialCommunityIcons name="calendar-remove-outline" size={28} color={colors.muted} /><View style={styles.flex}><Text style={styles.unavailableTitle}>Forecast not available for this date</Text><Text style={styles.unavailableText}>Open-Meteo currently provides the downloaded seven-day window. Dates with a green dot have forecast details.</Text></View></View>}</Card></>;
}

function ForecastDayCard({ day, index, onPress }: { day: WeatherDay; index: number; onPress: () => void }) {
  const date = new Date(`${day.date}T12:00:00`);
  const month = date.toLocaleDateString([], { month: 'short' }).toUpperCase();
  const weekday = date.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
  const heading = index === 0 ? `TODAY · ${date.getDate()} ${month}` : index === 1 ? `TOMORROW · ${date.getDate()} ${month}` : `${weekday} · ${date.getDate()} ${month}`;
  const wet = day.weatherCode >= 51 && day.weatherCode <= 99;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.dayCard, index === 0 && styles.dayCardToday, pressed && styles.dayCardPressed]}>
    <View style={styles.dayHeaderRow}><Text style={styles.dayHeading}>{heading}</Text><View style={styles.dayMore}><MaterialCommunityIcons name="chevron-right" size={13} color={colors.primary} /></View></View>
    <View style={styles.dayBody}>
      <MaterialCommunityIcons name={weatherIcon(day.weatherCode)} size={42} color={wet ? colors.rain : colors.accent} />
      <View style={styles.dayCondWrap}>
        <Text style={styles.dayCond}>{weatherLabel(day.weatherCode)}</Text>
        <Text style={styles.dayRainLine}>{day.precipitation > 0.05 ? `~${day.precipitation.toFixed(1)} mm expected` : 'Dry — little or no rain expected'}</Text>
      </View>
      <View style={styles.dayTemps}>
        <Text style={styles.dayHigh}>{Math.round(day.temperatureMax)}°</Text>
        <Text style={styles.dayLow}>{Math.round(day.temperatureMin)}°</Text>
      </View>
    </View>
    <View style={styles.dayDivider} />
    <View style={styles.dayInfo}>
      <DayInfo icon="weather-pouring" tint={colors.rain} value={`${Math.round(day.precipitationProbability)}%`} label="Rain chance" />
      <DayInfo icon="weather-windy" tint={colors.primary} value={`${Math.round(day.windSpeedMax)} km/h`} label="Wind" />
      <DayInfo icon="white-balance-sunny" tint={uvTint(day.uvIndexMax)} value={uvLabel(day.uvIndexMax)} label="UV index" />
    </View>
  </Pressable>;
}

function DayInfo({ icon, tint, value, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; tint: string; value: string; label: string }) {
  return <View style={styles.dayInfoItem}><View style={styles.dayInfoTop}><MaterialCommunityIcons name={icon} size={15} color={tint} /><Text style={[styles.dayInfoValue, { color: tint }]}>{value}</Text></View><Text style={styles.dayInfoLabel}>{label}</Text></View>;
}

function uvLabel(u: number) { if (u < 3) return 'Low'; if (u < 6) return 'Moderate'; if (u < 8) return 'High'; if (u < 11) return 'Very high'; return 'Extreme'; }
function uvTint(u: number) { if (u < 3) return colors.primary; if (u < 6) return colors.warning; if (u < 8) return '#C77800'; if (u < 11) return '#B45309'; return colors.error; }

function Quick({ icon, value, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string }) { return <View style={sheetStyles.quickItem}><MaterialCommunityIcons name={icon} size={16} color={colors.primary} /><Text style={sheetStyles.quickValue}>{value}</Text><Text style={sheetStyles.quickLabel}>{label}</Text></View>; }
function SheetStat({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) { return <View style={sheetStyles.stat}><View style={sheetStyles.statHead}><MaterialCommunityIcons name={icon} size={15} color={colors.rain} /><Text style={sheetStyles.statValue}>{value}</Text></View><Text style={sheetStyles.statLabel}>{label}</Text></View>; }
function placeOf(location: FarmLocation) { const parts = location.name.split(',').map((p) => p.trim()).filter(Boolean); return { place: parts[0] ?? location.name, region: location.region ?? (parts.length >= 2 ? parts[parts.length - 2] : ''), country: location.country ?? (parts.length >= 1 ? parts[parts.length - 1] : '') }; }
function coordLat(lat: number) { return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`; }
function coordLon(lon: number) { return `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`; }

function DaySheet({ day, location, humidity, soil, onClose }: { day: WeatherDay | null; location: FarmLocation; humidity: number; soil: SoilData | null; onClose: () => void }) {
  const geo = placeOf(location);
  const hazards = day ? hazardsForDay(day, humidity, soil) : [];
  const date = day ? new Date(`${day.date}T12:00:00`) : null;
  return <Modal visible={Boolean(day)} transparent animationType="slide" onRequestClose={onClose}>
    <View style={sheetStyles.overlay}>
      <Pressable style={sheetStyles.dim} onPress={onClose} />
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <Pressable onPress={onClose} style={sheetStyles.x} hitSlop={10}><MaterialCommunityIcons name="close" size={21} color={colors.muted} /></Pressable>
        {day && date ? <ScrollView bounces={false} contentContainerStyle={sheetStyles.scroll}>
          <View style={sheetStyles.head}>
            <View style={[sheetStyles.iconCircle, { backgroundColor: day.weatherCode >= 51 ? '#DDEBF4' : '#FBEFD3' }]}><MaterialCommunityIcons name={weatherIcon(day.weatherCode)} size={26} color={day.weatherCode >= 51 ? colors.rain : colors.accent} /></View>
            <View style={sheetStyles.flex}><Text style={sheetStyles.date}>{date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</Text><Text style={sheetStyles.cond}>{weatherLabel(day.weatherCode)}</Text></View>
            <View style={sheetStyles.tempBlock}><Text style={sheetStyles.high}>{Math.round(day.temperatureMax)}°</Text><Text style={sheetStyles.low}>{Math.round(day.temperatureMin)}°</Text></View>
          </View>
          <View style={sheetStyles.quickRow}>
            <Quick icon="weather-pouring" value={`${Math.round(day.precipitationProbability)}%`} label="Rain chance" />
            <Quick icon="weather-rainy" value={`${day.precipitation.toFixed(1)} mm`} label="Rainfall" />
            <Quick icon="weather-windy" value={`${Math.round(day.windSpeedMax)} km/h`} label="Wind" />
            <Quick icon="white-balance-sunny" value={uvLabel(day.uvIndexMax)} label="UV" />
          </View>
          <Text style={sheetStyles.sectionLabel}>LOCATION</Text>
          <View style={sheetStyles.locCard}>
            <View style={sheetStyles.locRow}><MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} /><Text style={sheetStyles.locPlace}>{geo.place || 'My farm'}</Text></View>
            <Text style={sheetStyles.locSub}>{geo.region && geo.country ? `${geo.region}, ${geo.country}` : geo.region || geo.country || 'Coordinates only — search or use GPS to name this place'}</Text>
            <View style={sheetStyles.locDivider} />
            <View style={sheetStyles.statsWrap}>
              <SheetStat icon="map-marker-outline" label="Region" value={geo.region || '—'} />
              <SheetStat icon="earth" label="Country" value={geo.country || '—'} />
              <SheetStat icon="latitude" label="Latitude" value={coordLat(location.latitude)} />
              <SheetStat icon="longitude" label="Longitude" value={coordLon(location.longitude)} />
            </View>
          </View>
          <Text style={sheetStyles.sectionLabel}>ENVIRONMENTAL ALERTS</Text>
          {hazards.length ? hazards.map((hazard) => <View key={`${hazard.id}-${hazard.day.date}`} style={[sheetStyles.threat, hazard.severity === 'high' && sheetStyles.threatHigh]}>
            <View style={sheetStyles.threatTop}><View style={[sheetStyles.threatIcon, hazard.severity === 'high' ? { backgroundColor: '#FCE0DC' } : { backgroundColor: colors.warningBg }]}><MaterialCommunityIcons name={hazard.icon} size={21} color={hazard.severity === 'high' ? colors.error : colors.warning} /></View><View style={sheetStyles.flex}><Text style={sheetStyles.threatTitle}>{hazard.title}</Text><Text style={sheetStyles.threatDetail}>{hazard.detail}</Text></View></View>
            <View style={sheetStyles.threatAction}><MaterialCommunityIcons name="arrow-right-circle-outline" size={17} color={colors.primary} /><Text style={sheetStyles.threatActionText}>{hazard.action}</Text></View>
          </View>) : <View style={sheetStyles.clear}><MaterialCommunityIcons name="shield-check-outline" size={32} color={colors.primary} /><Text style={sheetStyles.clearTitle}>No major environmental threats</Text><Text style={sheetStyles.clearText}>Conditions for this day look manageable. Continue checking daily — forecasts can change.</Text></View>}
          <Text style={sheetStyles.footnote}>Erosion risk is estimated from forecast rainfall and SoilGrids topsoil texture — slope, ground cover, and drainage change the real risk.</Text>
          <Pressable style={sheetStyles.close} onPress={onClose}><MaterialCommunityIcons name="close" size={16} color="#FFF" /><Text style={sheetStyles.closeText}>Close</Text></Pressable>
        </ScrollView> : null}
      </View>
    </View>
  </Modal>;
}

function SmallMetric({ label, value }: { label: string; value: string }) { return <View style={styles.smallMetric}><Text style={styles.smallMetricLabel}>{label}</Text><Text style={styles.smallMetricValue}>{value}</Text></View>; }

function Metric({ icon, value, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string }) { return <View style={styles.metric}><MaterialCommunityIcons name={icon} size={20} color={colors.primary} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 110 }, eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 }, location: { fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 3 }, updated: { color: colors.muted, marginTop: 4, marginBottom: 14, fontSize: 12 }, loader: { marginTop: 60 }, error: { color: colors.error, textAlign: 'center' }, hero: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }, now: { color: '#C9DDCE', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, temp: { fontSize: 60, lineHeight: 66, color: '#FFF', fontWeight: '300' }, condition: { color: '#FFF', fontWeight: '800', fontSize: 17 }, feels: { color: '#C9DDCE', marginTop: 3 }, todayLine: { color: '#C9DDCE', fontSize: 11, fontWeight: '700', marginTop: 6 }, metrics: { width: '100%', borderTopWidth: 1, borderTopColor: '#477657', marginTop: 18, paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between' }, metric: { alignItems: 'center', flex: 1 }, metricValue: { color: '#FFF', fontWeight: '800', marginTop: 3 }, metricLabel: { color: '#C9DDCE', fontSize: 11, marginTop: 2 }, sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 22, marginBottom: 10 }, calendar: { padding: 14 }, calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, monthButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F1F3EF', alignItems: 'center', justifyContent: 'center' }, calendarTitle: { color: colors.text, fontWeight: '900', fontSize: 16, textAlign: 'center' }, calendarHint: { color: colors.muted, fontSize: 9, marginTop: 2, textAlign: 'center' }, weekRow: { flexDirection: 'row', marginTop: 16 }, weekDay: { width: '14.285%', textAlign: 'center', color: colors.muted, fontSize: 10, fontWeight: '900' }, dateGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }, dateCell: { width: '14.285%', height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, dateAvailable: { backgroundColor: colors.primarySoft }, dateSelected: { backgroundColor: colors.primary }, dateToday: { borderWidth: 1, borderColor: colors.accent }, dateText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, dateAvailableText: { color: colors.primaryDark, fontWeight: '900' }, dateSelectedText: { color: '#FFF' }, forecastDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 }, forecastDotSelected: { backgroundColor: '#FFF' }, selectedForecast: { marginTop: 9 }, selectedForecastTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, selectedDate: { color: colors.text, fontWeight: '900', fontSize: 15 }, selectedCondition: { color: colors.muted, marginTop: 3 }, selectedMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }, smallMetric: { width: '48%', backgroundColor: '#F3F5F1', borderRadius: 10, padding: 10 }, smallMetricLabel: { color: colors.muted, fontSize: 9 }, smallMetricValue: { color: colors.text, fontWeight: '900', marginTop: 3, fontSize: 12 }, unavailable: { flexDirection: 'row', gap: 10, alignItems: 'center' }, unavailableTitle: { color: colors.text, fontWeight: '900' }, unavailableText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, dayCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 15, width: 224 }, dayCardPressed: { opacity: 0.85 }, dayCardToday: { borderColor: colors.primary, borderWidth: 1.5 }, dayHeading: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.3 }, dayBody: { flexDirection: 'row', alignItems: 'center', marginTop: 12 }, dayCondWrap: { flex: 1, marginLeft: 13 }, dayCond: { color: colors.text, fontWeight: '800', fontSize: 16 }, dayRainLine: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 15 }, dayTemps: { alignItems: 'flex-end', marginLeft: 8 }, dayHigh: { color: colors.text, fontSize: 32, lineHeight: 34, fontWeight: '800' }, dayLow: { color: colors.muted, fontSize: 15, fontWeight: '700', marginTop: 3 }, dayDivider: { height: 1, backgroundColor: colors.border, marginVertical: 13 }, dayInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, dayInfoItem: { flex: 1, alignItems: 'center' }, dayInfoTop: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dayInfoValue: { fontSize: 13, fontWeight: '900', textAlign: 'center' }, dayInfoLabel: { color: colors.muted, fontSize: 9, marginTop: 4, textAlign: 'center' }, advice: { flexDirection: 'row', gap: 13 }, adviceIcon: { backgroundColor: colors.primarySoft, borderRadius: 12, padding: 10, alignSelf: 'flex-start' }, adviceTitle: { fontWeight: '900', color: colors.text, fontSize: 16 }, adviceText: { color: colors.muted, lineHeight: 20, marginTop: 4 }, flex: { flex: 1 }, soilTitle: { fontWeight: '900', fontSize: 16, color: colors.text }, soilText: { color: colors.muted, marginTop: 6 }, source: { color: colors.muted, fontSize: 11, marginTop: 10, fontStyle: 'italic' }, carousel: { gap: 12, paddingRight: 8 }, tapHint: { color: colors.muted, fontSize: 11, marginTop: 9 }, dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, dayMore: { width: 22, height: 22, borderRadius: 7, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' } });
const sheetStyles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(12, 24, 17, 0.5)', justifyContent: 'flex-end' }, dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxHeight: '90%' }, handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 }, x: { position: 'absolute', top: 16, right: 16, zIndex: 2, width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F3EF', alignItems: 'center', justifyContent: 'center' }, scroll: { paddingBottom: 8 }, flex: { flex: 1 }, head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }, iconCircle: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, date: { color: colors.text, fontWeight: '900', fontSize: 17 }, cond: { color: colors.muted, marginTop: 3, fontWeight: '600' }, tempBlock: { alignItems: 'flex-end', marginLeft: 'auto' }, high: { color: colors.text, fontWeight: '800', fontSize: 34, lineHeight: 36 }, low: { color: colors.muted, fontWeight: '700', fontSize: 15 }, quickRow: { flexDirection: 'row', marginTop: 18, gap: 8 }, quickItem: { flex: 1, backgroundColor: '#F3F5F1', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' }, quickValue: { color: colors.text, fontWeight: '900', fontSize: 12, marginTop: 5, textAlign: 'center' }, quickLabel: { color: colors.muted, fontSize: 8, marginTop: 2, textAlign: 'center' }, sectionLabel: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 22, marginBottom: 9 }, locCard: { backgroundColor: '#F7FAF7', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 }, locRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, locPlace: { color: colors.text, fontWeight: '900', fontSize: 16, flex: 1 }, locSub: { color: colors.muted, fontSize: 12, marginTop: 5, marginLeft: 28 }, locDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 }, statsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, stat: { width: '47%', backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 9 }, statHead: { flexDirection: 'row', alignItems: 'center', gap: 5 }, statValue: { color: colors.text, fontWeight: '800', fontSize: 12, flexShrink: 1 }, statLabel: { color: colors.muted, fontSize: 8, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }, threat: { backgroundColor: colors.warningBg, borderRadius: 14, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: '#F0DEB2' }, threatHigh: { backgroundColor: '#FDEDEA', borderColor: '#EDC5BF' }, threatTop: { flexDirection: 'row', gap: 10 }, threatIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, threatTitle: { color: colors.text, fontWeight: '900', fontSize: 14, flex: 1 }, threatDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }, threatAction: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.6)', padding: 9, borderRadius: 10 }, threatActionText: { color: colors.primaryDark, fontSize: 12, lineHeight: 17, flex: 1, fontWeight: '600' }, clear: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 14, padding: 18 }, clearTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 8, textAlign: 'center' }, clearText: { color: colors.muted, textAlign: 'center', lineHeight: 19, marginTop: 4, fontSize: 12 }, footnote: { color: colors.muted, fontSize: 10, fontStyle: 'italic', lineHeight: 15, marginTop: 4 }, close: { marginTop: 18, height: 48, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, closeText: { color: '#FFF', fontWeight: '900', fontSize: 15 } });
