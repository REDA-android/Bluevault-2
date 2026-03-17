import React, { useState, useEffect } from 'react';
import { Variety } from './types';
import { getAI } from './utils';
import { Type, ThinkingLevel } from '@google/genai';
import { LogIn, LogOut, Plus, Search, Download, Database, Sparkles, Loader2, Camera, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import FormView from './components/FormView';
import DetailView from './components/DetailView';
import ExportModal from './components/ExportModal';
import Dashboard from './components/Dashboard';
import ComparisonView from './components/ComparisonView';
import MapView from './components/MapView';
import { LayoutDashboard, GitCompare, MapPin, SlidersHorizontal } from 'lucide-react';

export default function App() {
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'form' | 'detail' | 'dashboard' | 'compare' | 'map'>('home');
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [compareVarieties, setCompareVarieties] = useState<Variety[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState<string>('all');
  
  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minBrix, setMinBrix] = useState<string>('');
  const [maxBrix, setMaxBrix] = useState<string>('');
  const [minYield, setMinYield] = useState<string>('');
  const [maxYield, setMaxYield] = useState<string>('');

  const [sortConfig, setSortConfig] = useState<{ field: string, direction: 'asc' | 'desc' }[]>([
    { field: 'updatedAt', direction: 'desc' }
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExport, setShowExport] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => setCurrentPage(1), [search, filterSpecies, sortConfig, minBrix, maxBrix, minYield, maxYield]);

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('bluevault_varieties');
    if (saved) {
      try {
        setVarieties(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local varieties", e);
      }
    }
    setLoading(false);
  }, []);

  const toggleCompare = (v: Variety) => {
    setCompareVarieties(prev => {
      const exists = prev.find(p => p.id === v.id);
      if (exists) return prev.filter(p => p.id !== v.id);
      if (prev.length >= 2) return [prev[1], v];
      return [...prev, v];
    });
  };

  const startComparison = () => {
    if (compareVarieties.length === 2) {
      setView('compare');
    }
  };

  const handleSave = async (data: Partial<Variety>) => {
    try {
      const isNew = !data.id;
      const id = data.id || Date.now().toString(36) + Math.random().toString(36).slice(2,7);
      
      const payload: Variety = {
        ...data,
        id,
        uid: 'local-user',
        updatedAt: Date.now(),
        createdAt: isNew ? Date.now() : (data.createdAt || Date.now()),
        name: data.name || 'Unnamed Variety'
      } as Variety;

      setVarieties(prev => {
        const newVarieties = isNew ? [...prev, payload] : prev.map(v => v.id === id ? payload : v);
        localStorage.setItem('bluevault_varieties', JSON.stringify(newVarieties));
        return newVarieties;
      });

      setView('home');
      setSelectedVariety(null);
    } catch (e) {
      console.error("Save error:", e);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette variété ?")) return;
    try {
      setVarieties(prev => {
        const newVarieties = prev.filter(v => v.id !== id);
        localStorage.setItem('bluevault_varieties', JSON.stringify(newVarieties));
        return newVarieties;
      });
      setView('home');
      setSelectedVariety(null);
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handleAnalyze = async (variety: Variety) => {
    setAnalyzing(true);
    try {
      const photos = variety.photos ? JSON.parse(variety.photos) : [];
      const parts: any[] = [];
      
      for (const p of photos.slice(0, 3)) {
        parts.push({ inlineData: { data: p.data, mimeType: p.type } });
      }

      const prompt = `Tu es un expert en myrtilles (Vaccinium spp.). Analyse cette variété.
Données:
Nom: ${variety.name}
Espèce: ${variety.species || 'N/C'}
Calibre: ${variety.fruit_size || 'N/C'}mm
Brix: ${variety.brix || 'N/C'}°Bx
Arômes: ${variety.aroma || 'N/C'}
Sensibilités: ${variety.sensitivities || 'N/C'}`;

      parts.push({ text: prompt });

      const response = await getAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scores: {
                type: Type.OBJECT,
                properties: {
                  agronomique: { type: Type.NUMBER },
                  organoleptique: { type: Type.NUMBER }
                }
              },
              synthese: {
                type: Type.OBJECT,
                properties: {
                  points_forts: { type: Type.ARRAY, items: { type: Type.STRING } },
                  points_faibles: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        }
      });

      const analysisStr = response.text || "{}";
      const updatedVariety = { ...variety, ai_analysis: analysisStr };
      
      // Update in local storage directly without redirecting
      setVarieties(prev => {
        const newVarieties = prev.map(v => v.id === variety.id ? updatedVariety : v);
        localStorage.setItem('bluevault_varieties', JSON.stringify(newVarieties));
        return newVarieties;
      });
      
      // Update local state for immediate feedback
      setSelectedVariety(updatedVariety);
    } catch (e: any) {
      console.error("Analysis error:", e);
      alert("Erreur lors de l'analyse IA : " + (e.message || "Erreur inconnue"));
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E6E6E6]">
        <Loader2 className="animate-spin text-[#00FF9D]" size={48} />
      </div>
    );
  }

  const handleSort = (field: string) => {
    setSortConfig(prev => {
      const existing = prev.find(s => s.field === field);
      if (existing) {
        return [{ field, direction: existing.direction === 'asc' ? 'desc' : 'asc' }];
      }
      return [{ field, direction: 'asc' }, { field: 'name', direction: 'asc' }];
    });
  };

  const speciesList = Array.from(new Set(varieties.map(v => v.species).filter(Boolean))) as string[];

  const filtered = varieties
    .filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
      const matchesSpecies = filterSpecies === 'all' || v.species === filterSpecies;
      
      // Advanced Filters
      const vBrix = v.brix !== undefined ? Number(v.brix) : null;
      const vYield = v.yield_estimate !== undefined ? Number(v.yield_estimate) : null;
      
      const matchesMinBrix = minBrix === '' || (vBrix !== null && vBrix >= Number(minBrix));
      const matchesMaxBrix = maxBrix === '' || (vBrix !== null && vBrix <= Number(maxBrix));
      const matchesMinYield = minYield === '' || (vYield !== null && vYield >= Number(minYield));
      const matchesMaxYield = maxYield === '' || (vYield !== null && vYield <= Number(maxYield));

      return matchesSearch && matchesSpecies && matchesMinBrix && matchesMaxBrix && matchesMinYield && matchesMaxYield;
    });

  const sorted = [...filtered].sort((a, b) => {
    for (const config of sortConfig) {
      const { field, direction } = config;
      let res = 0;
      
      const valA = (a as any)[field];
      const valB = (b as any)[field];

      if (typeof valA === 'string') {
        res = (valA || '').localeCompare(valB || '');
      } else {
        res = (Number(valA) || 0) - (Number(valB) || 0);
      }

      if (res !== 0) {
        return direction === 'asc' ? res : -res;
      }
    }
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#E6E6E6] text-[#151619] flex justify-center print:bg-white">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden print:max-w-none print:shadow-none print:w-full">
        
        {view === 'home' && (
          <>
            <div className="bg-[#151619] text-white p-6 pb-8 rounded-b-3xl shadow-lg relative z-10 print:hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00FF9D]/20 rounded-xl flex items-center justify-center border border-[#00FF9D]/30">
                    <Database className="text-[#00FF9D]" size={20} />
                  </div>
                  <div>
                    <h1 className="font-mono font-bold text-lg tracking-tight">BlueVault</h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Stockage Local</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setView('map')} className="p-2 bg-[#2A2B30] hover:bg-[#3A3B40] text-white rounded-xl flex items-center justify-center transition-colors" title="Carte">
                    <MapPin size={18} />
                  </button>
                  <button onClick={() => setView('dashboard')} className="p-2 bg-[#2A2B30] hover:bg-[#3A3B40] text-white rounded-xl flex items-center justify-center transition-colors" title="Tableau de bord">
                    <LayoutDashboard size={18} />
                  </button>
                  <button onClick={() => setIsCompareMode(!isCompareMode)} className={`p-2 rounded-xl flex items-center justify-center transition-colors ${isCompareMode ? 'bg-[#00FF9D] text-black' : 'bg-[#2A2B30] text-white hover:bg-[#3A3B40]'}`} title="Comparer">
                    <GitCompare size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#0A0A0C] border border-[#2A2B30] rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white font-mono">{varieties.length}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Variétés</div>
                </div>
                <div className="bg-[#0A0A0C] border border-[#2A2B30] rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-[#00FF9D] font-mono">{varieties.filter(v => v.ai_analysis).length}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Analysées</div>
                </div>
                <div className="bg-[#0A0A0C] border border-[#2A2B30] rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400 font-mono">{varieties.filter(v => v.photos && JSON.parse(v.photos).length > 0).length}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Photos</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setSelectedVariety(null); setView('form'); }} className="flex-1 bg-[#00FF9D] hover:bg-[#00CC7D] text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(0,255,157,0.3)]">
                  <Plus size={18} /> Nouvelle variété
                </button>
                <button onClick={() => setShowExport(true)} disabled={varieties.length === 0} className="px-4 bg-[#2A2B30] hover:bg-[#3A3B40] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50">
                  <Download size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-[#f5f5f5] print:hidden">
              {isCompareMode && (
                <div className="mb-4 bg-[#151619] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                  <div className="text-xs">
                    <span className="font-bold text-[#00FF9D]">{compareVarieties.length}</span> / 2 sélectionnés
                  </div>
                  <button 
                    onClick={startComparison}
                    disabled={compareVarieties.length < 2}
                    className="bg-[#00FF9D] text-black px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 transition-all"
                  >
                    Comparer
                  </button>
                </div>
              )}

              <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Rechercher..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#00FF9D] focus:ring-1 focus:ring-[#00FF9D] shadow-sm"
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 rounded-xl flex items-center justify-center transition-colors border ${showFilters ? 'bg-[#151619] text-[#00FF9D] border-[#151619]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                </div>

                {showFilters && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Filtres Avancés</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Brix (°Bx)</label>
                        <div className="flex gap-2">
                          <input type="number" placeholder="Min" value={minBrix} onChange={e => setMinBrix(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                          <input type="number" placeholder="Max" value={maxBrix} onChange={e => setMaxBrix(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Rendement (kg)</label>
                        <div className="flex gap-2">
                          <input type="number" placeholder="Min" value={minYield} onChange={e => setMinYield(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                          <input type="number" placeholder="Max" value={maxYield} onChange={e => setMaxYield(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mr-2">Filtrer Espèce:</span>
                    <button
                      onClick={() => setFilterSpecies('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${filterSpecies === 'all' ? 'bg-[#00FF9D] text-black' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      Toutes
                    </button>
                    {speciesList.map(s => (
                      <button
                        key={s}
                        onClick={() => setFilterSpecies(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${filterSpecies === s ? 'bg-[#00FF9D] text-black' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mr-2">Trier par:</span>
                  {[
                    { id: 'name', label: 'Nom' },
                    { id: 'species', label: 'Espèce' },
                    { id: 'brix', label: 'Brix' },
                    { id: 'createdAt', label: 'Création' },
                    { id: 'updatedAt', label: 'Modification' }
                  ].map(col => {
                    const activeSort = sortConfig.find(s => s.field === col.id);
                    const isPrimary = sortConfig[0]?.field === col.id;
                    return (
                      <button
                        key={col.id}
                        onClick={() => handleSort(col.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${isPrimary ? 'bg-[#151619] text-[#00FF9D]' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {col.label}
                        {activeSort && (
                          activeSort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {paginated.map(v => {
                  const isSelectedForCompare = compareVarieties.some(p => p.id === v.id);
                  return (
                    <div 
                      key={v.id} 
                      onClick={() => {
                        if (isCompareMode) {
                          toggleCompare(v);
                        } else {
                          setSelectedVariety(v); 
                          setView('detail');
                        }
                      }} 
                      className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all group ${isSelectedForCompare ? 'border-[#00FF9D] ring-2 ring-[#00FF9D]/20 shadow-md' : 'border-gray-200 hover:border-[#00FF9D] hover:shadow-md'}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 text-base">{v.name}</h3>
                          <div className="flex items-center gap-1">
                            {v.photos && JSON.parse(v.photos).length > 0 && <Camera size={14} className="text-blue-500" title="Photos disponibles" />}
                            {v.ai_analysis && <Sparkles size={14} className="text-[#00CC7D]" title="Analyse IA disponible" />}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{v.species || 'Espèce inconnue'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isCompareMode && (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelectedForCompare ? 'bg-[#00FF9D] border-[#00FF9D]' : 'border-gray-300'}`}>
                            {isSelectedForCompare && <Check size={12} className="text-black font-bold" />}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {new Date(v.updatedAt || 0).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {paginated.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    Aucune variété trouvée.
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-medium text-gray-600">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'form' && (
          <FormView 
            initialData={selectedVariety} 
            onSave={handleSave} 
            onCancel={() => setView(selectedVariety ? 'detail' : 'home')}
            onDelete={selectedVariety ? () => handleDelete(selectedVariety.id) : undefined}
          />
        )}

        {view === 'detail' && selectedVariety && (
          <DetailView 
            variety={selectedVariety} 
            allVarieties={varieties}
            onBack={() => setView('home')} 
            onEdit={() => setView('form')}
            onAnalyze={() => handleAnalyze(selectedVariety)}
            analyzing={analyzing}
          />
        )}

        {view === 'dashboard' && (
          <Dashboard varieties={varieties} onClose={() => setView('home')} />
        )}

        {view === 'compare' && compareVarieties.length === 2 && (
          <ComparisonView v1={compareVarieties[0]} v2={compareVarieties[1]} onClose={() => setView('home')} />
        )}

        {view === 'map' && (
          <MapView varieties={varieties} onClose={() => setView('home')} />
        )}

        {showExport && (
          <ExportModal varieties={varieties} onClose={() => setShowExport(false)} />
        )}
      </div>
    </div>
  );
}
