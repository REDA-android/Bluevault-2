import React, { useState, useEffect } from 'react';
import { Variety } from '../types';
import { getAI } from '../utils';
import { ThinkingLevel, Type } from '@google/genai';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIComparisonProps {
  variety: Variety;
  allVarieties: Variety[];
}

export default function AIComparison({ variety, allVarieties }: AIComparisonProps) {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  const others = allVarieties.filter(v => v.id !== variety.id && v.ai_analysis);

  const runComparison = async () => {
    if (!variety.ai_analysis) {
      setError("Cette variété doit d'abord être analysée par l'IA.");
      return;
    }
    if (others.length === 0) {
      setError("Aucune autre variété analysée par l'IA pour comparer.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const targetVarieties = selectedTargetId 
        ? others.filter(v => v.id === selectedTargetId)
        : others.slice(0, 5);

      const prompt = `Compare la variété cible "${variety.name}" avec les autres variétés suivantes de la base de données.
      
Cible:
${JSON.stringify({ name: variety.name, data: variety, analysis: JSON.parse(variety.ai_analysis) })}

Autres variétés:
${targetVarieties.map(v => JSON.stringify({ name: v.name, analysis: JSON.parse(v.ai_analysis!) })).join('\n')}

Fournis une comparaison structurée mettant en évidence les similitudes et les différences clés.`;

      const response = await getAI().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              similarities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key similarities with other varieties"
              },
              differences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key differences making this variety unique"
              },
              closest_match: {
                type: Type.STRING,
                description: "Name of the most similar variety"
              },
              conclusion: {
                type: Type.STRING,
                description: "Brief summary of its position relative to others"
              }
            }
          }
        }
      });

      setComparison(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      setError(err.message || "Erreur lors de la comparaison.");
    } finally {
      setLoading(false);
    }
  };

  if (!variety.ai_analysis) {
    return (
      <div className="p-6 text-center border border-[#2A2B30] rounded-xl bg-[#151619]/50">
        <Sparkles className="mx-auto mb-3 text-gray-500" size={24} />
        <p className="text-sm text-gray-400">Analysez d'abord cette variété pour débloquer la comparaison.</p>
      </div>
    );
  }

  if (!comparison && !loading) {
    return (
      <div className="p-6 text-center border border-[#2A2B30] rounded-xl bg-[#151619]/50">
        <Sparkles className="mx-auto mb-3 text-[#00FF9D]" size={24} />
        <p className="text-sm text-gray-400 mb-4">Comparez cette variété avec les autres de votre base de données.</p>
        
        {others.length > 0 ? (
          <div className="flex flex-col items-center gap-3">
            <select 
              value={selectedTargetId} 
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="bg-[#0A0A0C] border border-[#2A2B30] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00FF9D] w-full max-w-xs"
            >
              <option value="">Comparer avec toutes (Auto)</option>
              {others.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <button onClick={runComparison} className="px-4 py-2 bg-[#2A2B30] hover:bg-[#3A3B40] text-white rounded-lg text-sm font-medium transition-colors">
              Lancer la comparaison
            </button>
          </div>
        ) : (
          <p className="text-sm text-red-400">Aucune autre variété analysée disponible pour la comparaison.</p>
        )}
        
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center border border-[#2A2B30] rounded-xl bg-[#151619]/50 flex flex-col items-center">
        <Loader2 className="animate-spin text-[#00FF9D] mb-4" size={32} />
        <p className="text-sm text-gray-400 font-mono animate-pulse">Analyse comparative en cours...</p>
      </div>
    );
  }

  return (
    <div className="border border-[#2A2B30] rounded-xl bg-[#151619] overflow-hidden">
      <div className="p-4 border-b border-[#2A2B30] bg-[#0A0A0C] flex items-center gap-2">
        <Sparkles size={16} className="text-[#00FF9D]" />
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#00FF9D]">Comparaison IA</h3>
      </div>
      <div className="p-5 space-y-6">
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Similitudes</h4>
          <ul className="space-y-2">
            {comparison.similarities?.map((s: string, i: number) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-[#00FF9D] mt-0.5">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Différences clés</h4>
          <ul className="space-y-2">
            {comparison.differences?.map((d: string, i: number) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-[#FF4444] mt-0.5">•</span> {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="pt-4 border-t border-[#2A2B30]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Variété la plus proche</span>
            <span className="text-sm font-mono text-white bg-[#2A2B30] px-2 py-1 rounded">{comparison.closest_match}</span>
          </div>
          <p className="text-sm text-gray-400 italic mt-3">{comparison.conclusion}</p>
        </div>
      </div>
    </div>
  );
}
