import { SoilData, WeatherData } from './types';

export type NigeriaZone = 'south' | 'central' | 'north';
export type CropProfile = { id: string; name: string; minTemp: number; maxTemp: number; rainNeed: number; maturityDays: number; soils: string[]; plantingTip: string; fertilizerTip: string; plantingMonths: Record<NigeriaZone, number[]> };

const months = (south: number[], central: number[], north: number[]) => ({ south, central, north });

export const crops: CropProfile[] = [
  { id: 'maize', name: 'Maize', minTemp: 18, maxTemp: 32, rainNeed: 18, maturityDays: 105, soils: ['Sandy', 'Silty'], plantingTip: 'Plant when the root zone is moist and rains appear established.', fertilizerTip: 'Split nitrogen: an early dose and a top-dress during rapid growth.', plantingMonths: months([3,4,5,8,9], [4,5,6,7], [5,6,7]) },
  { id: 'cassava', name: 'Cassava', minTemp: 20, maxTemp: 35, rainNeed: 10, maturityDays: 300, soils: ['Sandy', 'Silty', 'Clay-rich'], plantingTip: 'Plant healthy stem cuttings into moist, well-drained soil.', fertilizerTip: 'Prioritize potassium where soils are depleted; avoid excessive nitrogen.', plantingMonths: months([3,4,5,6,7,8,9], [4,5,6,7], [5,6,7]) },
  { id: 'yam', name: 'Yam', minTemp: 20, maxTemp: 34, rainNeed: 15, maturityDays: 240, soils: ['Sandy', 'Silty'], plantingTip: 'Plant setts in fertile, loose mounds or ridges near the onset of rains.', fertilizerTip: 'Use well-decomposed organic matter and balanced nutrients guided by soil testing.', plantingMonths: months([11,12,1,2,3], [2,3,4], [4,5]) },
  { id: 'cowpea', name: 'Cowpea', minTemp: 20, maxTemp: 35, rainNeed: 8, maturityDays: 75, soils: ['Sandy', 'Silty'], plantingTip: 'Suitable for shorter or less reliable rainy windows.', fertilizerTip: 'Avoid heavy nitrogen; phosphorus may support rooting and nodulation.', plantingMonths: months([3,4,8,9], [5,6,7,8], [6,7,8]) },
  { id: 'rice', name: 'Rice', minTemp: 20, maxTemp: 35, rainNeed: 30, maturityDays: 120, soils: ['Clay-rich', 'Silty'], plantingTip: 'Lowland rice needs dependable water; upland rice needs established rainfall.', fertilizerTip: 'Use split nitrogen applications and avoid applying before heavy rain.', plantingMonths: months([3,4,5,8,9], [4,5,6], [5,6,7]) },
  { id: 'sorghum', name: 'Sorghum', minTemp: 21, maxTemp: 38, rainNeed: 7, maturityDays: 110, soils: ['Sandy', 'Silty', 'Clay-rich'], plantingTip: 'A strong option where rainfall is limited or uncertain.', fertilizerTip: 'Apply modest, split nutrients away from direct seed contact.', plantingMonths: months([4,5,8], [5,6,7], [6,7]) },
  { id: 'millet', name: 'Millet', minTemp: 22, maxTemp: 40, rainNeed: 5, maturityDays: 90, soils: ['Sandy'], plantingTip: 'Plant with established rains; millet tolerates lighter, drier soils.', fertilizerTip: 'Use modest fertilizer rates and prioritize phosphorus where deficient.', plantingMonths: months([4,5], [5,6,7], [6,7]) },
  { id: 'groundnut', name: 'Groundnut', minTemp: 20, maxTemp: 34, rainNeed: 10, maturityDays: 110, soils: ['Sandy', 'Silty'], plantingTip: 'Plant in loose, well-drained soil after dependable rainfall begins.', fertilizerTip: 'Calcium around pegging and phosphorus at establishment may be important.', plantingMonths: months([3,4,8,9], [5,6,7], [5,6,7]) },
  { id: 'soybean', name: 'Soybean', minTemp: 20, maxTemp: 34, rainNeed: 12, maturityDays: 105, soils: ['Sandy', 'Silty'], plantingTip: 'Plant with established rains and use suitable inoculant where recommended.', fertilizerTip: 'Avoid unnecessary nitrogen; phosphorus and potassium depend on soil status.', plantingMonths: months([4,5,6], [5,6,7], [6,7]) },
  { id: 'tomato', name: 'Tomato', minTemp: 18, maxTemp: 30, rainNeed: 15, maturityDays: 90, soils: ['Sandy', 'Silty'], plantingTip: 'Transplant into moist soil and ensure drainage during wet periods.', fertilizerTip: 'Use balanced nutrition early, then adequate potassium during fruiting.', plantingMonths: months([9,10,11,12,1,2], [10,11,12,1,2,3], [10,11,12,1,2]) },
  { id: 'pepper', name: 'Pepper', minTemp: 20, maxTemp: 32, rainNeed: 12, maturityDays: 100, soils: ['Sandy', 'Silty'], plantingTip: 'Raise healthy seedlings and transplant when moisture is dependable.', fertilizerTip: 'Use balanced nutrition and split applications through flowering and fruit set.', plantingMonths: months([3,4,8,9,10], [4,5,8,9], [5,6,7]) },
  { id: 'okra', name: 'Okra', minTemp: 22, maxTemp: 35, rainNeed: 10, maturityDays: 55, soils: ['Sandy', 'Silty'], plantingTip: 'Direct-seed into warm, moist, well-drained soil.', fertilizerTip: 'Avoid excessive nitrogen, which can produce leaves at the expense of pods.', plantingMonths: months([3,4,5,8,9], [4,5,6,7], [5,6,7]) },
  { id: 'plantain', name: 'Plantain', minTemp: 22, maxTemp: 32, rainNeed: 25, maturityDays: 330, soils: ['Silty', 'Clay-rich'], plantingTip: 'Plant healthy suckers at the start of sustained rains with good drainage.', fertilizerTip: 'Plantain needs strong potassium supply and benefits from organic mulch.', plantingMonths: months([3,4,5,6,7,8,9], [4,5,6,7], [5,6]) },
  { id: 'cocoyam', name: 'Cocoyam', minTemp: 21, maxTemp: 32, rainNeed: 20, maturityDays: 240, soils: ['Silty', 'Clay-rich'], plantingTip: 'Plant in moist, fertile soil where waterlogging can be controlled.', fertilizerTip: 'Organic matter and balanced nutrients support corm development.', plantingMonths: months([3,4,5,6], [4,5,6], [5,6]) },
];

