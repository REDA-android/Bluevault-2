import { useState, useRef, useCallback, useEffect } from "react";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const STORAGE_KEY = "bluevault:varieties";

// ─── ICONS ──────────────────────────────────────────────────────────────────
const Icon = ({ path, size = 20, color = "currentColor" }: { path: string, size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {path.split(" M").map((p, i) => <path key={i} d={i === 0 ? p : "M" + p} />)}
  </svg>
);
const IC = {
  back:     "M19 12H5M12 19l-7-7 7-7",
  plus:     "M12 5v14M5 12h14",
  camera:   "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  check:    "M20 6L9 17l-5-5",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  search:   "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  grid:     "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  refresh:  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  cloud:    "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",
  info:     "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8h.01M12 12v4",
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── EXIF EXTRACTION ────────────────────────────────────────────────────────
function parseExif(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (view.getUint16(0) !== 0xFFD8) return null;
  let offset = 2;
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset);
    if (marker === 0xFFE1) {
      const exifStr = String.fromCharCode(...new Uint8Array(buffer, offset + 4, 4));
      if (exifStr !== "Exif") break;
      return parseIFD(buffer, offset + 10);
    }
    offset += 2 + view.getUint16(offset + 2);
  }
  return null;
}

function parseIFD(buffer: ArrayBuffer, start: number) {
  const view = new DataView(buffer);
  const littleEndian = view.getUint16(start) === 0x4949;
  const ifdOffset = view.getUint32(start + 4, littleEndian);
  const result: any = {};

  function readRational(off: number) {
    const num = view.getUint32(off, littleEndian);
    const den = view.getUint32(off + 4, littleEndian);
    return den ? num / den : 0;
  }
  function readString(off: number, len: number) {
    return String.fromCharCode(...new Uint8Array(buffer, start + off, len)).replace(/\0/g, "").trim();
  }

  function processIFD(ifdOff: number) {
    const count = view.getUint16(start + ifdOff, littleEndian);
    for (let i = 0; i < count; i++) {
      const base = start + ifdOff + 2 + i * 12;
      const tag = view.getUint16(base, littleEndian);
      const type = view.getUint16(base + 2, littleEndian);
      const cnt  = view.getUint32(base + 4, littleEndian);
      const valOff = view.getUint32(base + 8, littleEndian);

      // GPS sub-IFD
      if (tag === 0x8825) { processIFD(valOff); continue; }

      try {
        if (tag === 0x0001) result.GPSLatitudeRef = readString(base + 8, 1);      // N/S
        if (tag === 0x0002 && type === 5) {                                         // GPSLatitude
          const o = start + valOff;
          result.GPSLatitude = readRational(o) + readRational(o+8)/60 + readRational(o+16)/3600;
        }
        if (tag === 0x0003) result.GPSLongitudeRef = readString(base + 8, 1);     // E/W
        if (tag === 0x0004 && type === 5) {                                         // GPSLongitude
          const o = start + valOff;
          result.GPSLongitude = readRational(o) + readRational(o+8)/60 + readRational(o+16)/3600;
        }
        if (tag === 0x0006 && type === 5) result.GPSAltitude = readRational(start + valOff); // Altitude
        if (tag === 0x0010) result.GPSImgDirection = view.getUint16(base + 8, littleEndian);
        if (tag === 0x9003 || tag === 0x0132) {                                     // DateTimeOriginal
          result.DateTime = readString(valOff, 20);
        }
        if (tag === 0xA002) result.PixelXDimension = view.getUint32(base + 8, littleEndian);
        if (tag === 0xA003) result.PixelYDimension = view.getUint32(base + 8, littleEndian);
        if (tag === 0x010F) result.Make  = readString(valOff, Math.min(cnt, 32));  // Camera make
        if (tag === 0x0110) result.Model = readString(valOff, Math.min(cnt, 32));  // Camera model
      } catch {}
    }
  }
  try { processIFD(ifdOffset); } catch {}
  return result;
}

async function extractExif(file: File): Promise<any> {
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const raw = parseExif(e.target?.result as ArrayBuffer);
        if (!raw) return res(null);
        const out: any = {};
        if (raw.GPSLatitude != null) {
          out.lat = raw.GPSLatitudeRef === "S" ? -raw.GPSLatitude : raw.GPSLatitude;
          out.lng = raw.GPSLongitudeRef === "W" ? -raw.GPSLongitude : raw.GPSLongitude;
        }
        if (raw.GPSAltitude != null) out.altitude = Math.round(raw.GPSAltitude);
        if (raw.DateTime)    out.datetime = raw.DateTime;
        if (raw.Make)        out.cameraMake  = raw.Make;
        if (raw.Model)       out.cameraModel = raw.Model;
        if (raw.PixelXDimension) out.width  = raw.PixelXDimension;
        if (raw.PixelYDimension) out.height = raw.PixelYDimension;
        res(Object.keys(out).length ? out : null);
      } catch { res(null); }
    };
    reader.onerror = () => res(null);
    reader.readAsArrayBuffer(file);
  });
}

