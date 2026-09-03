import { Feature, FeatureHub } from './FeatureHub';
import { FarmLocation, Loadable, RainfallData, SoilData, WeatherData } from './types';
import { ProfitEstimator } from './ProfitEstimator';
import { FarmingGuides } from './FarmingGuides';
import { FarmAssistant } from './FarmAssistant';
import { FarmRecords } from './FarmRecords';
import { FieldMappingDemo } from './FieldMappingDemo';
import { MarketPrices } from './MarketPrices';

export function ToolsScreen({ location, weather, rainfall, soil, onNestedChange }: { location: FarmLocation | null; weather: Loadable<WeatherData>; rainfall: Loadable<RainfallData>; soil: Loadable<SoilData>; onNestedChange?: (nested: boolean) => void }) {
  const features: Feature[] = [
    { id: 'guides', title: 'Farming guides', subtitle: 'Searchable, reviewed offline field guides', icon: 'book-open-page-variant-outline', customContent: <FarmingGuides />, content: [
      { heading: 'Land preparation', body: 'Manage residues, minimize erosion, correct drainage problems, and prepare only the area you can plant on time.', icon: 'tractor-variant' },
      { heading: 'Seed and planting', body: 'Use healthy seed, correct spacing and depth, and replace failed stands early.', icon: 'seed-outline' },
      { heading: 'Post-harvest care', body: 'Dry produce to a safe moisture level, sort damaged material, and use clean, dry storage.', icon: 'warehouse' },
    ]},
    { id: 'assistant', title: 'Farm assistant', subtitle: 'Chat with your guides and saved farm data', icon: 'message-processing-outline', color: '#5C6BC0', badge: 'OFFLINE', customContent: <FarmAssistant context={{ location, weather: weather.data, soil: soil.data, rainfall: rainfall.data, cached: weather.isCached }} />, content: [
      { heading: 'Ask common farming questions', body: 'The offline assistant will cover planting, irrigation, crop care, pests, storage, and basic farm economics.', icon: 'chat-question-outline' },
      { heading: 'Online enhancement ready', body: 'When enabled later, online responses can add current market, extension, and location-specific information.', icon: 'creation-outline' },
    ]},
    { id: 'profit', title: 'Cost & profit', subtitle: 'Estimate crop margins before planting', icon: 'calculator-variant-outline', color: '#357A55', customContent: <ProfitEstimator />, content: [
      { heading: 'List every production cost', body: 'Include seed, fertilizer, chemicals, labor, land preparation, irrigation, transport, storage, rent, and finance costs.', icon: 'cash-minus' },
      { heading: 'Estimate conservatively', body: 'Profit = expected yield × realistic farm-gate price − total cost. Test low-price and low-yield scenarios before investing.', icon: 'chart-line' },
    ]},
    { id: 'market', title: 'Market prices', subtitle: 'Forecast commodity prices months ahead', icon: 'chart-line', color: '#B06C25', customContent: <MarketPrices />, content: [] },
    { id: 'fields', title: 'Field mapping', subtitle: 'Offline farm point and plot board', icon: 'map-outline', color: '#2E78A6', customContent: <FieldMappingDemo location={location} />, content: [
      { heading: location?.name ?? 'Current farm', body: location ? `Your main farm point is saved at ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}.` : 'Set a farm location to begin organizing fields.', icon: 'map-marker-outline' },
      { heading: 'Plot boundaries planned', body: 'A future map update can add named fields, boundary area, crop history, and field notes while retaining offline access.', icon: 'vector-polygon' },
    ]},
    { id: 'records', title: 'Farm records', subtitle: 'Save, export, and share your farm ledger', icon: 'clipboard-text-outline', customContent: <FarmRecords />, content: [
      { heading: 'Record key activities', body: 'Capture planting, input application, labor, rainfall observations, scouting, harvest, and sales.', icon: 'pencil-outline' },
      { heading: 'Learn from each season', body: 'Consistent records reveal which crops, fields, practices, and buyers deliver the best results.', icon: 'lightbulb-on-outline' },
    ]},
  ];
  return <FeatureHub title="Farm tools" subtitle="Offline resources for field work and farm business decisions." features={features} onNestedChange={onNestedChange} />;
}
