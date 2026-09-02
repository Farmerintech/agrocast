import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { WeatherData, WeatherDay } from './types';

type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null = null;
async function getNotifications() {
  if (Constants.appOwnership === 'expo') return null;
  if (!notificationsModule) notificationsModule = await import('expo-notifications');
  notificationsModule.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }) });
  return notificationsModule;
}

export async function configureNotifications() {
  if (Constants.appOwnership === 'expo') return false;
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('farm-weather', { name: 'Farm weather', importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 250, 200, 250], lightColor: '#28643B' });
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return (await Notifications.requestPermissionsAsync()).status === 'granted';
  return true;
}

function dayAdvice(day: WeatherDay) {
  if (day.precipitation >= 25) return 'Heavy rain is possible. Check drainage and delay fertilizer or spraying.';
  if (day.apparentTemperatureMax >= 35) return 'Heat is expected. Work early, protect young crops, and check soil moisture.';
  if (day.precipitation <= 1) return 'Mostly dry today. Scout crops and check moisture before irrigation.';
  return 'Moderate conditions today. Scout your crops and complete priority field work early.';
}

export async function scheduleFarmNotifications(weather: WeatherData | null) {
  if (Constants.appOwnership === 'expo') return false;
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const enabled = await configureNotifications();
  if (!enabled) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Daily morning outlooks. Give each forecast day its own one-shot notification
  // that fires at 07:00 ON that day, so the body always matches the morning it
  // arrives. A single repeating DAILY trigger cannot do this: expo replays the
  // same baked text on every occurrence, so an outlook composed in the evening
  // (when daily[0] means "today") arrives the next morning describing yesterday.
  const now = new Date();
  let outlooks = 0;
  for (const day of weather?.daily ?? []) {
    const fireAt = new Date(`${day.date}T07:00:00`);
    if (fireAt.getTime() - now.getTime() < 60_000) continue; // this day's 07:00 already passed
    await Notifications.scheduleNotificationAsync({ content: { title: 'AgroCast morning outlook', body: `${Math.round(day.temperatureMax)}°C, ${Math.round(day.precipitationProbability)}% rain today. ${dayAdvice(day)}`, data: { type: 'daily-weather', date: day.date }, sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: 'farm-weather' } });
    outlooks += 1;
  }
  // No forecast available (or every scheduled time had already passed): fall back to a
  // plain repeating nudge whose text stays true no matter which day it fires on.
  if (outlooks === 0) await Notifications.scheduleNotificationAsync({ content: { title: 'AgroCast morning outlook', body: 'Open AgroCast to download your latest farm forecast and advice.', data: { type: 'daily-weather' }, sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 7, minute: 0, channelId: 'farm-weather' } });

  const weeklyRain = weather?.daily.slice(0, 7).reduce((sum, day) => sum + day.precipitation, 0) ?? 0;
  await Notifications.scheduleNotificationAsync({ content: { title: 'AgroCast weekly farm plan', body: `${weeklyRain.toFixed(0)} mm of rain is forecast over the next 7 days. Review planting, irrigation, and alerts.`, data: { type: 'weekly-plan' }, sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 7, minute: 15, channelId: 'farm-weather' } });
  await Notifications.scheduleNotificationAsync({ content: { title: 'AgroCast monthly check-in', body: 'Review your planting calendar, crop records, rainfall pattern, and farm costs for the new month.', data: { type: 'monthly-review' }, sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour: 7, minute: 30, channelId: 'farm-weather' } });
  return true;
}
