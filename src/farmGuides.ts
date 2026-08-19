import { MaterialCommunityIcons } from '@expo/vector-icons';

export type GuideArticle = { id: string; title: string; category: string; summary: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; updated: string; steps: { title: string; text: string }[] };

export const farmGuides: GuideArticle[] = [
  { id: 'land', title: 'Prepare land without losing topsoil', category: 'Field setup', summary: 'Drainage, erosion control, residues, ridges, and minimum disturbance.', icon: 'terrain', updated: 'August 2026', steps: [
    { title: 'Walk the field after rain', text: 'Mark where water enters, ponds, and leaves. Keep natural waterways open and stabilize them with vegetation.' },
    { title: 'Keep protective cover', text: 'Retain useful residues or establish cover crops. Bare soil is vulnerable to heat, crusting, and erosion.' },
    { title: 'Match preparation to the crop', text: 'Use ridges or mounds for yam, cassava, and cocoyam where drainage is needed. Avoid repeated deep tillage on fragile soil.' },
    { title: 'Prepare only what you can plant', text: 'Exposed prepared soil loses moisture and nutrients when planting is delayed.' },
  ]},
  { id: 'seed', title: 'Choose seed and establish a good stand', category: 'Planting', summary: 'Healthy seed, germination checks, spacing, depth, and gap filling.', icon: 'seed-outline', updated: 'August 2026', steps: [
    { title: 'Use adapted material', text: 'Choose varieties recommended for the production zone, season length, important diseases, and intended market.' },
    { title: 'Test germination', text: 'Before planting, sprout a counted sample in moist material. Poor germination means seed rate or seed source needs attention.' },
    { title: 'Plant into moisture', text: 'Confirm moisture below the surface. A single light shower may not wet the rooting zone sufficiently.' },
    { title: 'Inspect emergence early', text: 'Check for gaps, crusting, insects, birds, rodents, or waterlogging and replace failed stands promptly.' },
  ]},
  { id: 'soil', title: 'Build and protect soil fertility', category: 'Soil & nutrients', summary: 'Soil testing, organic matter, fertilizer placement, and pH.', icon: 'sprout', updated: 'August 2026', steps: [
    { title: 'Start with a soil test', text: 'A field soil test is more suitable for fertilizer rates than regional map estimates. Sample representative areas separately.' },
    { title: 'Return organic material', text: 'Compost, manure, residues, and cover crops can improve structure and nutrient cycling when properly managed.' },
    { title: 'Place fertilizer safely', text: 'Keep concentrated fertilizer away from seed, stems, and roots. Apply to moist, non-waterlogged soil and cover when recommended.' },
    { title: 'Split mobile nutrients', text: 'Splitting nitrogen and sometimes potassium reduces losses and matches crop demand more closely.' },
  ]},
  { id: 'water', title: 'Irrigate efficiently', category: 'Water', summary: 'Moisture checks, timing, root-zone application, and water conservation.', icon: 'watering-can-outline', updated: 'August 2026', steps: [
    { title: 'Check below the surface', text: 'Inspect soil at rooting depth. The surface can look dry while enough moisture remains below.' },
    { title: 'Apply slowly near roots', text: 'Use drip, basins, furrows, or careful watering so water infiltrates rather than running off.' },
    { title: 'Prioritize sensitive stages', text: 'Establishment, flowering, fruit set, and grain filling are often more sensitive to water stress.' },
    { title: 'Reduce evaporation', text: 'Water early or late, control weeds, use mulch, and repair leaks.' },
  ]},
  { id: 'ipm', title: 'Scout and manage pests safely', category: 'Crop health', summary: 'Field scouting, diagnosis, thresholds, and integrated control.', icon: 'bug-check-outline', updated: 'August 2026', steps: [
    { title: 'Scout systematically', text: 'Walk a W or zigzag pattern and inspect multiple plants from field edges and the interior.' },
    { title: 'Confirm the cause', text: 'Pests, diseases, nutrient problems, herbicide damage, drought, and waterlogging can look similar.' },
    { title: 'Use several control methods', text: 'Combine clean seed, resistant varieties, sanitation, rotation, natural enemies, and mechanical control.' },
    { title: 'Use pesticides as a measured option', text: 'Use only registered products for the crop and problem, follow the label, wear PPE, and observe re-entry and pre-harvest intervals.' },
  ]},
  { id: 'harvest', title: 'Harvest, dry, and store safely', category: 'Post-harvest', summary: 'Maturity checks, drying, sorting, storage hygiene, and loss prevention.', icon: 'warehouse', updated: 'August 2026', steps: [
    { title: 'Confirm maturity', text: 'Use variety age plus field signs such as grain hardness, pod colour, leaf drying, fruit colour, or tuber maturity.' },
    { title: 'Choose a suitable window', text: 'Harvest in dry conditions where possible and avoid leaving mature produce exposed to rain, pests, or theft.' },
    { title: 'Dry correctly', text: 'Dry on a clean raised surface or tarpaulin, not bare soil. Verify safe moisture before sealing grain.' },
    { title: 'Store clean produce', text: 'Sort damaged material, clean stores and containers, prevent moisture entry, and inspect stocks regularly.' },
  ]},
  { id: 'records', title: 'Keep useful farm records', category: 'Farm business', summary: 'Activities, costs, yields, sales, buyers, and seasonal learning.', icon: 'clipboard-text-outline', updated: 'August 2026', steps: [
    { title: 'Record activities promptly', text: 'Capture dates, field, crop, variety, input, rate, labor, weather, and observations.' },
    { title: 'Separate household and farm money', text: 'Track cash and non-cash costs so crop profitability is not overstated.' },
    { title: 'Record quantity and quality sold', text: 'Include rejected produce, transport, commissions, credit sales, and payment dates.' },
    { title: 'Review after the season', text: 'Compare fields and crops to identify what improved yield, cost, quality, and price.' },
  ]},
];