async function reverseGeocode(lat: number, lng: number) {
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

// ─── STORAGE LAYER ──────────────────────────────────────────────────────────
async function storageLoad() {
  try {
    const result = localStorage.getItem(STORAGE_KEY);
    return result ? JSON.parse(result) : [];
  } catch {
    return [];
  }
}
async function storageSave(data: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// ─── GEMINI AI ──────────────────────────────────────────────────────────────
async function analyzeWithGemini(variety: any) {
  const parts: any[] = [];
  for (const p of (variety.photos || []).slice(0, 3)) {
    parts.push({
      inlineData: {
        data: p.data,
        mimeType: p.type,
      }
    });
  }

  // Build EXIF geo context
  const geoLines = [];
  if (variety.exif_location?.lat != null)
    geoLines.push(`- GPS photo: ${variety.exif_location.lat.toFixed(5)}, ${variety.exif_location.lng.toFixed(5)}${variety.exif_location.altitude != null ? ` · altitude ${variety.exif_location.altitude}m` : ""}`);
  if (variety.exif_city)
    geoLines.push(`- Localisation photo: ${[variety.exif_city, variety.exif_region, variety.exif_country].filter(Boolean).join(", ")}`);
  if (variety.exif_datetime)
    geoLines.push(`- Date/heure prise de vue: ${variety.exif_datetime}`);
  if (variety.exif_camera)
    geoLines.push(`- Appareil photo: ${variety.exif_camera}`);
  // Photo-level EXIF
  const photoExif = (variety.photos||[]).filter((p: any)=>p.exif).map((p: any,i: number)=>{
    const e = p.exif; const g = p.geo;
    const parts = [];
    if (e.lat != null) parts.push(`GPS(${e.lat.toFixed(4)},${e.lng.toFixed(4)})`);
    if (e.altitude != null) parts.push(`alt.${e.altitude}m`);
    if (g?.city) parts.push(g.city);
    if (e.datetime) parts.push(e.datetime);
    return parts.length ? `  Photo${i+1}: ${parts.join(" | ")}` : null;
  }).filter(Boolean);
  if (photoExif.length) geoLines.push("- EXIF par photo:\n" + photoExif.join("\n"));

  const prompt = `Tu es un expert en myrtilles (Vaccinium spp.) pour Les Domaines Agricoles (LDA) Maroc. Analyse et caractérise cette variété en tenant compte du contexte géographique précis fourni par les métadonnées EXIF.

Données terrain:
- Variété: ${variety.name} | Espèce: ${variety.species||"V. corymbosum"} | Obtenteur: ${variety.breeder||"N/C"} | Site: ${variety.site||"N/C"}
- Floraison: ${variety.flowering_date||"N/C"} | Maturité: ${variety.maturity_date||"N/C"} | Précocité: ${variety.precocity||"N/C"}
- Calibre: ${variety.fruit_size||"N/C"}mm | Couleur: ${variety.color||"N/C"} | Bloom: ${variety.bloom||"N/C"} | Forme: ${variety.fruit_shape||"N/C"}
- Brix: ${variety.brix||"N/C"}°Bx | Fermeté: ${variety.firmness||"N/C"} | Acidité: ${variety.acidity||"N/C"} | Arômes: ${variety.aroma||"N/C"}
- Vigueur: ${variety.vigor||"N/C"} | Port: ${variety.habit||"N/C"} | Rendement: ${variety.yield_estimate||"N/C"}t/ha | Sensibilités: ${variety.sensitivities||"N/C"}
- Notes: ${variety.free_notes||"Aucune"}
${geoLines.length ? "\nDonnées géographiques EXIF (localisation réelle des photos terrain):\n" + geoLines.join("\n") : ""}`;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { parts },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          classification: {
            type: Type.OBJECT,
            properties: {
              groupe: { type: Type.STRING, description: "Highbush/Lowbush/Rabbiteye/Half-highbush/Southern Highbush" },
              positionnement_marche: { type: Type.STRING, description: "Early/Mid/Late season" },
              segment_qualite: { type: Type.STRING, description: "Standard/Premium/Super Premium" }
            }
          },
          descripteurs_visuels: {
            type: Type.OBJECT,
            properties: {
              couleur_dominante: { type: Type.STRING },
              intensite_bloom: { type: Type.STRING, description: "Absent/Faible/Modéré/Fort/Très fort" },
              uniformite: { type: Type.STRING, description: "Faible/Moyenne/Bonne/Excellente" },
              observations_photos: { type: Type.STRING }
            }
          },
          scores: {
            type: Type.OBJECT,
            properties: {
              agronomique: { type: Type.NUMBER },
              organoleptique: { type: Type.NUMBER }
            }
          },
          potentiel_agronomique: {
            type: Type.OBJECT,
            properties: {
              adaptabilite_maroc: { type: Type.STRING, description: "Faible/Moyenne/Bonne/Excellente" },
              resistance_stress: { type: Type.STRING },
              potentiel_export: { type: Type.STRING }
            }
          },
          profil_organoleptique: {
            type: Type.OBJECT,
            properties: {
              equilibre_sucre_acide: { type: Type.STRING },
              complexite_aromatique: { type: Type.STRING },
              appreciation_marche: { type: Type.STRING }
            }
          },
          synthese: {
            type: Type.OBJECT,
            properties: {
              points_forts: { type: Type.ARRAY, items: { type: Type.STRING } },
              points_faibles: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommandations: { type: Type.STRING },
              comparaison_varietes: { type: Type.STRING }
            }
          },
          statut_classification: { type: Type.STRING, description: "En cours/Caractérisée/Validée/Référence" }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

// ═══════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [db, setDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("home");
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{msg: string, type: string} | null>(null);

  useEffect(() => {
    storageLoad().then(data => { setDb(data); setLoading(false); });
  }, []);

  const showToast = (msg: string, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const persist = useCallback(async (newDb: any[]) => {
    setSaving(true);
    setDb(newDb);
    const ok = await storageSave(newDb);
    setSaving(false);
    if (ok) showToast("✅ Sauvegardé");
    else showToast("⚠️ Erreur de sauvegarde", "err");
  }, []);

  const filtered = db.filter(v =>
    (v.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (v.breeder||"").toLowerCase().includes(search.toLowerCase()) ||
    (v.site||"").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{...S.page, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh"}}>
      <div style={{fontSize:48, marginBottom:16}}>🫐</div>
      <p style={{color:"#059669", fontSize:16}}>Chargement BlueVault...</p>
    </div>
  );

  if (view === "new") return (
    <FormView
      onSave={async (v) => { await persist([...db, v]); setView("list"); }}
      onBack={() => setView("home")}
    />
  );
  if (view === "detail" && selected) return (
    <DetailView
      variety={selected}
      onUpdate={async (v) => { const n = db.map(x => x.id===v.id?v:x); await persist(n); setSelected(v); }}
      onDelete={async () => { await persist(db.filter(x => x.id!==selected.id)); setView("list"); }}
      onBack={() => setView("list")}
      showToast={showToast}
    />
  );

  // ── HOME ──
  if (view === "home") return (
    <div style={S.page}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={S.homeHero}>
        <div style={S.heroBerry}>🫐</div>
        <h1 style={S.heroTitle}>BlueVault</h1>
        <p style={S.heroSub}>Base varietale myrtille · LDA Maroc</p>
        <div style={S.storageTag}>
          <Icon path={IC.cloud} size={12} color="#10b981" />
          <span style={{color:"#10b981", fontSize:11, marginLeft:4}}>Storage local</span>
        </div>
        <div style={S.statsRow}>
          {[
            {n: db.length, l: "Variétés"},
            {n: db.filter(v=>v.ai_analysis).length, l: "Analysées AI"},
            {n: db.filter(v=>v.photos?.length>0).length, l: "Avec photos"},
          ].map((s,i) => (
            <div key={i} style={S.statCard}>
              <span style={S.statN}>{s.n}</span>
              <span style={S.statL}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.homeActions}>
        <button style={S.btnPrimary} onClick={() => setView("new")}>
          <Icon path={IC.plus} size={17}/> Nouvelle variété
        </button>
        <button style={S.btnSecondary} onClick={() => setView("list")}>
          <Icon path={IC.grid} size={17}/> Consulter la base ({db.length})
        </button>
        <button style={S.btnGhost} onClick={() => {
          const blob = new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
          a.download = `bluevault_${new Date().toISOString().slice(0,10)}.json`; a.click();
          showToast("📦 Export JSON téléchargé");
        }}>
          <Icon path={IC.download} size={17}/> Exporter JSON
        </button>
      </div>

      {db.length > 0 && (
        <div style={{padding:"20px 16px 0"}}>
          <p style={S.sectionLbl}>Dernières entrées</p>
          {db.slice(-3).reverse().map(v => (
            <div key={v.id} style={S.recentRow} onClick={() => { setSelected(v); setView("detail"); }}>
              <div style={S.recentThumb}>
                {v.photos?.[0]
                  ? <img src={`data:${v.photos[0].type};base64,${v.photos[0].data}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <span style={{fontSize:22}}>🫐</span>}
              </div>
              <div style={{flex:1}}>
                <p style={{margin:0, fontWeight:700, color:"#0f172a", fontSize:15}}>{v.name}</p>
                <p style={{margin:"2px 0 0", fontSize:12, color:"#64748b"}}>{v.site||"Site N/C"} · {v.breeder||"Obtenteur N/C"}</p>
              </div>
              {v.ai_analysis && <span style={S.aiBadge}>AI ✓</span>}
            </div>
          ))}
        </div>
      )}

      {saving && <div style={S.savingBar}><Icon path={IC.cloud} size={13} color="#059669"/> Synchronisation...</div>}
    </div>
  );

  // ── LIST ──
  return (
    <div style={S.page}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={S.topbar}>
        <button style={S.iconBtn} onClick={() => setView("home")}><Icon path={IC.back} size={20}/></button>
        <h2 style={S.topbarTitle}>Base Varietale</h2>
        <button style={S.iconBtn} onClick={() => setView("new")}><Icon path={IC.plus} size={20}/></button>
      </div>
      <div style={S.searchBar}>
        <Icon path={IC.search} size={15} color="#059669"/>
        <input style={S.searchInput} placeholder="Variété, site, obtenteur..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div style={{padding:"0 16px"}}>
        {filtered.length === 0 && <p style={{color:"#94a3b8",textAlign:"center",padding:"40px 0"}}>Aucune variété enregistrée</p>}
        {filtered.map(v => (
          <div key={v.id} style={S.listCard} onClick={() => { setSelected(v); setView("detail"); }}>
            <div style={S.listThumb}>
              {v.photos?.[0]
                ? <img src={`data:${v.photos[0].type};base64,${v.photos[0].data}`} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:10}}/>
                : <span style={{fontSize:28}}>🫐</span>}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <p style={{margin:0,fontWeight:700,color:"#0f172a",fontSize:16}}>{v.name}</p>
                {v.ai_analysis && <span style={S.aiBadgeSmall}>AI</span>}
              </div>
              <p style={{margin:"2px 0",fontSize:12,color:"#059669"}}>{v.breeder||"—"}</p>
              <p style={{margin:0,fontSize:11,color:"#64748b"}}>{v.site||"Site N/C"}</p>
              {v.brix && <p style={{margin:"4px 0 0",fontSize:11,color:"#10b981"}}>🍬 {v.brix}°Bx</p>}
              {v.ai_analysis && (
                <div style={{display:"flex",gap:10,marginTop:4}}>
                  <span style={{fontSize:11,color:"#94a3b8"}}>🌿 {v.ai_analysis.scores?.agronomique}/10</span>
                  <span style={{fontSize:11,color:"#94a3b8"}}>👅 {v.ai_analysis.scores?.organoleptique}/10</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM VIEW
// ═══════════════════════════════════════════════════════════════════════════
function FormView({ onSave, onBack }: { onSave: (v: any) => void, onBack: () => void }) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<any>({ id: uid(), photos: [] });
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string,v: any) => setForm((f: any)=>({...f,[k]:v}));
  const TABS = ["🌿 ID","📅 Phéno","🔬 Morpho","👅 Goût","🚜 Agro","📝 Notes"];

  const captureLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const alt = pos.coords.altitude;
        const geo = await reverseGeocode(lat, lng);
        
        setForm((f: any) => ({
          ...f,
          exif_location: { lat, lng, altitude: alt ? Math.round(alt) : null },
          exif_geo_label: geo?.display || null,
          exif_city: geo?.city || null,
          exif_region: geo?.region || null,
          exif_country: geo?.country || null,
          exif_datetime: new Date().toISOString().replace('T', ' ').slice(0, 19),
        }));
        setLocating(false);
      },
      (err) => {
        alert("Erreur de localisation: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handlePhoto = async (e: any) => {
    setUploading(true);
    const files = Array.from(e.target.files as FileList);
    const newPhotos = await Promise.all(files.map(async f => {
      const [data, exif] = await Promise.all([toBase64(f), extractExif(f)]);
      let geo = null;
      if (exif?.lat != null) geo = await reverseGeocode(exif.lat, exif.lng);
      return { id: uid(), data, type: f.type, name: f.name, exif: exif||null, geo: geo||null };
    }));
    // Merge EXIF geo into form if not already set
    const firstGeo = newPhotos.find(p => p.exif?.lat);
    if (firstGeo) {
      const exif = firstGeo.exif;
      const geo  = firstGeo.geo;
      setForm((f: any) => ({
        ...f,
        photos: [...(f.photos||[]), ...newPhotos],
        exif_location: f.exif_location || (exif.lat != null ? { lat: exif.lat, lng: exif.lng, altitude: exif.altitude } : null),
        exif_geo_label: f.exif_geo_label || geo?.display || null,
        exif_city:    f.exif_city    || geo?.city    || null,
        exif_region:  f.exif_region  || geo?.region  || null,
        exif_country: f.exif_country || geo?.country || null,
        exif_datetime: f.exif_datetime || exif.datetime || null,
        exif_camera:   f.exif_camera   || [exif.cameraMake, exif.cameraModel].filter(Boolean).join(" ") || null,
      }));
    } else {
      set("photos", [...(form.photos||[]), ...newPhotos]);
    }
    setUploading(false);
  };

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <button style={S.iconBtn} onClick={onBack}><Icon path={IC.back} size={20}/></button>
        <h2 style={S.topbarTitle}>Nouvelle Variété</h2>
        <button style={{...S.iconBtn}} onClick={() => { if(!form.name?.trim()){alert("Nom requis");return;} onSave({...form, created_at: new Date().toISOString()}); }}>
          <Icon path={IC.check} size={20} color="#10b981"/>
        </button>
      </div>

      {/* Photos */}
      <div style={{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto"}}>
        <div style={S.photoAdd} onClick={() => fileRef.current?.click()}>
          {uploading ? <span style={{fontSize:10,color:"#059669"}}>...</span> : <><Icon path={IC.camera} size={18} color="#059669"/><span style={{fontSize:10,color:"#059669",marginTop:3}}>Photo</span></>}
        </div>
        {(form.photos||[]).map((p: any) => (
          <div key={p.id} style={S.photoThumb}>
            <img src={`data:${p.type};base64,${p.data}`} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:8}}/>
            <button style={S.photoX} onClick={() => set("photos",(form.photos||[]).filter((x: any)=>x.id!==p.id))}>×</button>
          </div>
        ))}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handlePhoto}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:5,padding:"4px 16px 8px",overflowX:"auto"}}>
        {TABS.map((t,i) => <button key={i} style={i===tab?S.tabOn:S.tabOff} onClick={()=>setTab(i)}>{t}</button>)}
      </div>

      <div style={{padding:"4px 16px 0"}}>
        {tab===0 && <>
          <F label="Nom *" k="name" form={form} set={set} ph="Draper, Duke, Liberty..."/>
          <F label="Espèce" k="species" form={form} set={set} ph="Vaccinium corymbosum"/>
          <F label="Obtenteur / Partenaire" k="breeder" form={form} set={set} ph="Fall Creek, Driscoll's, Planasa..."/>
          <F label="Site de production" k="site" form={form} set={set} ph="Dakhla, Chtouka, Agadir Bio..."/>
          <F label="Type commercial" k="commercial_type" form={form} set={set} ph="SEKOYA, standard, bio..."/>
          <F label="Campagne" k="campaign" form={form} set={set} ph="2025/26"/>
          
          <div style={{marginBottom:14}}>
            <button style={{...S.btnSecondary, padding: "10px 16px", fontSize: 13}} onClick={captureLocation} disabled={locating}>
              {locating ? "⏳ Localisation en cours..." : "📍 Capturer ma position GPS"}
            </button>
          </div>

          {(form.exif_location || form.exif_datetime || form.exif_camera) && (
            <div style={{background:"#ecfdf5",border:"1px solid #a7f3d0",borderRadius:12,padding:"12px 14px",marginTop:4,marginBottom:6}}>
              <p style={{margin:"0 0 8px",fontSize:11,color:"#10b981",fontWeight:700,letterSpacing:0.5}}>📍 DONNÉES DE LOCALISATION</p>
              {form.exif_location && (
                <p style={{margin:"2px 0",fontSize:12,color:"#064e3b"}}>
                  🌐 {form.exif_location.lat?.toFixed(5)}, {form.exif_location.lng?.toFixed(5)}
                  {form.exif_location.altitude != null ? ` · ${form.exif_location.altitude} m alt.` : ""}
                </p>
              )}
              {form.exif_city && <p style={{margin:"2px 0",fontSize:12,color:"#064e3b"}}>📌 {[form.exif_city, form.exif_region, form.exif_country].filter(Boolean).join(", ")}</p>}
              {form.exif_datetime && <p style={{margin:"2px 0",fontSize:12,color:"#064e3b"}}>🕐 {form.exif_datetime}</p>}
              {form.exif_camera && <p style={{margin:"2px 0",fontSize:12,color:"#064e3b"}}>📷 {form.exif_camera}</p>}
            </div>
          )}
        </>}
        {tab===1 && <>
          <F label="Date floraison" k="flowering_date" form={form} set={set} ph="15/02/2026"/>
          <F label="Date maturité" k="maturity_date" form={form} set={set} ph="10/04/2026"/>
          <F label="Précocité" k="precocity" form={form} set={set} ph="Très précoce / Précoce / Mi-saison / Tardif"/>
          <F label="Durée récolte (jours)" k="harvest_duration" form={form} set={set} type="number" ph="25"/>
          <F label="Besoins en froid (h < 7°C)" k="chilling_hours" form={form} set={set} type="number" ph="400"/>
        </>}
        {tab===2 && <>
          <F label="Calibre (mm)" k="fruit_size" form={form} set={set} ph="16-18"/>
          <F label="Couleur" k="color" form={form} set={set} ph="Bleu clair / Bleu foncé / Bleu-noir"/>
          <F label="Bloom (pruine)" k="bloom" form={form} set={set} ph="Absent / Faible / Modéré / Fort"/>
          <F label="Forme du fruit" k="fruit_shape" form={form} set={set} ph="Rond / Oblong / Aplati"/>
          <F label="Cicatrice pédonculaire" k="stem_scar" form={form} set={set} ph="Petite / Moyenne / Grande"/>
          <F label="Uniformité" k="uniformity" form={form} set={set} ph="Faible / Moyenne / Bonne / Excellente"/>
          <F label="Poids moyen baie (g)" k="berry_weight" form={form} set={set} type="number" ph="2.5"/>
        </>}
        {tab===3 && <>
          <F label="Brix (°Bx)" k="brix" form={form} set={set} type="number" ph="13.5"/>
          <F label="Fermeté" k="firmness" form={form} set={set} ph="Molle / Ferme / Très ferme / Croquante"/>
          <F label="Acidité" k="acidity" form={form} set={set} ph="Faible / Équilibrée / Acidulée"/>
          <F label="Arômes" k="aroma" form={form} set={set} ph="Fruité / Floral / Musqué / Neutre"/>
          <F label="Profil saveur" k="flavor_profile" form={form} set={set} ph="Description libre"/>
          <F label="Conservation (jours à 2°C)" k="shelf_life" form={form} set={set} type="number" ph="21"/>
        </>}
        {tab===4 && <>
          <F label="Vigueur" k="vigor" form={form} set={set} ph="Faible / Moyenne / Forte / Très forte"/>
          <F label="Port" k="habit" form={form} set={set} ph="Érigé / Semi-érigé / Étalé / Compact"/>
          <F label="Rendement estimé (t/ha)" k="yield_estimate" form={form} set={set} type="number" ph="18"/>
          <F label="Facilité de récolte" k="harvest_ease" form={form} set={set} ph="Facile / Moyenne / Difficile"/>
          <F label="Sensibilités" k="sensitivities" form={form} set={set} ph="Botrytis, momification..."/>
          <F label="Tolérance stress hydrique" k="drought_tolerance" form={form} set={set} ph="Faible / Modérée / Bonne"/>
        </>}
        {tab===5 && <>
          <div style={{marginBottom:14}}>
            <label style={S.lbl}>Notes libres</label>
            <textarea style={S.ta as any} rows={5} placeholder="Observations terrain, comparaisons..." value={form.free_notes||""} onChange={e=>set("free_notes",e.target.value)}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={S.lbl}>Fiche technique (résumé)</label>
            <textarea style={S.ta as any} rows={4} placeholder="Recommandations culturales, spécificités..." value={form.tech_sheet||""} onChange={e=>set("tech_sheet",e.target.value)}/>
          </div>
          <F label="Référence / Lien fiche" k="tech_ref" form={form} set={set} ph="URL ou référence document"/>
        </>}
      </div>
      <div style={{padding:"16px 16px 40px"}}>
        <button style={S.btnPrimary} onClick={() => { if(!form.name?.trim()){alert("Nom requis");return;} onSave({...form,created_at:new Date().toISOString()}); }}>
          💾 Enregistrer la variété
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════
function DetailView({ variety, onUpdate, onDelete, onBack, showToast }: { variety: any, onUpdate: (v: any) => void, onDelete: () => void, onBack: () => void, showToast: (msg: string, type?: string) => void }) {
  const [tab, setTab] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const TABS = ["📋 Fiche","🤖 AI","🖼️ Photos"];
  const ai = variety.ai_analysis;

  const runAI = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeWithGemini(variety);
      await onUpdate({ ...variety, ai_analysis: result, analyzed_at: new Date().toISOString() });
      showToast("🤖 Analyse AI complétée");
    } catch(e: any) {
      showToast("❌ Erreur AI: " + e.message, "err");
    }
    setAnalyzing(false);
  };

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <button style={S.iconBtn} onClick={onBack}><Icon path={IC.back} size={20}/></button>
        <h2 style={{...S.topbarTitle, maxWidth:170, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{variety.name}</h2>
        <button style={S.iconBtn} onClick={() => { if(confirm("Supprimer cette variété ?")) onDelete(); }}>
          <Icon path={IC.trash} size={20} color="#ef4444"/>
        </button>
      </div>

      {variety.photos?.[0] && (
        <div style={{position:"relative",height:190,overflow:"hidden"}}>
          <img src={`data:${variety.photos[0].type};base64,${variety.photos[0].data}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 80%)"}}/>
          <div style={{position:"absolute",bottom:12,left:16}}>
            <p style={{margin:0,fontSize:18,fontWeight:800,color:"#ffffff"}}>{variety.name}</p>
            <p style={{margin:"2px 0 0",fontSize:12,color:"#cbd5e1"}}>{variety.site||""} {variety.breeder ? "· "+variety.breeder : ""}</p>
          </div>
          {ai && (
            <div style={{position:"absolute",bottom:12,right:12,display:"flex",gap:6}}>
              <span style={S.scoreChip}>🌿 {ai.scores?.agronomique}/10</span>
              <span style={S.scoreChip}>👅 {ai.scores?.organoleptique}/10</span>
            </div>
          )}
        </div>
      )}

      <div style={{display:"flex",gap:5,padding:"10px 16px 6px",overflowX:"auto"}}>
        {TABS.map((t,i) => <button key={i} style={i===tab?S.tabOn:S.tabOff} onClick={()=>setTab(i)}>{t}</button>)}
      </div>

      <div style={{padding:"4px 16px 0"}}>
        {tab===0 && <>
          <Grid items={[
            {l:"Espèce",v:variety.species},{l:"Obtenteur",v:variety.breeder},{l:"Site",v:variety.site},{l:"Campagne",v:variety.campaign},
            {l:"Floraison",v:variety.flowering_date},{l:"Maturité",v:variety.maturity_date},{l:"Précocité",v:variety.precocity},
            {l:"Calibre",v:variety.fruit_size?variety.fruit_size+" mm":null},{l:"Couleur",v:variety.color},{l:"Bloom",v:variety.bloom},
            {l:"Brix",v:variety.brix?variety.brix+"°Bx":null},{l:"Fermeté",v:variety.firmness},{l:"Acidité",v:variety.acidity},
            {l:"Rendement",v:variety.yield_estimate?variety.yield_estimate+" t/ha":null},{l:"Vigueur",v:variety.vigor},{l:"Conservation",v:variety.shelf_life?variety.shelf_life+" j":null},
          ]}/>
          {variety.free_notes && <NoteBox label="📝 Notes terrain" text={variety.free_notes}/>}
          {variety.tech_sheet && <NoteBox label="📄 Fiche technique" text={variety.tech_sheet}/>}
          {(variety.exif_location || variety.exif_city || variety.exif_datetime) && (
            <div style={{background:"#0a1f0a",border:"1px solid #14532d",borderRadius:12,padding:"12px 14px",marginBottom:12}}>
              <p style={{margin:"0 0 8px",fontSize:11,color:"#4ade80",fontWeight:700,letterSpacing:0.5}}>📍 DONNÉES DE LOCALISATION</p>
              {variety.exif_location?.lat != null && (
                <p style={{margin:"3px 0",fontSize:12,color:"#d1fae5"}}>
                  🌐 {variety.exif_location.lat.toFixed(5)}, {variety.exif_location.lng.toFixed(5)}
                  {variety.exif_location.altitude != null ? ` · ${variety.exif_location.altitude} m` : ""}
                </p>
              )}
              {variety.exif_city && <p style={{margin:"3px 0",fontSize:12,color:"#d1fae5"}}>📌 {[variety.exif_city, variety.exif_region, variety.exif_country].filter(Boolean).join(", ")}</p>}
              {variety.exif_datetime && <p style={{margin:"3px 0",fontSize:12,color:"#d1fae5"}}>🕐 {variety.exif_datetime}</p>}
              {variety.exif_camera && <p style={{margin:"3px 0",fontSize:12,color:"#d1fae5"}}>📷 {variety.exif_camera}</p>}
            </div>
          )}
        </>}

        {tab===1 && <>
          {!ai ? (
            <div style={S.aiBox}>
              <div style={{fontSize:40,marginBottom:12}}>🤖</div>
              <p style={{color:"#334155",fontWeight:700,marginBottom:6}}>Analyse AI disponible</p>
              <p style={{color:"#64748b",fontSize:13,marginBottom:20,lineHeight:1.5}}>L'IA analysera les photos + toutes les données pour produire une fiche de caractérisation complète adaptée au contexte LDA Maroc.</p>
              <button style={S.btnPrimary} onClick={runAI} disabled={analyzing}>
                {analyzing ? "⏳ Analyse en cours..." : "🔬 Lancer l'analyse AI"}
              </button>
            </div>
          ) : (
            <div style={{paddingBottom:32}}>
              <Section title="📊 Classification">
                <Grid items={[
                  {l:"Groupe",v:ai.classification?.groupe},
                  {l:"Positionnement",v:ai.classification?.positionnement_marche},
                  {l:"Segment qualité",v:ai.classification?.segment_qualite},
                  {l:"Statut",v:ai.statut_classification},
                ]}/>
              </Section>
              <Section title="🎯 Scores">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <ScoreCard icon="🌿" label="Agronomique" score={ai.scores?.agronomique} sub={ai.potentiel_agronomique?.adaptabilite_maroc}/>
                  <ScoreCard icon="👅" label="Organoleptique" score={ai.scores?.organoleptique} sub={ai.profil_organoleptique?.equilibre_sucre_acide}/>
                </div>
              </Section>
              {ai.descripteurs_visuels?.observations_photos && (
                <Section title="👁️ Observations photos">
                  <NoteBox text={ai.descripteurs_visuels.observations_photos}/>
                </Section>
              )}
              {ai.synthese && (
                <Section title="✅ Synthèse">
                  {ai.synthese.points_forts?.map((p: string,i: number)=><p key={i} style={{fontSize:13,color:"#10b981",margin:"3px 0"}}>• {p}</p>)}
                  {ai.synthese.points_faibles?.map((p: string,i: number)=><p key={i} style={{fontSize:13,color:"#f59e0b",margin:"3px 0"}}>⚠ {p}</p>)}
                  {ai.synthese.recommandations && <NoteBox label="💡 Recommandations" text={ai.synthese.recommandations}/>}
                  {ai.synthese.comparaison_varietes && <NoteBox label="🔄 Comparaison" text={ai.synthese.comparaison_varietes}/>}
                </Section>
              )}
              <button style={S.btnGhost} onClick={runAI} disabled={analyzing}>
                {analyzing?"⏳ Analyse...":"🔄 Relancer l'analyse"}
              </button>
            </div>
          )}
        </>}

        {tab===2 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,paddingBottom:32}}>
            {(!variety.photos?.length) && <p style={{color:"#94a3b8",gridColumn:"1/-1",textAlign:"center",padding:32}}>Aucune photo</p>}
            {variety.photos?.map((p: any) => (
              <div key={p.id} style={{aspectRatio:"1",borderRadius:8,overflow:"hidden",background:"#f1f5f9"}}>
                <img src={`data:${p.type};base64,${p.data}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────
function F({ label, k, form, set, ph, type="text" }: { label: string, k: string, form: any, set: (k: string, v: any) => void, ph?: string, type?: string }) {
  return (
    <div style={{marginBottom:13}}>
      <label style={S.lbl}>{label}</label>
      <input style={S.inp} type={type} value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph}/>
    </div>
  );
}
function Grid({ items }: { items: {l: string, v: any}[] }) {
  const valid = items.filter(i=>i.v);
  if (!valid.length) return <p style={{color:"#94a3b8",padding:"8px 0",fontSize:13}}>Aucune donnée saisie</p>;
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      {valid.map((item,i) => (
        <div key={i} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
          <p style={{margin:0,fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>{item.l}</p>
          <p style={{margin:0,fontSize:13,color:"#0f172a",fontWeight:500}}>{item.v}</p>
        </div>
      ))}
    </div>
  );
}
function NoteBox({ label, text }: { label?: string, text: string }) {
  return (
    <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:10,padding:14,marginBottom:12,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
      {label && <p style={{margin:"0 0 6px",fontSize:11,color:"#059669",fontWeight:600}}>{label}</p>}
      <p style={{margin:0,fontSize:13,color:"#334155",lineHeight:1.6}}>{text}</p>
    </div>
  );
}
function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:700,color:"#059669",margin:"0 0 8px"}}>{title}</p>{children}</div>;
}
function ScoreCard({ icon, label, score, sub }: { icon: string, label: string, score: number, sub?: string }) {
  const pct = ((score||0)/10)*100;
  const col = score>=7?"#10b981":score>=5?"#f59e0b":"#ef4444";
  return (
    <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
      <p style={{fontSize:22,margin:0}}>{icon}</p>
      <p style={{fontSize:26,fontWeight:800,color:col,margin:"4px 0"}}>{score}<span style={{fontSize:12,color:"#94a3b8"}}>/10</span></p>
      <p style={{fontSize:11,color:"#059669",fontWeight:600,margin:"0 0 8px"}}>{label}</p>
      <div style={{background:"#f1f5f9",borderRadius:4,height:4}}>
        <div style={{background:col,height:"100%",borderRadius:4,width:pct+"%"}}/>
      </div>
      {sub && <p style={{fontSize:10,color:"#64748b",margin:"6px 0 0"}}>{sub}</p>}
    </div>
  );
}
function Toast({ msg, type }: { msg: string, type?: string }) {
  return (
    <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:type==="err"?"#fef2f2":"#ffffff",border:`1px solid ${type==="err"?"#ef4444":"#10b981"}`,borderRadius:10,padding:"10px 18px",fontSize:13,color:"#0f172a",zIndex:9999,whiteSpace:"nowrap",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)"}}>
      {msg}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page:       { minHeight:"100vh", background:"#f8fafc", color:"#0f172a", fontFamily:"'Inter', system-ui, sans-serif", maxWidth:480, margin:"0 auto", paddingBottom:32 },
  topbar:     { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px 12px", background:"rgba(248, 250, 252, 0.85)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:10, borderBottom:"1px solid rgba(226, 232, 240, 0.8)" },
  topbarTitle:{ fontSize:18, fontWeight:700, color:"#0f172a", margin:0, letterSpacing:"-0.02em" },
  iconBtn:    { background:"#ffffff", border:"1px solid #e2e8f0", color:"#475569", cursor:"pointer", padding:8, borderRadius:12, display:"flex", alignItems:"center", transition:"all 0.2s ease", boxShadow:"0 1px 2px rgba(0,0,0,0.02)" },
  homeHero:   { padding:"48px 24px 32px", textAlign:"center", background:"linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", borderBottom:"1px solid #e2e8f0" },
  heroBerry:  { fontSize:56, marginBottom:12, filter:"drop-shadow(0 8px 16px rgba(16, 185, 129, 0.25))" },
  heroTitle:  { fontSize:34, fontWeight:800, color:"#0f172a", margin:0, letterSpacing:"-0.04em" },
  heroSub:    { color:"#64748b", fontSize:15, margin:"8px 0 20px", fontWeight:500 },
  storageTag: { display:"inline-flex", alignItems:"center", background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:24, padding:"6px 14px", marginBottom:28, boxShadow:"0 2px 8px rgba(16, 185, 129, 0.08)" },
  statsRow:   { display:"flex", gap:12, justifyContent:"center" },
  statCard:   { background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:16, padding:"16px 24px", display:"flex", flexDirection:"column", alignItems:"center", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)" },
  statN:      { fontSize:28, fontWeight:800, color:"#10b981", letterSpacing:"-0.02em", lineHeight:1 },
  statL:      { fontSize:11, color:"#64748b", marginTop:6, textTransform:"uppercase", letterSpacing:0.5, fontWeight:700 },
  homeActions:{ padding:"28px 20px 0", display:"flex", flexDirection:"column", gap:14 },
  btnPrimary: { width:"100%", padding:"16px 20px", background:"#10b981", border:"none", borderRadius:16, color:"#ffffff", fontSize:16, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 4px 12px rgba(16, 185, 129, 0.3)", transition:"transform 0.1s ease, box-shadow 0.2s ease" },
  btnSecondary:{ width:"100%", padding:"16px 20px", background:"#ffffff", border:"1px solid #cbd5e1", borderRadius:16, color:"#0f172a", fontSize:16, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 2px 6px rgba(0,0,0,0.04)", transition:"background 0.2s ease" },
  btnGhost:   { width:"100%", padding:"14px 20px", background:"transparent", border:"1.5px dashed #cbd5e1", borderRadius:16, color:"#64748b", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 },
  sectionLbl: { fontSize:12, color:"#64748b", textTransform:"uppercase", letterSpacing:1.2, marginBottom:12, fontWeight:700, padding:"0 20px" },
  recentRow:  { display:"flex", alignItems:"center", gap:14, padding:14, background:"#ffffff", borderRadius:16, marginBottom:12, cursor:"pointer", border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.02)", transition:"transform 0.1s ease, box-shadow 0.2s ease", margin:"0 20px 12px" },
  recentThumb:{ width:56, height:56, borderRadius:12, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 },
  aiBadge:    { background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:8, padding:"4px 10px", fontSize:11, color:"#059669", fontWeight:700, letterSpacing:0.5 },
  aiBadgeSmall:{ background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:6, padding:"2px 8px", fontSize:10, color:"#059669", flexShrink:0, fontWeight:700 },
  savingBar:  { position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#0f172a", border:"none", borderRadius:24, padding:"12px 24px", fontSize:14, fontWeight:600, color:"#ffffff", display:"flex", alignItems:"center", gap:10, boxShadow:"0 10px 25px -5px rgba(0,0,0,0.2)" },
  searchBar:  { display:"flex", alignItems:"center", gap:10, margin:"16px 20px", background:"#ffffff", border:"1px solid #cbd5e1", borderRadius:16, padding:"14px 18px", boxShadow:"0 2px 8px rgba(0,0,0,0.02)" },
  searchInput:{ background:"none", border:"none", color:"#0f172a", fontSize:16, flex:1, outline:"none", fontWeight:500 },
  listCard:   { display:"flex", gap:14, background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:16, padding:16, cursor:"pointer", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.02)", transition:"transform 0.1s ease, box-shadow 0.2s ease" },
  listThumb:  { width:80, height:80, borderRadius:14, background:"#f1f5f9", overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" },
  scoreChip:  { background:"rgba(255,255,255,0.95)", backdropFilter:"blur(8px)", borderRadius:8, padding:"4px 10px", fontSize:12, color:"#0f172a", fontWeight:700, border:"1px solid #e2e8f0", boxShadow:"0 2px 4px rgba(0,0,0,0.05)" },
  photoAdd:   { width:80, height:80, background:"#f8fafc", border:"2px dashed #10b981", borderRadius:16, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0, cursor:"pointer", transition:"background 0.2s ease" },
  photoThumb: { position:"relative", width:80, height:80, flexShrink:0 },
  photoX:     { position:"absolute", top:-6, right:-6, background:"#ef4444", border:"2px solid #ffffff", borderRadius:"50%", width:24, height:24, color:"#ffffff", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", padding:0, boxShadow:"0 2px 6px rgba(0,0,0,0.15)" },
  tabOn:      { background:"#0f172a", border:"none", borderRadius:10, padding:"8px 16px", color:"#ffffff", fontSize:13, fontWeight:600, cursor:"pointer", flexShrink:0, boxShadow:"0 2px 6px rgba(0,0,0,0.1)" },
  tabOff:     { background:"#f1f5f9", border:"1px solid transparent", borderRadius:10, padding:"8px 16px", color:"#64748b", fontSize:13, cursor:"pointer", flexShrink:0, fontWeight:600, transition:"background 0.2s ease" },
  lbl:        { display:"block", fontSize:12, color:"#0f172a", fontWeight:700, marginBottom:8, letterSpacing:0.5 },
  inp:        { width:"100%", background:"#ffffff", border:"1px solid #cbd5e1", borderRadius:14, padding:"14px 16px", color:"#0f172a", fontSize:16, outline:"none", boxSizing:"border-box", boxShadow:"0 1px 2px rgba(0,0,0,0.02)", transition:"border-color 0.2s ease" },
  ta:         { width:"100%", background:"#ffffff", border:"1px solid #cbd5e1", borderRadius:14, padding:"14px 16px", color:"#0f172a", fontSize:16, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"'Inter', system-ui, sans-serif", boxShadow:"0 1px 2px rgba(0,0,0,0.02)", transition:"border-color 0.2s ease" },
  aiBox:      { background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:16, padding:"32px 20px", textAlign:"center", margin:"16px 0", boxShadow:"0 4px 12px rgba(16, 185, 129, 0.08)" },
};