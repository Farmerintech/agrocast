import { Feature, FeatureHub } from './FeatureHub';
import { FarmLocation, Loadable, RainfallData, SoilData, WeatherData } from './types';
import { CropPlanner, CropRecommendation, PlantingCalendar } from './CropAnalysis';
import { EnvironmentalAlerts } from './EnvironmentalAlerts';
import { PestDiseaseGuide } from './PestDiseaseGuide';

export function CropsScreen({ location, weather, rainfall, soil, onNestedChange }: { location: FarmLocation | null; weather: Loadable<WeatherData>; rainfall: Loadable<RainfallData>; soil: Loadable<SoilData>; onNestedChange?: (nested: boolean) => void }) {
  const temp = weather.data?.current.temperature ?? 27;
  const nextRain = weather.data?.daily.slice(0, 3).reduce((sum, day) => sum + day.precipitation, 0) ?? 0;
  const wet = nextRain >= 8;
  const texture = soil.data?.texture ?? 'local';
  const features: Feature[] = [
    { id: 'recommend', title: 'Crop recommendations', subtitle: 'Crops suited to your season and conditions', icon: 'sprout-outline', customContent: <CropRecommendation weather={weather.data} soil={soil.data} />, content: [
      { heading: wet ? 'Rain-fed crops look promising' : 'Choose drought-tolerant options', body: wet ? `About ${nextRain.toFixed(0)} mm is forecast over the next three days. Maize, vegetables, and legumes may benefit where the season is established.` : 'Rain is limited in the short-term outlook. Consider cowpea, millet, sorghum, or irrigated vegetables.', icon: 'weather-rainy' },
      { heading: `${texture} soil context`, body: 'Match crop choice with drainage, soil depth, and what has performed well on nearby farms. Recommendations are guidance, not a soil test.', icon: 'terrain' },
    ]},
    { id: 'calendar', title: 'Planting calendar', subtitle: 'Plan planting, field work, and harvest windows', icon: 'calendar-month-outline', customContent: <PlantingCalendar location={location!} weather={weather.data} />, content: [
      { heading: 'Prepare before reliable rains', body: 'Clear fields, repair drainage, source seed, and test germination before the main planting window.', icon: 'shovel' },
      { heading: 'Plant into moisture', body: 'Prefer planting after useful rainfall has moistened the root zone—not after a single light shower.', icon: 'seed-outline' },
      { heading: 'Record your planting date', body: 'Keeping the date helps estimate fertilizer timing, scouting stages, and harvest readiness.', icon: 'notebook-edit-outline' },
    ]},
    { id: 'irrigation', title: 'Irrigation advice', subtitle: 'Know when watering may be needed', icon: 'watering-can-outline', color: '#2E78A6', badge: wet ? 'RAIN AHEAD' : 'CHECK SOIL', customContent: <CropPlanner mode="irrigation" weather={weather.data} soil={soil.data} />, content: [
      { heading: wet ? 'Delay routine irrigation' : 'Inspect root-zone moisture', body: wet ? 'Useful rain is forecast. Avoid watering immediately unless crops are visibly stressed or protected from rainfall.' : 'Little rain is expected. Check moisture 5–10 cm below the surface before irrigating.', icon: 'water-outline' },
      { heading: 'Water early or late', body: 'Reduce evaporation by irrigating in the early morning or late afternoon, and focus water near the roots.', icon: 'clock-outline' },
    ]},
    { id: 'alerts', title: 'Weather alerts', subtitle: 'Seven-day environmental hazard outlook', icon: 'alert-outline', color: '#C06B2B', badge: temp >= 35 ? 'HEAT' : undefined, customContent: <EnvironmentalAlerts weather={weather.data} soil={soil.data} />, content: [
      { heading: temp >= 35 ? 'High heat risk' : 'No severe heat signal now', body: temp >= 35 ? `Current temperature is around ${temp.toFixed(0)}°C. Protect seedlings, water carefully, and avoid midday spraying.` : 'Continue monitoring the forecast. Alerts are derived from the latest locally saved weather.', icon: 'thermometer-alert' },
      { heading: wet ? 'Rainfall precautions' : 'Dry-spell precautions', body: wet ? 'Clear drainage channels and keep fertilizer or chemicals protected from runoff.' : 'Mulch where practical, control weeds, and prioritize water for young or flowering crops.', icon: wet ? 'weather-pouring' : 'weather-sunny-alert' },
    ]},
    { id: 'pests', title: 'Pest & disease risk', subtitle: 'Symptoms, risk, prevention, and management', icon: 'bug-outline', color: '#8B5A3C', customContent: <PestDiseaseGuide weather={weather.data} />, content: [
      { heading: wet ? 'Higher fungal-disease pressure' : 'Watch for dry-weather pests', body: wet ? 'Warm, wet conditions can favor leaf spots, blights, and rots. Scout dense or poorly drained areas first.' : 'Dry conditions may favor mites, aphids, and some borers. Check leaf undersides and stressed plants.', icon: 'magnify' },
      { heading: 'Scout before treating', body: 'Identify the problem and damage level before using pesticides. Follow local labels and extension advice.', icon: 'shield-check-outline' },
    ]},
    { id: 'fertilizer', title: 'Fertilizer guide', subtitle: 'Timing guidance for crop nutrition', icon: 'flask-outline', customContent: <CropPlanner mode="fertilizer" weather={weather.data} soil={soil.data} />, content: [
      { heading: 'Use a soil test where possible', body: `SoilGrids suggests ${texture.toLowerCase()} topsoil, but a field soil test is the best basis for exact rates.`, icon: 'test-tube' },
      { heading: wet ? 'Avoid application before heavy rain' : 'Apply only with enough moisture', body: wet ? 'Heavy rain can wash nutrients away. Split applications and avoid waterlogged ground.' : 'Fertilizer can burn crops or remain unavailable in very dry soil. Time application with moisture.', icon: 'leaf-circle-outline' },
    ]},
    { id: 'harvest', title: 'Harvest readiness', subtitle: 'Estimate maturity and harvest timing', icon: 'basket-outline', customContent: <CropPlanner mode="harvest" weather={weather.data} soil={soil.data} />, content: [
      { heading: 'Use crop age and field signs', body: 'Record the planting date and variety maturity days, then confirm readiness using grain, pod, fruit, or leaf indicators.', icon: 'calendar-clock' },
      { heading: 'Check the harvest forecast', body: 'Where possible, choose a dry harvest window and prepare clean storage before produce leaves the field.', icon: 'weather-sunny' },
    ]},
    { id: 'risk', title: 'Climate risk score', subtitle: 'A simple suitability snapshot', icon: 'gauge', color: '#6C63A8', customContent: <CropPlanner mode="risk" weather={weather.data} soil={soil.data} />, content: [
      { heading: wet && temp < 35 ? 'Current risk: moderate to low' : 'Current risk: moderate', body: `This snapshot considers short-term rain (${nextRain.toFixed(0)} mm), temperature (${temp.toFixed(0)}°C), and available climate context. Select a crop and planting date in a future update for a crop-specific score.`, icon: 'chart-timeline-variant' },
      { heading: 'Use it as a warning signal', body: 'Climate risk does not replace local experience, field inspection, or extension guidance.', icon: 'information-outline' },
    ]},
  ];
  return <FeatureHub title="Crop planner" subtitle="Practical guidance based on your saved farm conditions." features={features} locationReady={Boolean(location)} onNestedChange={onNestedChange} />;
}
