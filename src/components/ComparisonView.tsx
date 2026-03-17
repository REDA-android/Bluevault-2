import React from 'react';
import { Variety } from '../types';
import { X, Check, Minus, Info } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

interface ComparisonViewProps {
  v1: Variety;
  v2: Variety;
  onClose: () => void;
}

const ComparisonRow = ({ label, val1, val2, isBetter }: { label: string, val1: any, val2: any, isBetter?: (v1: any, v2: any) => number }) => {
  const better = isBetter ? isBetter(val1, val2) : 0;
  
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 items-center">
      <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</div>
      <div className={`text-sm font-medium ${better === 1 ? 'text-[#00CC7D]' : 'text-gray-700'}`}>
        {val1 || <Minus size={14} className="text-gray-300" />}
        {better === 1 && <Check size={12} className="inline ml-1" />}
      </div>
      <div className={`text-sm font-medium ${better === 2 ? 'text-[#00CC7D]' : 'text-gray-700'}`}>
        {val2 || <Minus size={14} className="text-gray-300" />}
        {better === 2 && <Check size={12} className="inline ml-1" />}
      </div>
    </div>
  );
};

export default function ComparisonView({ v1, v2, onClose }: ComparisonViewProps) {
  const photos1 = v1.photos ? JSON.parse(v1.photos) : [];
  const photos2 = v2.photos ? JSON.parse(v2.photos) : [];

  const sensoryData = [
    { subject: 'Douceur', v1: v1.sweetness_score || 0, v2: v2.sweetness_score || 0, fullMark: 5 },
    { subject: 'Acidité', v1: v1.acidity_score || 0, v2: v2.acidity_score || 0, fullMark: 5 },
    { subject: 'Fermeté', v1: v1.firmness_score || 0, v2: v2.firmness_score || 0, fullMark: 5 },
    { subject: 'Calibre', v1: v1.size_score || 0, v2: v2.size_score || 0, fullMark: 5 },
    { subject: 'Arôme', v1: v1.aroma_score || 0, v2: v2.aroma_score || 0, fullMark: 5 },
  ];
  const hasSensoryData = sensoryData.some(d => d.v1 > 0 || d.v2 > 0);

  return (
    <div className="fixed inset-0 bg-[#E6E6E6] z-50 flex flex-col overflow-hidden">
      <div className="bg-[#151619] text-white p-4 flex items-center justify-between shadow-lg">
        <h2 className="font-mono text-sm uppercase tracking-widest">Comparaison Side-by-Side</h2>
        <button onClick={onClose} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Header with photos */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-[#151619] rounded-xl flex items-center justify-center text-[#00FF9D] font-mono font-bold">VS</div>
            </div>
            <div className="text-center">
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-200 mb-2 border border-gray-200">
                {photos1[0] ? (
                  <img src={`data:${photos1[0].type};base64,${photos1[0].data}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">No Photo</div>
                )}
              </div>
              <h3 className="font-bold text-sm truncate">{v1.name}</h3>
            </div>
            <div className="text-center">
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-200 mb-2 border border-gray-200">
                {photos2[0] ? (
                  <img src={`data:${photos2[0].type};base64,${photos2[0].data}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">No Photo</div>
                )}
              </div>
              <h3 className="font-bold text-sm truncate">{v2.name}</h3>
            </div>
          </div>

          <div className="p-4 space-y-1">
            <ComparisonRow label="Espèce" val1={v1.species} val2={v2.species} />
            <ComparisonRow label="Brix (°Bx)" val1={v1.brix} val2={v2.brix} isBetter={(a, b) => (Number(a) > Number(b) ? 1 : Number(b) > Number(a) ? 2 : 0)} />
            <ComparisonRow label="Calibre (mm)" val1={v1.fruit_size} val2={v2.fruit_size} isBetter={(a, b) => (Number(a) > Number(b) ? 1 : Number(b) > Number(a) ? 2 : 0)} />
            <ComparisonRow label="Rendement" val1={v1.yield_estimate} val2={v2.yield_estimate} isBetter={(a, b) => (Number(a) > Number(b) ? 1 : Number(b) > Number(a) ? 2 : 0)} />
            <ComparisonRow label="Précocité" val1={v1.precocity} val2={v2.precocity} />
            <ComparisonRow label="Vigueur" val1={v1.vigor} val2={v2.vigor} />
            <ComparisonRow label="Fermeté" val1={v1.firmness} val2={v2.firmness} />
            <ComparisonRow label="Arômes" val1={v1.aroma} val2={v2.aroma} />
          </div>

          {hasSensoryData && (
            <div className="p-4 border-t border-gray-100 bg-white">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">Comparaison Sensorielle</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={sensoryData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Radar name={v1.name} dataKey="v1" stroke="#00FF9D" fill="#00FF9D" fillOpacity={0.4} />
                    <Radar name={v2.name} dataKey="v2" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="p-4 bg-gray-50 text-[10px] text-gray-400 flex items-center gap-2">
            <Info size={12} />
            Les indicateurs <Check size={10} className="inline" /> marquent la valeur la plus élevée pour les critères quantitatifs.
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
