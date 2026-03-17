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
