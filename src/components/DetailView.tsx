import React, { useState } from 'react';
import { Variety, Photo } from '../types';
import { ArrowLeft, Edit3, Sparkles, Image as ImageIcon, Info, Activity, Loader2, MapPin, Camera } from 'lucide-react';
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
}

export default function DetailView({ variety, allVarieties, onBack, onEdit, onAnalyze, analyzing }: DetailViewProps) {
  const [tab, setTab] = useState<'info' | 'photos' | 'ai'>('info');
  const [photoSummary, setPhotoSummary] = useState<string | null>(null);
  const [generatingPhotoSummary, setGeneratingPhotoSummary] = useState(false);
  const photos: Photo[] = variety.photos ? JSON.parse(variety.photos) : [];
  const analysis = variety.ai_analysis ? JSON.parse(variety.ai_analysis) : null;

  const firstPhotoWithGPS = photos.find(p => p.exif?.lat && p.exif?.lng);

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

  const renderProgressBar = (score: number, max: number = 10) => {
    const percentage = Math.min(100, Math.max(0, (score / max) * 100));
    return (
      <div className="w-full bg-[#2A2B30] rounded-full h-2 mt-2 overflow-hidden">
        <div 
          className="bg-[#00FF9D] h-2 rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#E6E6E6] text-[#151619]">
      <div className="bg-[#151619] text-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <button onClick={onBack} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors"><ArrowLeft size={20} /></button>
        <div className="relative group flex items-center justify-center">
          <h2 className="font-mono text-sm uppercase tracking-widest truncate max-w-[200px] cursor-help">{variety.name}</h2>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-max bg-[#2A2B30] text-white text-[10px] px-2 py-1 rounded shadow-lg z-50 border border-gray-700">
            {variety.ai_analysis ? 'Analyse IA disponible' : 'Analyse IA non générée'}
          </div>
        </div>
        <button onClick={onEdit} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors text-[#00FF9D]"><Edit3 size={20} /></button>
      </div>

      <div className="flex border-b border-gray-300 bg-white sticky top-[60px] z-10 shadow-sm">
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

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Identité & Localisation</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div><span className="text-gray-400 block text-xs">Espèce</span><span className="font-medium">{variety.species || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Obtenteur</span><span className="font-medium">{variety.breeder || '-'}</span></div>
                <div className="col-span-2">
                  <span className="text-gray-400 block text-xs">Site / Localisation</span>
                  <span className="font-medium">{variety.site || '-'}</span>
                  {firstPhotoWithGPS && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${firstPhotoWithGPS.exif!.lat},${firstPhotoWithGPS.exif!.lng}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#00CC7D] flex items-center gap-1 text-xs hover:underline mt-1 w-max"
                    >
                      <MapPin size={12} /> Voir sur la carte (GPS)
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Phénologie & Plante</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div><span className="text-gray-400 block text-xs">Floraison</span><span className="font-medium">{variety.flowering_date ? new Date(variety.flowering_date).toLocaleDateString() : '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Maturité</span><span className="font-medium">{variety.maturity_date ? new Date(variety.maturity_date).toLocaleDateString() : '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Précocité</span><span className="font-medium">{variety.precocity || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Vigueur</span><span className="font-medium">{variety.vigor || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Port</span><span className="font-medium">{variety.habit || '-'}</span></div>
                <div><span className="text-gray-400 block text-xs">Rendement est.</span><span className="font-medium">{variety.yield_estimate ? `${variety.yield_estimate} kg/pl` : '-'}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
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
                <div className="col-span-2"><span className="text-gray-400 block text-xs">Sensibilités</span><span className="font-medium">{variety.sensitivities || '-'}</span></div>
              </div>
            </div>

            {variety.free_notes && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Notes Libres</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{variety.free_notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'photos' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
            <PhotoGallery photos={photos} />
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-6">
            {!analysis ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200 flex flex-col items-center">
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
                <div className="bg-[#151619] text-white rounded-xl p-5 shadow-xl border border-[#2A2B30]">
                  <div className="flex items-center justify-between mb-4 border-b border-[#2A2B30] pb-2">
                    <h3 className="text-xs font-mono text-[#00FF9D] uppercase tracking-widest flex items-center gap-2"><Sparkles size={14} /> Synthèse IA</h3>
                    <button onClick={onAnalyze} disabled={analyzing} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                      {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                      Actualiser
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#2A2B30]">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Agronomique</span>
                          <span className="text-xl font-bold text-[#00FF9D]">{analysis.scores?.agronomique || 0}<span className="text-xs text-gray-500">/10</span></span>
                        </div>
                        {renderProgressBar(analysis.scores?.agronomique || 0)}
                      </div>
                      <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#2A2B30]">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Organoleptique</span>
                          <span className="text-xl font-bold text-[#00FF9D]">{analysis.scores?.organoleptique || 0}<span className="text-xs text-gray-500">/10</span></span>
                        </div>
                        {renderProgressBar(analysis.scores?.organoleptique || 0)}
                      </div>
                    </div>

                    <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#2A2B30]">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Points Forts</h4>
                      <ul className="space-y-2">
                        {analysis.synthese?.points_forts?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-[#00FF9D] mt-0.5">✓</span> 
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#2A2B30]">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Points Faibles</h4>
                      <ul className="space-y-2">
                        {analysis.synthese?.points_faibles?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-[#FF4444] mt-0.5">✗</span> 
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <AIComparison variety={variety} allVarieties={allVarieties} />
                
                {photos.length > 0 && (
                  <div className="bg-[#151619] text-white rounded-xl p-5 shadow-xl border border-[#2A2B30] mt-6">
                    <div className="flex items-center justify-between mb-4 border-b border-[#2A2B30] pb-2">
                      <h3 className="text-xs font-mono text-[#00FF9D] uppercase tracking-widest flex items-center gap-2"><Camera size={14} /> Analyse Visuelle</h3>
                      {!photoSummary && (
                        <button onClick={handleGeneratePhotoSummary} disabled={generatingPhotoSummary} className="text-xs text-[#00CC7D] hover:text-[#00FF9D] transition-colors flex items-center gap-1 disabled:opacity-50">
                          {generatingPhotoSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          Générer
                        </button>
                      )}
                    </div>
                    
                    {photoSummary ? (
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{photoSummary}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Générez un résumé des caractéristiques visuelles à partir des photos téléchargées.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
