import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import exifr from "exifr";

let aiClient: GoogleGenAI | null = null;
export function getAI(): GoogleGenAI {
  if (!aiClient) {
    // In AI Studio Build, the key is provided via process.env.GEMINI_API_KEY
    // which is defined in vite.config.ts
    const key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!key) {
      throw new Error('La clé API Gemini est manquante. Si vous êtes dans AI Studio, elle devrait être injectée automatiquement. Sinon, veuillez configurer GEMINI_API_KEY dans vos secrets ou variables d\'environnement.');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export async function extractExif(file: File): Promise<any> {
  try {
    const data = await exifr.parse(file, true);
    if (!data) return null;
    const out: any = {};
    if (data.latitude != null) out.lat = data.latitude;
    if (data.longitude != null) out.lng = data.longitude;
    if (data.GPSAltitude != null) out.altitude = Math.round(data.GPSAltitude);
    if (data.DateTimeOriginal) out.datetime = data.DateTimeOriginal.toISOString();
    if (data.Make) out.cameraMake = data.Make;
    if (data.Model) out.cameraModel = data.Model;
    if (data.ExifImageWidth) out.width = data.ExifImageWidth;
    if (data.ExifImageHeight) out.height = data.ExifImageHeight;
    return Object.keys(out).length ? out : null;
  } catch (e) {
    console.error("EXIF extraction error", e);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`;
    const r = await fetch(url, { headers: { "User-Agent": "BlueVault-LDA/1.0" } });
    const d = await r.json();
    return {
      display: d.display_name,
      city:    d.address?.city || d.address?.town || d.address?.village || d.address?.hamlet,
      region:  d.address?.state,
      country: d.address?.country,
    };
  } catch { return null; }
}

export function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
