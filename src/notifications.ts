import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { WeatherData } from './types';

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

function dayAdvice(weather: WeatherData) {
  const today = weather.daily[0];
  if (!today) return 'Check your field and plan the day carefully.';
  if (today.precipitation >= 25) return 'Heavy rain is possible. Check drainage and delay fertilizer or spraying.';
  if (today.apparentTemperatureMax >= 35) return 'Heat is expected. Work early, protect young crops, and check soil moisture.';
  if (today.precipitation <= 1) return 'Mostly dry today. Scout crops and check moisture before irrigation.';
  return 'Moderate conditions today. Scout your crops and complete priority field work early.';
}

export async function scheduleFarmNotifications(weather: WeatherData | null) {
  if (Constants.appOwnership === 'expo') return false;
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const enabled = await configureNotifications();
  if (!enabled) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const dailyBody = weather ? `${Math.round(weather.daily[0]?.temperatureMax ?? 0)}°C today. ${dayAdvice(weather)}` : 'Open AgroCast to download your latest farm forecast and advice.';
  const weeklyRain = weather?.daily.slice(0, 7).reduce((sum, day) => sum + day.precipitation, 0) ?? 0;
  await Notifications.scheduleNotificationAsync({ content: { title: 'AgroCast morning outlook', body: dailyBody, data: { type: 'daily-weather' }, sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 7, minute: 0, channelId: 'farm-weather' } });
  await Notifications.scheduleNotificationAsync({ content: { title: 'AgroCast weekly farm plan', body: `${weeklyRain.toFixed(0)} mm of rain is forecast over the next 7 days. Review planting, irrigation, and alerts.`, data: { type: 'weekly-plan' }, sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 7, minute: 15, channelId: 'farm-weather' } });
  await Notifications.scheduleNotificationAsync({ content: { title: 'AgroCast monthly check-in', body: 'Review your planting calendar, crop records, rainfall pattern, and farm costs for the new month.', data: { type: 'monthly-review' }, sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour: 7, minute: 30, channelId: 'farm-weather' } });
  return true;
}