export function cropScore(crop: CropProfile, weather: WeatherData | null, soil: SoilData | null) {
  if (!weather) return 50;
  const temp = weather.current.temperature;
  const rain = weather.daily.slice(0, 7).reduce((sum, day) => sum + day.precipitation, 0);
  const tempScore = temp >= crop.minTemp && temp <= crop.maxTemp ? 45 : Math.max(5, 45 - Math.min(Math.abs(temp - crop.minTemp), Math.abs(temp - crop.maxTemp)) * 5);
  const rainRatio = Math.min(rain / crop.rainNeed, crop.rainNeed / Math.max(rain, 1));
  const rainScore = Math.max(5, 35 * rainRatio);
  const soilScore = !soil || soil.texture === 'Unknown' ? 10 : crop.soils.includes(soil.texture) ? 20 : 8;
  return Math.round(Math.min(100, tempScore + rainScore + soilScore));
}

export function riskLabel(score: number) { return score >= 80 ? 'Low risk' : score >= 60 ? 'Moderate risk' : 'High risk'; }

export function nigeriaZone(latitude: number): NigeriaZone { return latitude >= 9 ? 'north' : latitude >= 7 ? 'central' : 'south'; }

export function irrigationGuide(crop: CropProfile) {
  const rootCrop = ['cassava', 'yam', 'groundnut', 'cocoyam'].includes(crop.id);
  const vegetable = ['tomato', 'pepper', 'okra'].includes(crop.id);
  const waterHeavy = ['rice', 'plantain'].includes(crop.id);
  return [
    { title: 'Check before watering', text: `Inspect soil moisture about ${vegetable ? '5-10' : '10-15'} cm deep. Water when the root zone is becoming dry, not only because the surface looks dry.`, icon: 'hand-water' as const },
    { title: waterHeavy ? 'Maintain dependable moisture' : 'Apply slowly at the root zone', text: crop.id === 'rice' ? 'For lowland rice, manage shallow water according to crop stage and local practice; avoid uncontrolled deep flooding.' : `Use basins, furrows, drip lines, or a watering can close to the ${rootCrop ? 'ridge or mound' : 'plant base'}. Stop before runoff begins.`, icon: 'watering-can-outline' as const },
    { title: 'Best application time', text: 'Water early in the morning or late afternoon. Avoid wetting leaves overnight where fungal disease pressure is high.', icon: 'clock-outline' as const },
  ];
}

export function fertilizerGuide(crop: CropProfile) {
  const legume = ['cowpea', 'groundnut', 'soybean'].includes(crop.id);
  const rootCrop = ['cassava', 'yam', 'cocoyam'].includes(crop.id);
  return [
    { title: 'Choose the right input', text: legume ? 'Legumes usually need little starter nitrogen. Prioritize inoculation where appropriate and use soil-test guidance for phosphorus, potassium, and calcium.' : crop.fertilizerTip, icon: 'flask-outline' as const },
    { title: 'Place it safely', text: rootCrop ? 'Band fertilizer beside the mound or ridge, away from direct contact with planting material, then cover lightly with soil.' : 'Place fertilizer in a small band or ring away from the stem and seed. Never leave concentrated fertilizer touching roots, seed, or leaves.', icon: 'sprout-outline' as const },
    { title: 'Split the application', text: legume ? 'Apply required basal nutrients at planting or early establishment. Avoid unnecessary late nitrogen.' : 'Apply part during establishment and the remainder during active growth. Split applications reduce losses and crop burn.', icon: 'timeline-clock-outline' as const },
    { title: 'Check weather and moisture', text: 'Apply to moist, non-waterlogged soil. Avoid very dry ground and do not apply immediately before heavy rainfall.', icon: 'weather-partly-rainy' as const },
  ];
}
