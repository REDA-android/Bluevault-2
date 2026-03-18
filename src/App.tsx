import React, { useState, useEffect, useRef } from 'react';
import { Variety } from './types';
import { getAI } from './utils';
import { Type, ThinkingLevel } from '@google/genai';
import { LogIn, LogOut, Plus, Search, Download, Database, Sparkles, Loader2, Camera, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, X, Star, Upload, Leaf, Beaker } from 'lucide-react';
import FormView from './components/FormView';
import DetailView from './components/DetailView';
import ExportModal from './components/ExportModal';
import Dashboard from './components/Dashboard';
import ComparisonView from './components/ComparisonView';
import MapView from './components/MapView';
import GalleryView from './components/GalleryView';
import SettingsView from './components/SettingsView';
import PrintAllView from './components/PrintAllView';
import { LayoutDashboard, GitCompare, MapPin, SlidersHorizontal, Image as ImageIcon, Settings, Printer } from 'lucide-react';
import Papa from 'papaparse';

export default function App() {
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'form' | 'detail' | 'dashboard' | 'compare' | 'map' | 'gallery' | 'settings' | 'printAll'>('home');
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [compareVarieties, setCompareVarieties] = useState<Variety[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState<string>('all');
  const [filterColor, setFilterColor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
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
  const [magicFilter, setMagicFilter] = useState<string[] | null>(null);
  const [isMagicSearching, setIsMagicSearching] = useState(false);
  const [magicQuery, setMagicQuery] = useState('');
  const ITEMS_PER_PAGE = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setCurrentPage(1), [search, filterSpecies, filterColor, filterStatus, sortConfig, minBrix, maxBrix, minYield, maxYield]);

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
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
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

  const handleMagicSearch = async () => {
    if (!magicQuery.trim()) return;
    setIsMagicSearching(true);
    try {
      const ai = getAI();
      const prompt = `Tu es un expert en myrtilles. Analyse la requête suivante et retourne UNIQUEMENT un tableau JSON des IDs des variétés qui correspondent le mieux.
      
      Requête: "${magicQuery}"
      
      Variétés disponibles (ID, Nom, Espèce, Couleur, Brix, Rendement, Notes):
      ${varieties.map(v => `${v.id}: ${v.name}, ${v.species}, ${v.color}, Brix:${v.brix}, Rendement:${v.yield_estimate}, Notes:${v.free_notes}`).join('\n')}
      
      Réponds UNIQUEMENT avec le tableau JSON, par exemple: ["id1", "id2"]`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      
      const ids = JSON.parse(response.text || "[]");
      setMagicFilter(ids);
      setSearch('');
      setFilterSpecies('all');
      setFilterColor('all');
      setFilterStatus('all');
    } catch (e) {
      console.error("Magic Search error:", e);
    } finally {
      setIsMagicSearching(false);
    }
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedVarieties = results.data.map((row: any) => {
          return {
            id: row.id || crypto.randomUUID(),
            uid: 'local',
            name: row.name || 'Inconnue',
            species: row.species || '',
            breeder: row.breeder || '',
            site: row.site || '',
            flowering_date: row.flowering_date || '',
            maturity_date: row.maturity_date || '',
            precocity: row.precocity || '',
            fruit_size: row.fruit_size ? Number(row.fruit_size) : undefined,
            color: row.color || '',
            bloom: row.bloom || '',
            fruit_shape: row.fruit_shape || '',
            brix: row.brix ? Number(row.brix) : undefined,
            firmness: row.firmness || '',
            acidity: row.acidity || '',
            aroma: row.aroma || '',
            vigor: row.vigor || '',
            habit: row.habit || '',
            yield_estimate: row.yield_estimate ? Number(row.yield_estimate) : undefined,
            harvest_start: row.harvest_start ? Number(row.harvest_start) : undefined,
            harvest_end: row.harvest_end ? Number(row.harvest_end) : undefined,
            status: row.status || 'active',
            rating: row.rating ? Number(row.rating) : undefined,
            hardiness_zone: row.hardiness_zone || '',
            sweetness_score: row.sweetness_score ? Number(row.sweetness_score) : undefined,
            acidity_score: row.acidity_score ? Number(row.acidity_score) : undefined,
            firmness_score: row.firmness_score ? Number(row.firmness_score) : undefined,
            size_score: row.size_score ? Number(row.size_score) : undefined,
            aroma_score: row.aroma_score ? Number(row.aroma_score) : undefined,
            sensitivities: row.sensitivities || '',
            free_notes: row.free_notes || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as Variety;
        });

        setVarieties(prev => {
          const newVarieties = [...prev, ...importedVarieties];
          localStorage.setItem('bluevault_varieties', JSON.stringify(newVarieties));
          return newVarieties;
        });
        alert(`${importedVarieties.length} variétés importées avec succès !`);
      },
      error: (error: any) => {
        console.error("CSV Import Error:", error);
        alert("Erreur lors de l'importation du CSV.");
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const speciesList = Array.from(new Set(varieties.map(v => v.species).filter(Boolean))) as string[];
  const colorList = Array.from(new Set(varieties.map(v => v.color).filter(Boolean))) as string[];

  const filtered = varieties
    .filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
      const matchesSpecies = filterSpecies === 'all' || v.species === filterSpecies;
      const matchesColor = filterColor === 'all' || v.color === filterColor;
      const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
      const matchesMagic = !magicFilter || magicFilter.includes(v.id);
      
      // Advanced Filters
      const vBrix = v.brix !== undefined ? Number(v.brix) : null;
      const vYield = v.yield_estimate !== undefined ? Number(v.yield_estimate) : null;
      
      const matchesMinBrix = minBrix === '' || (vBrix !== null && vBrix >= Number(minBrix));
      const matchesMaxBrix = maxBrix === '' || (vBrix !== null && vBrix <= Number(maxBrix));
      const matchesMinYield = minYield === '' || (vYield !== null && vYield >= Number(minYield));
      const matchesMaxYield = maxYield === '' || (vYield !== null && vYield <= Number(maxYield));

      return matchesSearch && matchesSpecies && matchesColor && matchesStatus && matchesMagic && matchesMinBrix && matchesMaxBrix && matchesMinYield && matchesMaxYield;
    });

  const sorted = [...filtered].sort((a, b) => {
    for (const config of sortConfig) {
      const { field, direction } = config;
      let res = 0;
      
      const valA = (a as any)[field];
      const valB = (b as any)[field];

      if (field === 'flowering_date' || field === 'maturity_date') {
        const dateA = valA ? new Date(valA).getTime() : 0;
        const dateB = valB ? new Date(valB).getTime() : 0;
        res = dateA - dateB;
      } else if (typeof valA === 'string') {
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
    <div className="min-h-screen bg-bg-surround text-text-primary font-sans selection:bg-accent/30">
      <div className="w-full max-w-7xl mx-auto min-h-screen flex flex-col relative print:max-w-none print:w-full">
        
        {view === 'home' && (
          <>
            <header className="sticky top-0 z-30 glass border-b border-card-border px-6 py-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20">
                  <Database className="text-accent" size={20} />
                </div>
                <div>
                  <h1 className="font-bold text-xl tracking-tight">BlueVault</h1>
                  <p className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">Technical Registry</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <nav className="hidden md:flex items-center bg-bg-surround/50 p-1 rounded-xl border border-card-border mr-4">
                  {[
                    { id: 'map', icon: MapPin, label: 'Carte' },
                    { id: 'gallery', icon: ImageIcon, label: 'Galerie' },
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Stats' },
                    { id: 'settings', icon: Settings, label: 'Config' },
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setView(item.id as any)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white transition-all"
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </nav>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsCompareMode(!isCompareMode)} 
                    className={`p-2.5 rounded-xl transition-all border ${isCompareMode ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-white text-text-secondary border-card-border hover:border-accent/50'}`}
                    title="Comparer"
                  >
                    <GitCompare size={18} />
                  </button>
                  <button onClick={() => setView('printAll')} disabled={varieties.length === 0} className="p-2.5 bg-white border border-card-border text-text-secondary hover:text-text-primary rounded-xl transition-all disabled:opacity-50" title="Imprimer tout">
                    <Printer size={18} />
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-1 p-6 md:p-10 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                <div className="lg:col-span-3">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight mb-2">Variétés de Myrtilles</h2>
                      <p className="text-text-secondary text-sm max-w-xl">Gestion technique et analytique du patrimoine variétal. Suivi des performances, analyses IA et archivage photographique.</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setSelectedVariety(null); setView('form'); }} className="bg-accent hover:bg-accent-hover text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-accent/20 neo-shadow-hover">
                        <Plus size={20} /> Nouvelle variété
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mb-8">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                        <input 
                          type="text" 
                          placeholder="Rechercher par nom, espèce..." 
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full bg-white border border-card-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all neo-shadow"
                        />
                      </div>
                      <div className="relative flex-1">
                        <Sparkles className={`absolute left-4 top-1/2 -translate-y-1/2 ${magicFilter ? 'text-accent' : 'text-text-secondary'}`} size={18} />
                        <input 
                          type="text" 
                          placeholder="Recherche magique (ex: variétés sucrées en essai)..." 
                          value={magicQuery}
                          onChange={(e) => setMagicQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleMagicSearch()}
                          className="w-full bg-white border border-card-border rounded-xl pl-12 pr-24 py-3 text-sm focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all neo-shadow"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {magicFilter && (
                            <button onClick={() => { setMagicFilter(null); setMagicQuery(''); }} className="p-1.5 text-text-secondary hover:text-danger transition-colors">
                              <X size={16} />
                            </button>
                          )}
                          <button 
                            onClick={handleMagicSearch}
                            disabled={isMagicSearching}
                            className="bg-dark-bg text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {isMagicSearching ? <Loader2 size={12} className="animate-spin" /> : 'IA Filter'}
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-5 py-3 rounded-xl flex items-center justify-center transition-all border font-medium text-sm gap-2 neo-shadow ${showFilters ? 'bg-dark-bg text-accent border-dark-bg' : 'bg-white text-text-primary border-card-border hover:bg-bg-surround'}`}
                      >
                        <SlidersHorizontal size={18} />
                        Filtres
                      </button>
                    </div>

                    {showFilters && (
                      <div className="bg-white border border-card-border rounded-2xl p-6 neo-shadow animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">Métriques Physico-chimiques</label>
                            <div className="space-y-4">
                              <div>
                                <span className="text-xs text-text-secondary mb-1.5 block">Brix (°Bx)</span>
                                <div className="flex gap-2">
                                  <input type="number" placeholder="Min" value={minBrix} onChange={e => setMinBrix(e.target.value)} className="w-full bg-bg-surround/50 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                                  <input type="number" placeholder="Max" value={maxBrix} onChange={e => setMaxBrix(e.target.value)} className="w-full bg-bg-surround/50 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-text-secondary mb-1.5 block">Rendement (kg)</span>
                                <div className="flex gap-2">
                                  <input type="number" placeholder="Min" value={minYield} onChange={e => setMinYield(e.target.value)} className="w-full bg-bg-surround/50 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                                  <input type="number" placeholder="Max" value={maxYield} onChange={e => setMaxYield(e.target.value)} className="w-full bg-bg-surround/50 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">Classification & Statut</label>
                            <div className="space-y-4">
                              <div>
                                <span className="text-xs text-text-secondary mb-1.5 block">Espèce</span>
                                <select value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)} className="w-full bg-bg-surround/50 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none">
                                  <option value="all">Toutes les espèces</option>
                                  {Array.from(new Set(varieties.map(v => v.species).filter(Boolean))).map(s => (
                                    <option key={s} value={s!}>{s}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <span className="text-xs text-text-secondary mb-1.5 block">Statut</span>
                                <div className="flex gap-2">
                                  {['all', 'active', 'trial', 'archived'].map(s => (
                                    <button 
                                      key={s}
                                      onClick={() => setFilterStatus(s)}
                                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${filterStatus === s ? 'bg-dark-bg text-accent border-dark-bg' : 'bg-white text-text-secondary border-card-border hover:border-accent/30'}`}
                                    >
                                      {s === 'all' ? 'Tous' : s === 'active' ? 'Actif' : s === 'trial' ? 'Essai' : 'Arch.'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">Tri & Affichage</label>
                            <div className="space-y-4">
                              <div>
                                <span className="text-xs text-text-secondary mb-1.5 block">Critère de tri</span>
                                <select 
                                  value={sortConfig[0].field} 
                                  onChange={e => setSortConfig([{ field: e.target.value, direction: sortConfig[0].direction }])}
                                  className="w-full bg-bg-surround/50 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                                >
                                  <option value="name">Nom</option>
                                  <option value="brix">Taux de sucre (Brix)</option>
                                  <option value="yield_estimate">Rendement</option>
                                  <option value="flowering_date">Date de floraison</option>
                                  <option value="maturity_date">Date de maturité</option>
                                  <option value="updatedAt">Dernière modification</option>
                                  <option value="createdAt">Date de création</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setSortConfig([{ ...sortConfig[0], direction: 'asc' }])}
                                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${sortConfig[0].direction === 'asc' ? 'bg-dark-bg text-accent border-dark-bg' : 'bg-white text-text-secondary border-card-border'}`}
                                >
                                  Croissant
                                </button>
                                <button 
                                  onClick={() => setSortConfig([{ ...sortConfig[0], direction: 'desc' }])}
                                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${sortConfig[0].direction === 'desc' ? 'bg-dark-bg text-accent border-dark-bg' : 'bg-white text-text-secondary border-card-border'}`}
                                >
                                  Décroissant
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-dark-bg text-white rounded-2xl p-6 neo-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent">Global Stats</h3>
                      <Database size={14} className="text-text-secondary" />
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-3xl font-bold font-mono">{varieties.length}</div>
                          <div className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Total Variétés</div>
                        </div>
                        <div className="w-12 h-1 bg-accent/20 rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-3xl font-bold font-mono text-accent">{varieties.filter(v => v.ai_analysis).length}</div>
                          <div className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Analysées IA</div>
                        </div>
                        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${(varieties.filter(v => v.ai_analysis).length / (varieties.length || 1)) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-card-border rounded-2xl p-6 neo-shadow">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4">Actions Rapides</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 bg-bg-surround/50 border border-card-border rounded-xl hover:border-accent/50 transition-all group">
                        <Upload size={20} className="text-text-secondary group-hover:text-accent mb-2" />
                        <span className="text-[10px] font-bold uppercase">Import</span>
                      </button>
                      <button onClick={() => setShowExport(true)} disabled={varieties.length === 0} className="flex flex-col items-center justify-center p-4 bg-bg-surround/50 border border-card-border rounded-xl hover:border-accent/50 transition-all group disabled:opacity-50">
                        <Download size={20} className="text-text-secondary group-hover:text-accent mb-2" />
                        <span className="text-[10px] font-bold uppercase">Export</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      className={`bg-white border rounded-2xl p-6 flex flex-col cursor-pointer transition-all group neo-shadow-hover ${isSelectedForCompare ? 'border-accent ring-4 ring-accent/10 scale-[1.02]' : 'border-card-border'}`}
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {v.status === 'active' && <Leaf size={14} className="text-accent" />}
                            {v.status === 'trial' && <Beaker size={14} className="text-blue-500" />}
                            {v.status === 'archived' && <Star size={14} className="text-amber-500" />}
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                              v.status === 'active' ? 'bg-accent/10 text-accent' : 
                              v.status === 'trial' ? 'bg-blue-100 text-blue-700' : 
                              'bg-bg-surround text-text-secondary'
                            }`}>
                              {v.status === 'active' ? 'Actif' : v.status === 'trial' ? 'Essai' : 'Archivé'}
                            </span>
                          </div>
                          <h3 className="font-bold text-text-primary text-xl truncate group-hover:text-accent transition-colors">{v.name}</h3>
                          <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1 font-medium">{v.species || 'Espèce non spécifiée'}</p>
                        </div>
                        {isCompareMode ? (
                          <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${isSelectedForCompare ? 'bg-accent border-accent text-white' : 'border-card-border bg-bg-surround'}`}>
                            {isSelectedForCompare && <Check size={18} strokeWidth={3} />}
                          </div>
                        ) : (
                          v.rating && (
                            <div className="flex gap-0.5 bg-bg-surround px-2 py-1 rounded-lg">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={10} fill={s <= v.rating! ? '#FACC15' : 'none'} className={s <= v.rating! ? 'text-yellow-400' : 'text-gray-300'} />
                              ))}
                            </div>
                          )
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-bg-surround/50 rounded-xl p-3 border border-card-border/50">
                          <div className="text-[9px] text-text-secondary uppercase tracking-widest mb-1 font-bold">Brix</div>
                          <div className="font-mono font-bold text-base text-text-primary">{v.brix ? `${v.brix}°` : '--'}</div>
                        </div>
                        <div className="bg-bg-surround/50 rounded-xl p-3 border border-card-border/50">
                          <div className="text-[9px] text-text-secondary uppercase tracking-widest mb-1 font-bold">Yield</div>
                          <div className="font-mono font-bold text-base text-text-primary">{v.yield_estimate ? `${v.yield_estimate}kg` : '--'}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-5 border-t border-card-border">
                        <div className="flex items-center gap-2">
                          {v.photos && JSON.parse(v.photos).length > 0 && (
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">
                              <Camera size={12} /> {JSON.parse(v.photos).length}
                            </div>
                          )}
                          {v.ai_analysis && (
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded-lg">
                              <Sparkles size={12} /> AI
                            </div>
                          )}
                        </div>
                        <div className="text-[9px] text-text-secondary font-mono">
                          MOD: {new Date(v.updatedAt || 0).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {paginated.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-card-border neo-shadow">
                  <Database size={48} className="mx-auto text-text-secondary mb-4 opacity-20" />
                  <h3 className="text-lg font-bold text-text-primary mb-2">Aucune variété trouvée</h3>
                  <p className="text-text-secondary text-sm max-w-md mx-auto">Essayez de modifier vos filtres ou ajoutez une nouvelle variété à votre base de données technique.</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center mt-12 gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-3 rounded-xl bg-white border border-card-border hover:border-accent disabled:opacity-50 transition-all neo-shadow"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1 bg-white border border-card-border px-4 py-2 rounded-xl neo-shadow">
                    <span className="text-sm font-bold text-text-primary">{currentPage}</span>
                    <span className="text-xs text-text-secondary">/ {totalPages}</span>
                  </div>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-xl bg-white border border-card-border hover:border-accent disabled:opacity-50 transition-all neo-shadow"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

              {isCompareMode && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl">
                  <div className="glass border border-accent/30 rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-accent/20 animate-in slide-in-from-bottom-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-accent/30">
                        <GitCompare size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-0.5">Mode Comparaison</div>
                        <div className="text-sm font-medium">
                          {compareVarieties.length === 0 ? (
                            <span className="text-text-secondary">Sélectionnez 2 variétés à comparer</span>
                          ) : compareVarieties.length === 1 ? (
                            <span><span className="font-bold text-accent">{compareVarieties[0].name}</span> sélectionnée. Choisissez-en une autre.</span>
                          ) : (
                            <span>Comparer <span className="font-bold text-accent">{compareVarieties[0].name}</span> vs <span className="font-bold text-accent">{compareVarieties[1].name}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setIsCompareMode(false); setCompareVarieties([]); }}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={startComparison}
                        disabled={compareVarieties.length !== 2}
                        className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-accent/20"
                      >
                        Lancer l'analyse
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'gallery' && (
          <div className="flex-1 overflow-y-auto bg-[#f5f5f5]">
            <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-medium">
                <ChevronLeft size={20} /> Retour
              </button>
            </div>
            <GalleryView varieties={varieties} onSelectVariety={(v) => { setSelectedVariety(v); setView('detail'); }} />
          </div>
        )}

        {view === 'settings' && (
          <div className="flex-1 overflow-y-auto bg-[#f5f5f5]">
            <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-medium">
                <ChevronLeft size={20} /> Retour
              </button>
            </div>
            <SettingsView 
              onClearData={() => {
                setVarieties([]);
                localStorage.removeItem('bluevault_varieties');
                alert("Toutes les données ont été effacées.");
                setView('home');
              }}
              onLoadSampleData={() => {
                const sampleData: Variety[] = [
                  {
                    id: crypto.randomUUID(),
                    uid: 'local',
                    name: 'Duke',
                    species: 'Vaccinium corymbosum',
                    breeder: 'USDA',
                    site: 'Champ Nord',
                    flowering_date: '2023-04-15',
                    maturity_date: '2023-06-20',
                    precocity: 'Très précoce',
                    fruit_size: 18,
                    color: 'Bleu clair',
                    bloom: 'Fort',
                    fruit_shape: 'Rond',
                    brix: 11,
                    firmness: 'Très ferme',
                    acidity: 'Faible',
                    aroma: 'Doux',
                    vigor: 'Forte',
                    habit: 'Érigé',
                    yield_estimate: 6,
                    harvest_start: 5,
                    harvest_end: 6,
                    status: 'active',
                    rating: 4,
                    hardiness_zone: '4-7',
                    sweetness_score: 3,
                    acidity_score: 2,
                    firmness_score: 5,
                    size_score: 4,
                    aroma_score: 3,
                    sensitivities: 'Sensible au gel tardif',
                    free_notes: 'Excellente variété précoce pour le marché frais.',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  },
                  {
                    id: crypto.randomUUID(),
                    uid: 'local',
                    name: 'Bluecrop',
                    species: 'Vaccinium corymbosum',
                    breeder: 'USDA',
                    site: 'Champ Sud',
                    flowering_date: '2023-05-01',
                    maturity_date: '2023-07-15',
                    precocity: 'Mi-saison',
                    fruit_size: 16,
                    color: 'Bleu moyen',
                    bloom: 'Moyen',
                    fruit_shape: 'Légèrement aplati',
                    brix: 12,
                    firmness: 'Ferme',
                    acidity: 'Moyenne',
                    aroma: 'Classique',
                    vigor: 'Très forte',
                    habit: 'Étalé',
                    yield_estimate: 8,
                    harvest_start: 6,
                    harvest_end: 7,
                    status: 'active',
                    rating: 5,
                    hardiness_zone: '4-7',
                    sweetness_score: 4,
                    acidity_score: 3,
                    firmness_score: 4,
                    size_score: 3,
                    aroma_score: 4,
                    sensitivities: 'Tolérant à la sécheresse',
                    free_notes: 'La variété la plus plantée au monde. Très fiable.',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  }
                ];
                setVarieties(prev => {
                  const newVarieties = [...prev, ...sampleData];
                  localStorage.setItem('bluevault_varieties', JSON.stringify(newVarieties));
                  return newVarieties;
                });
                alert("Données de démonstration chargées avec succès.");
                setView('home');
              }}
            />
          </div>
        )}

        {view === 'printAll' && (
          <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
            <div className="p-4 bg-gray-100 border-b border-gray-200 sticky top-0 z-[101] flex justify-between items-center print:hidden">
              <h2 className="font-bold text-gray-800">Préparation de l'impression...</h2>
              <button onClick={() => setView('home')} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors">
                Annuler
              </button>
            </div>
            <PrintAllView varieties={varieties} onClose={() => setView('home')} />
          </div>
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
