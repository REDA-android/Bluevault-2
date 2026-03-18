export interface ExifData {
  lat?: number;
  lng?: number;
  altitude?: number;
  datetime?: string;
  cameraMake?: string;
  cameraModel?: string;
  width?: number;
  height?: number;
}

export interface GeoData {
  display?: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface Photo {
  data: string;
  type: string;
  exif?: ExifData | null;
  geo?: GeoData | null;
}

export interface Variety {
  id: string; // Used locally, maps to doc id
  uid: string;
  name: string;
  species?: string;
  breeder?: string;
  site?: string;
  flowering_date?: string;
  maturity_date?: string;
  precocity?: string;
  fruit_size?: number;
  color?: string;
  bloom?: string;
  fruit_shape?: string;
  brix?: number;
  firmness?: string;
  acidity?: string;
  aroma?: string;
  vigor?: string;
  habit?: string;
  yield_estimate?: number;
  harvest_start?: number; // Month 1-12
  harvest_end?: number;   // Month 1-12
  synonyms?: string;
  experimental_code?: string;
  scientific_name?: string;
  origin_country?: string;
  legal_status?: string;
  
  // Morphological - Stem
  stem_color?: string;
  stem_thickness?: string;
  stem_internode_length?: string;
  stem_hairiness?: string;
  
  // Morphological - Leaf
  leaf_blade_shape?: string;
  leaf_margin_type?: string;
  leaf_blistering?: string;
  
  // Morphological - Flower
  flower_petal_color?: string;
  flower_full_bloom_time?: string;
  flower_inflorescence_type?: string;
  
  // Morphological - Harvest Organ
  harvest_organ_shape?: string;
  harvest_organ_size?: string;
  harvest_organ_skin_color?: string;
  harvest_organ_flesh_color?: string;
  harvest_organ_texture?: string;

  // Agronomic
  biotic_resistances?: string;
  abiotic_tolerances?: string;
  conservation_aptitude?: string;

  status?: 'active' | 'trial' | 'archived';
  rating?: number; // 1-5
  hardiness_zone?: string;
  sweetness_score?: number; // 1-5
  acidity_score?: number; // 1-5
  firmness_score?: number; // 1-5
  size_score?: number; // 1-5
  aroma_score?: number; // 1-5
  sensitivities?: string;
  free_notes?: string;
  photos?: string; // JSON string of Photo[]
  ai_analysis?: string; // JSON string
  createdAt?: number;
  updatedAt?: number;
}
