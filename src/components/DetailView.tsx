import React, { useState } from 'react';
import { Variety, Photo } from '../types';
import { ArrowLeft, Edit3, Sparkles, Image as ImageIcon, Info, Activity, Loader2, MapPin, Camera, Printer, Star, Share2, Copy } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getAI } from '../utils';
import PhotoGallery from './PhotoGallery';
import AIComparison from './AIComparison';

interface DetailViewProps {
  variety: Variety;
  allVarieties: Variety[];
  onBack: () => void;
  onEdit: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  isPrintAllMode?: boolean;
}

export default function DetailView({ variety, allVarieties, onBack, onEdit, onAnalyze, analyzing, isPrintAllMode }: DetailViewProps) {
  const [tab, setTab] = useState<'info' | 'photos' | 'ai'>('info');
  const [photoSummary, setPhotoSummary] = useState<string | null>(null);
  const [generatingPhotoSummary, setGeneratingPhotoSummary] = useState(false);
  const photos: Photo[] = variety.photos ? JSON.parse(variety.photos) : [];
  const analysis = variety.ai_analysis ? JSON.parse(variety.ai_analysis) : null;

  const firstPhotoWithGPS = photos.find(p => p.exif?.lat && p.exif?.lng);

  const sensoryData = [
    { subject: 'Douceur', A: variety.sweetness_score || 0, fullMark: 5 },
    { subject: 'Acidité', A: variety.acidity_score || 0, fullMark: 5 },
    { subject: 'Fermeté', A: variety.firmness_score || 0, fullMark: 5 },
    { subject: 'Calibre', A: variety.size_score || 0, fullMark: 5 },
    { subject: 'Arôme', A: variety.aroma_score || 0, fullMark: 5 },
  ];
  const hasSensoryData = sensoryData.some(d => d.A > 0);

  const handleGeneratePhotoSummary = async () => {
    if (photos.length === 0) return;
    setGeneratingPhotoSummary(true);
    try {
      const parts = photos.map(p => ({
        inlineData: {
          data: p.data,
          mimeType: p.type
        }
      }));
      
      const prompt = `Analyse ces photos de la variété de myrtille "${variety.name}". Décris de manière concise les caractéristiques visuelles du fruit (couleur, taille, forme, pruine/bloom) que tu peux observer.`;
      
      const response = await getAI().models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: { parts: [...parts, { text: prompt }] }
      });
      
      setPhotoSummary(response.text?.trim() || null);
    } catch (e: any) {
      console.error(e);
      setPhotoSummary("Erreur lors de la génération du résumé : " + (e.message || "Erreur inconnue"));
    } finally {
      setGeneratingPhotoSummary(false);
    }
  };

  const handleShare = () => {
    const text = `Variété: ${variety.name}
Espèce: ${variety.species || 'N/C'}
Brix: ${variety.brix || 'N/C'}°Bx
Rendement: ${variety.yield_estimate || 'N/C'}kg/pl
Note: ${variety.rating || 0}/5
Statut: ${variety.status || 'N/C'}
    
Partagé via BlueVault.`;
    navigator.clipboard.writeText(text);
    alert("Résumé copié dans le presse-papier !");
  };

  const copyField = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    alert(`${fieldName} copié dans le presse-papier !`);
  };

  const renderProgressBar = (score: number, max: number = 10) => {
    const percentage = Math.min(100, Math.max(0, (score / max) * 100));
    return (
      <div className="w-full bg-[#2A2B30] rounded-full h-2 mt-2 overflow-hidden print:border print:border-gray-300">
        <div 
          className="bg-[#00FF9D] h-2 rounded-full transition-all duration-1000 ease-out print:bg-black" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-[#E6E6E6] text-[#151619] print:bg-white print:h-auto ${isPrintAllMode ? 'h-auto' : 'h-full'}`}>
      {!isPrintAllMode && (
        <div className="bg-[#151619] text-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-md print:hidden">
          <button onClick={onBack} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors"><ArrowLeft size={20} /></button>
          <div className="relative group flex items-center justify-center gap-2">
            <h2 className="font-mono text-sm uppercase tracking-widest truncate max-w-[200px] cursor-help">{variety.name}</h2>
            <button onClick={() => copyField(variety.name, 'Nom')} className="text-gray-400 hover:text-white transition-colors" title="Copier le nom">
              <Copy size={14} />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-max bg-[#2A2B30] text-white text-[10px] px-2 py-1 rounded shadow-lg z-50 border border-gray-700">
              {variety.ai_analysis ? 'Analyse IA disponible' : 'Analyse IA non générée'}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors text-white" title="Partager le résumé">
              <Share2 size={20} />
            </button>
            <button onClick={() => window.print()} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors text-white" title="Imprimer le Passeport Variétal">
              <Printer size={20} />
            </button>
            <button onClick={onEdit} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors text-[#00FF9D]"><Edit3 size={20} /></button>
          </div>
        </div>
      )}

      <div className="hidden print:flex p-8 pb-4 border-b-4 border-black mb-6 justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{variety.name}</h1>
          <p className="text-lg text-gray-500 uppercase tracking-widest">{variety.species || 'Espèce inconnue'}</p>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={16} fill={s <= (variety.rating || 0) ? '#000' : 'none'} className="text-black" />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <QRCodeCanvas value={window.location.href} size={80} bgColor="#ffffff" fgColor="#000000" level="H" />
          <span className="text-[8px] font-mono text-gray-400 uppercase">BlueVault Passport</span>
        </div>
      </div>

      {!isPrintAllMode && (
        <div className="flex border-b border-gray-300 bg-white sticky top-[60px] z-10 shadow-sm print:hidden">
          <button onClick={() => setTab('info')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${tab === 'info' ? 'text-[#00CC7D] border-b-2 border-[#00CC7D]' : 'text-gray-500 hover:text-gray-800'}`}>
            <Info size={14} /> Info
          </button>
          <button onClick={() => setTab('photos')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${tab === 'photos' ? 'text-[#00CC7D] border-b-2 border-[#00CC7D]' : 'text-gray-500 hover:text-gray-800'}`}>
            <ImageIcon size={14} /> Photos ({photos.length})
          </button>
          <button onClick={() => setTab('ai')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${tab === 'ai' ? 'text-[#00CC7D] border-b-2 border-[#00CC7D]' : 'text-gray-500 hover:text-gray-800'}`}>
            <Sparkles size={14} /> AI
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-8 print:overflow-visible print:p-8">
        <div className="max-w-4xl mx-auto">
        {(tab === 'info' || document.body.classList.contains('print-mode')) && (
          <div className={`space-y-6 ${tab !== 'info' ? 'hidden print:block' : ''}`}>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-6">
              <div className="flex justify-between items-start mb-4 border-b pb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gestion & Évaluation</h3>
                <div className="flex items-center gap-1">
                  {variety.status && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      variety.status === 'active' ? 'bg-green-100 text-green-700' : 
                      variety.status === 'trial' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {variety.status === 'active' ? 'Actif' : variety.status === 'trial' ? 'En Essai' : 'Archivé'}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 block text-xs mb-1">Note globale</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} fill={s <= (variety.rating || 0) ? '#FACC15' : 'none'} className={s <= (variety.rating || 0) ? 'text-yellow-400' : 'text-gray-200'} />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs mb-1">Période de récolte</span>
                  <span className="font-medium">
                    {variety.harvest_start && variety.harvest_end ? (
                      `${['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][variety.harvest_start-1]} - ${['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][variety.harvest_end-1]}`
                    ) : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Identité & Localisation</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div>
                  <span className="text-gray-400 block text-xs">Espèce</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{variety.species || '-'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Nom scientifique</span>
                  <span className="font-medium italic">{variety.scientific_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Code expérimental</span>
                  <span className="font-medium">{variety.experimental_code || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Synonymes</span>
                  <span className="font-medium">{variety.synonyms || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Obtenteur</span>
                  <span className="font-medium">{variety.breeder || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Pays d'origine</span>
                  <span className="font-medium">{variety.origin_country || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400 block text-xs">Statut légal</span>
                  <span className="font-medium">{variety.legal_status || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400 block text-xs">Site / Localisation</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{variety.site || '-'}</span>
                  </div>
                  {firstPhotoWithGPS && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${firstPhotoWithGPS.exif!.lat},${firstPhotoWithGPS.exif!.lng}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#00CC7D] flex items-center gap-1 text-xs hover:underline mt-1 w-max print:hidden"
                    >
                      <MapPin size={12} /> Voir sur la carte (GPS)
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Morphologie Détaillée</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Tige & Rameaux</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400 block text-[10px]">Couleur:</span> <span className="font-medium">{variety.stem_color || '-'}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Épaisseur:</span> <span className="font-medium">{variety.stem_thickness || '-'}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Entre-nœuds:</span> <span className="font-medium">{variety.stem_internode_length || '-'}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Pilosité:</span> <span className="font-medium">{variety.stem_hairiness || '-'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Feuillage</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400 block text-[10px]">Forme limbe:</span> <span className="font-medium">{variety.leaf_blade_shape || '-'}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Type marge:</span> <span className="font-medium">{variety.leaf_margin_type || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-400 block text-[10px]">Cloqûre:</span> <span className="font-medium">{variety.leaf_blistering || '-'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Floraison</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400 block text-[10px]">Couleur pétales:</span> <span className="font-medium">{variety.flower_petal_color || '-'}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Pleine floraison:</span> <span className="font-medium">{variety.flower_full_bloom_time || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-400 block text-[10px]">Inflorescence:</span> <span className="font-medium">{variety.flower_inflorescence_type || '-'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Fruit (Organe Récolté)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400 block text-[10px]">Forme:</span> <span className="font-medium">{variety.harvest_organ_shape || '-'}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Calibre:</span> <span className="font-medium">{variety.harvest_organ_size || '-'}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Épiderme:</span> <span className="font-medium">{variety.harvest_organ_skin_color || '-'}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Chair:</span> <span className="font-medium">{variety.harvest_organ_flesh_color || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-400 block text-[10px]">Texture:</span> <span className="font-medium">{variety.harvest_organ_texture || '-'}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Phénologie & Plante</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div><span className="text-gray-400 block text-xs">Floraison</span><span className="font-medium">{variety.flowering_date ? new Date(variety.flowering_date).toLocaleDateString() : '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Maturité</span><span className="font-medium">{variety.maturity_date ? new Date(variety.maturity_date).toLocaleDateString() : '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Précocité</span><span className="font-medium">{variety.precocity || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Vigueur</span><span className="font-medium">{variety.vigor || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Port</span><span className="font-medium">{variety.habit || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Zone de rusticité</span><span className="font-medium">{variety.hardiness_zone || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Rendement est.</span><span className="font-medium">{variety.yield_estimate ? `${variety.yield_estimate} kg/pl` : '-'}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Fruit & Qualité</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div><span className="text-gray-400 block text-xs">Calibre</span><span className="font-medium">{variety.fruit_size ? `${variety.fruit_size} mm` : '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Brix</span><span className="font-medium">{variety.brix ? `${variety.brix} °Bx` : '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Couleur</span><span className="font-medium">{variety.color || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Pruine (Bloom)</span><span className="font-medium">{variety.bloom || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Forme</span><span className="font-medium">{variety.fruit_shape || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Fermeté</span><span className="font-medium">{variety.firmness || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Acidité</span><span className="font-medium">{variety.acidity || '-'}</span></div>
                <div className="col-span-2"><span className="text-gray-400 block text-xs">Arômes</span><span className="font-medium">{variety.aroma || '-'}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Agronomie & Résistances</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div className="col-span-2"><span className="text-gray-400 block text-xs">Résistances Biotiques</span><span className="font-medium">{variety.sensitivities || '-'}</span></div>
                <div className="col-span-2"><span className="text-gray-400 block text-xs">Tolérances Abiotiques</span><span className="font-medium">{variety.abiotic_tolerances || '-'}</span></div>
                <div className="col-span-2"><span className="text-gray-400 block text-xs">Aptitude Conservation</span><span className="font-medium">{variety.conservation_aptitude || '-'}</span></div>
              </div>
            </div>

            {hasSensoryData && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Profil Sensoriel</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={sensoryData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <Radar name={variety.name} dataKey="A" stroke="#00FF9D" fill="#00FF9D" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {variety.free_notes && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Notes Libres</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{variety.free_notes}</p>
              </div>
            )}
          </div>
        )}

        {(tab === 'photos' || document.body.classList.contains('print-mode')) && (
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px] print:shadow-none print:border-none print:min-h-0 print:mb-6 ${tab !== 'photos' ? 'hidden print:block' : ''}`}>
            <h3 className="hidden print:block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Photos</h3>
            <PhotoGallery photos={photos} />
          </div>
        )}

        {(tab === 'ai' || document.body.classList.contains('print-mode')) && (
          <div className={`space-y-6 ${tab !== 'ai' ? 'hidden print:block' : ''}`}>
            {!analysis ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200 flex flex-col items-center print:hidden">
                <Sparkles size={32} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">Aucune analyse IA</h3>
                <p className="text-sm text-gray-500 mb-6">Générez une analyse complète basée sur les données et photos de cette variété.</p>
                <button onClick={onAnalyze} disabled={analyzing} className="flex items-center gap-2 px-6 py-3 bg-[#151619] hover:bg-[#2A2B30] text-[#00FF9D] font-mono text-sm uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50">
                  {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                  {analyzing ? 'Analyse en cours...' : 'Lancer l\'analyse'}
                </button>
              </div>
            ) : (
              <>
                <div className="bg-[#151619] text-white rounded-xl p-5 shadow-xl border border-[#2A2B30] print:bg-white print:text-black print:border-gray-300 print:shadow-none print:mb-6">
                  <div className="flex items-center justify-between mb-4 border-b border-[#2A2B30] pb-2 print:border-gray-200">
                    <h3 className="text-xs font-mono text-[#00FF9D] uppercase tracking-widest flex items-center gap-2 print:text-black"><Sparkles size={14} /> Synthèse IA</h3>
                    <button onClick={onAnalyze} disabled={analyzing} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 print:hidden">
                      {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                      Actualiser
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#2A2B30] print:bg-gray-50 print:border-gray-200">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Agronomique</span>
                          <span className="text-xl font-bold text-[#00FF9D] print:text-black">{analysis.scores?.agronomique || 0}<span className="text-xs text-gray-500">/10</span></span>
                        </div>
                        {renderProgressBar(analysis.scores?.agronomique || 0)}
                      </div>
                      <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#2A2B30] print:bg-gray-50 print:border-gray-200">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Organoleptique</span>
                          <span className="text-xl font-bold text-[#00FF9D] print:text-black">{analysis.scores?.organoleptique || 0}<span className="text-xs text-gray-500">/10</span></span>
                        </div>
                        {renderProgressBar(analysis.scores?.organoleptique || 0)}
                      </div>
                    </div>

                    <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#2A2B30] print:bg-gray-50 print:border-gray-200">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Points Forts</h4>
                      <ul className="space-y-2">
                        {analysis.synthese?.points_forts?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300 print:text-gray-800 flex items-start gap-2">
                            <span className="text-[#00FF9D] print:text-black mt-0.5">✓</span> 
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#2A2B30] print:bg-gray-50 print:border-gray-200">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Points Faibles</h4>
                      <ul className="space-y-2">
                        {analysis.synthese?.points_faibles?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300 print:text-gray-800 flex items-start gap-2">
                            <span className="text-[#FF4444] print:text-black mt-0.5">✗</span> 
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="print:hidden">
                  <AIComparison variety={variety} allVarieties={allVarieties} />
                </div>
                
                {photos.length > 0 && (
                  <div className="bg-[#151619] text-white rounded-xl p-5 shadow-xl border border-[#2A2B30] mt-6 print:bg-white print:text-black print:border-gray-300 print:shadow-none">
                    <div className="flex items-center justify-between mb-4 border-b border-[#2A2B30] pb-2 print:border-gray-200">
                      <h3 className="text-xs font-mono text-[#00FF9D] uppercase tracking-widest flex items-center gap-2 print:text-black"><Camera size={14} /> Analyse Visuelle</h3>
                      {!photoSummary && (
                        <button onClick={handleGeneratePhotoSummary} disabled={generatingPhotoSummary} className="text-xs text-[#00CC7D] hover:text-[#00FF9D] transition-colors flex items-center gap-1 disabled:opacity-50 print:hidden">
                          {generatingPhotoSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          Générer
                        </button>
                      )}
                    </div>
                    
                    {photoSummary ? (
                      <p className="text-sm text-gray-300 print:text-gray-800 leading-relaxed whitespace-pre-wrap">{photoSummary}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic print:hidden">Générez un résumé des caractéristiques visuelles à partir des photos téléchargées.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
