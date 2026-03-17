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
    <div className="min-h-screen bg-[#E6E6E6] text-[#151619] print:bg-white">
      <div className="w-full max-w-7xl mx-auto bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden print:max-w-none print:shadow-none print:w-full">
        
        {view === 'home' && (
          <>
            <div className="bg-[#151619] text-white p-6 md:p-10 pb-8 md:pb-12 rounded-b-[2rem] shadow-lg relative z-10 print:hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#00FF9D]/20 rounded-2xl flex items-center justify-center border border-[#00FF9D]/30 shadow-[0_0_15px_rgba(0,255,157,0.15)]">
                    <Database className="text-[#00FF9D]" size={28} />
                  </div>
                  <div>
                    <h1 className="font-mono font-bold text-2xl md:text-3xl tracking-tight">BlueVault</h1>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Stockage Local</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setView('map')} className="p-3 bg-[#2A2B30] hover:bg-[#3A3B40] text-white rounded-xl flex items-center justify-center transition-colors" title="Carte">
                    <MapPin size={20} />
                  </button>
                  <button onClick={() => setView('dashboard')} className="p-3 bg-[#2A2B30] hover:bg-[#3A3B40] text-white rounded-xl flex items-center justify-center transition-colors" title="Tableau de bord">
                    <LayoutDashboard size={20} />
                  </button>
                  <button onClick={() => setIsCompareMode(!isCompareMode)} className={`p-3 rounded-xl flex items-center justify-center transition-colors ${isCompareMode ? 'bg-[#00FF9D] text-black shadow-[0_0_15px_rgba(0,255,157,0.3)]' : 'bg-[#2A2B30] text-white hover:bg-[#3A3B40]'}`} title="Comparer">
                    <GitCompare size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8 max-w-3xl">
                <div className="bg-[#0A0A0C] border border-[#2A2B30] rounded-2xl p-4 md:p-6 text-center hover:border-[#00FF9D]/50 transition-colors">
                  <div className="text-3xl md:text-4xl font-bold text-white font-mono">{varieties.length}</div>
                  <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-2">Variétés</div>
                </div>
                <div className="bg-[#0A0A0C] border border-[#2A2B30] rounded-2xl p-4 md:p-6 text-center hover:border-[#00FF9D]/50 transition-colors">
                  <div className="text-3xl md:text-4xl font-bold text-[#00FF9D] font-mono">{varieties.filter(v => v.ai_analysis).length}</div>
                  <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-2">Analysées</div>
                </div>
                <div className="bg-[#0A0A0C] border border-[#2A2B30] rounded-2xl p-4 md:p-6 text-center hover:border-[#00FF9D]/50 transition-colors">
                  <div className="text-3xl md:text-4xl font-bold text-blue-400 font-mono">{varieties.filter(v => v.photos && JSON.parse(v.photos).length > 0).length}</div>
                  <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-2">Photos</div>
                </div>
              </div>

              <div className="flex gap-3 max-w-md">
                <button onClick={() => { setSelectedVariety(null); setView('form'); }} className="flex-1 bg-[#00FF9D] hover:bg-[#00CC7D] text-black font-bold py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(0,255,157,0.2)] hover:shadow-[0_0_25px_rgba(0,255,157,0.4)]">
                  <Plus size={20} /> Nouvelle variété
                </button>
                <button onClick={() => setShowExport(true)} disabled={varieties.length === 0} className="px-5 bg-[#2A2B30] hover:bg-[#3A3B40] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50">
                  <Download size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#f5f5f5] print:hidden">
              {isCompareMode && (
                <div className="mb-6 bg-[#151619] text-white p-4 md:p-5 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 border border-[#00FF9D]/30">
                  <div className="text-sm md:text-base">
                    <span className="font-bold text-[#00FF9D] text-lg">{compareVarieties.length}</span> / 2 sélectionnés pour comparaison
                  </div>
                  <button 
                    onClick={startComparison}
                    disabled={compareVarieties.length < 2}
                    className="bg-[#00FF9D] text-black px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:bg-[#00CC7D] hover:shadow-[0_0_15px_rgba(0,255,157,0.4)]"
                  >
                    Comparer
                  </button>
                </div>
              )}

              <div className="mb-8 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Rechercher une variété..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-[#00FF9D] focus:ring-2 focus:ring-[#00FF9D]/20 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-5 py-3.5 rounded-xl flex items-center justify-center transition-all border font-medium text-sm gap-2 ${showFilters ? 'bg-[#151619] text-[#00FF9D] border-[#151619] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <SlidersHorizontal size={18} />
                    <span className="hidden md:inline">Filtres</span>
                  </button>
                </div>

                {showFilters && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-5 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Filtres Avancés</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Brix (°Bx)</label>
                        <div className="flex gap-3">
                          <input type="number" placeholder="Min" value={minBrix} onChange={e => setMinBrix(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00FF9D] focus:outline-none" />
                          <input type="number" placeholder="Max" value={maxBrix} onChange={e => setMaxBrix(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00FF9D] focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Rendement (kg)</label>
                        <div className="flex gap-3">
                          <input type="number" placeholder="Min" value={minYield} onChange={e => setMinYield(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00FF9D] focus:outline-none" />
                          <input type="number" placeholder="Max" value={maxYield} onChange={e => setMaxYield(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00FF9D] focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mr-2 shrink-0">Espèce:</span>
                      <button
                        onClick={() => setFilterSpecies('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${filterSpecies === 'all' ? 'bg-[#00FF9D] text-black shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        Toutes
                      </button>
                      {speciesList.map(s => (
                        <button
                          key={s}
                          onClick={() => setFilterSpecies(s)}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${filterSpecies === s ? 'bg-[#00FF9D] text-black shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mr-2 shrink-0">Trier:</span>
                    {[
                      { id: 'name', label: 'Nom' },
                      { id: 'brix', label: 'Brix' },
                      { id: 'updatedAt', label: 'Date' }
                    ].map(col => {
                      const activeSort = sortConfig.find(s => s.field === col.id);
                      const isPrimary = sortConfig[0]?.field === col.id;
                      return (
                        <button
                          key={col.id}
                          onClick={() => handleSort(col.id)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${isPrimary ? 'bg-[#151619] text-[#00FF9D] shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                      className={`bg-white border rounded-2xl p-5 flex flex-col cursor-pointer transition-all group ${isSelectedForCompare ? 'border-[#00FF9D] ring-2 ring-[#00FF9D]/30 shadow-lg scale-[1.02]' : 'border-gray-200 hover:border-[#00FF9D]/50 hover:shadow-lg hover:-translate-y-1'}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#00CC7D] transition-colors">{v.name}</h3>
                          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{v.species || 'Espèce inconnue'}</p>
                        </div>
                        {isCompareMode && (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isSelectedForCompare ? 'bg-[#00FF9D] border-[#00FF9D]' : 'border-gray-300'}`}>
                            {isSelectedForCompare && <Check size={14} className="text-black font-bold" />}
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <div className="text-[10px] text-gray-400 uppercase mb-1">Brix</div>
                          <div className="font-mono font-bold text-sm text-gray-800">{v.brix ? `${v.brix}°Bx` : '-'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <div className="text-[10px] text-gray-400 uppercase mb-1">Rendement</div>
                          <div className="font-mono font-bold text-sm text-gray-800">{v.yield_estimate ? `${v.yield_estimate}kg` : '-'}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          {v.photos && JSON.parse(v.photos).length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-md">
                              <Camera size={12} /> <span className="hidden sm:inline">Photos</span>
                            </div>
                          )}
                          {v.ai_analysis && (
                            <div className="flex items-center gap-1 text-xs text-[#00CC7D] bg-[#00FF9D]/10 px-2 py-1 rounded-md">
                              <Sparkles size={12} /> <span className="hidden sm:inline">IA</span>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {new Date(v.updatedAt || 0).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {paginated.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <Database size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Aucune variété trouvée</h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto">Essayez de modifier vos filtres ou ajoutez une nouvelle variété à votre base de données.</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 bg-white border border-gray-200 rounded-xl p-3 shadow-sm max-w-md mx-auto">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-1 text-sm font-medium"
                  >
                    <ChevronLeft size={18} /> Précédent
                  </button>
                  <span className="text-sm font-bold text-gray-600">
                    {currentPage} <span className="text-gray-400 font-normal">/ {totalPages}</span>
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-1 text-sm font-medium"
                  >
                    Suivant <ChevronRight size={18} />
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
