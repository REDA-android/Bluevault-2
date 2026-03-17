import React, { useMemo, useState, useEffect } from 'react';
import { Variety } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { LayoutDashboard, TrendingUp, PieChart as PieIcon, Activity, Sparkles, Loader2, X } from 'lucide-react';
import { getAI } from '../utils';

interface DashboardProps {
  varieties: Variety[];
  onClose: () => void;
}

const COLORS = ['#00FF9D', '#00CC7D', '#00995D', '#00663E', '#00331F'];

export default function Dashboard({ varieties, onClose }: DashboardProps) {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);

  // 1. Brix Data
  const brixData = useMemo(() => {
    const counts: Record<string, number> = { 'Low (<10)': 0, 'Medium (10-14)': 0, 'High (14-18)': 0, 'Ultra (>18)': 0 };
    varieties.forEach(v => {
      if (!v.brix) return;
      if (v.brix < 10) counts['Low (<10)']++;
      else if (v.brix < 14) counts['Medium (10-14)']++;
      else if (v.brix < 18) counts['High (14-18)']++;
      else counts['Ultra (>18)']++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [varieties]);

  // 2. Species Data
  const speciesData = useMemo(() => {
    const counts: Record<string, number> = {};
    varieties.forEach(v => {
      const s = v.species || 'Inconnue';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [varieties]);

  // 3. Scatter Data (Brix vs Yield)
  const scatterData = useMemo(() => {
    return varieties
      .filter(v => v.brix && v.yield_estimate)
      .map(v => ({
        x: v.brix,
        y: v.yield_estimate,
        name: v.name
      }));
  }, [varieties]);

  const generateAISummary = async () => {
    if (varieties.length === 0) return;
    setLoadingAI(true);
    try {
      const summaryData = varieties.map(v => ({
        name: v.name,
        brix: v.brix,
        yield: v.yield_estimate,
        species: v.species
      }));
      
      const prompt = `Analyse cette collection de ${varieties.length} variétés de myrtilles. 
      Données: ${JSON.stringify(summaryData.slice(0, 20))}
      Fais une synthèse rapide (3-4 phrases) des points forts de la collection (ex: "Collection riche en variétés à haut Brix", "Dominance de l'espèce X"). 
      Sois professionnel et technique.`;

      const response = await getAI().models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt
      });
      setAiSummary(response.text || '');
    } catch (e) {
      console.error(e);
      setAiSummary("Impossible de générer la synthèse IA pour le moment.");
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    generateAISummary();
  }, []);

  return (
    <div className="fixed inset-0 bg-[#E6E6E6] z-50 flex flex-col overflow-hidden">
      <div className="bg-[#151619] text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-[#00FF9D]" size={20} />
          <h2 className="font-mono text-sm uppercase tracking-widest">Tableau de Bord Analytique</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI Summary Card */}
        <div className="bg-[#151619] text-white rounded-2xl p-5 shadow-xl border border-[#2A2B30] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-[#00FF9D]" size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#00FF9D]">Synthèse IA de la Collection</h3>
            </div>
            {loadingAI ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm italic">
                <Loader2 className="animate-spin" size={16} />
                Analyse de la base de données en cours...
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-gray-300">
                {aiSummary || "Ajoutez des variétés pour voir une analyse globale."}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Brix Distribution */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-blue-500" size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Distribution du Brix (°Bx)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brixData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#151619', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                    itemStyle={{ color: '#00FF9D' }}
                  />
                  <Bar dataKey="value" fill="#00FF9D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Species Breakdown */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="text-purple-500" size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Répartition par Espèce</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={speciesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {speciesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#151619', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Brix vs Yield Scatter */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-orange-500" size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Corrélation Brix vs Rendement</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" dataKey="x" name="Brix" unit="°Bx" fontSize={10} />
                  <YAxis type="number" dataKey="y" name="Rendement" unit="kg" fontSize={10} />
                  <ZAxis type="category" dataKey="name" name="Variété" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#151619', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                  <Scatter name="Variétés" data={scatterData} fill="#00FF9D" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
