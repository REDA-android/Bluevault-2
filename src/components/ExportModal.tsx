import React, { useState } from 'react';
import { Variety, Photo } from '../types';
import Papa from 'papaparse';
import { X, Download, Loader2 } from 'lucide-react';
import JSZip from 'jszip';

interface ExportModalProps {
  varieties: Variety[];
  onClose: () => void;
}

const ALL_FIELDS = [
  'name', 'species', 'breeder', 'site', 'flowering_date', 'maturity_date',
  'precocity', 'fruit_size', 'color', 'bloom', 'fruit_shape', 'brix',
  'firmness', 'acidity', 'aroma', 'vigor', 'habit', 'yield_estimate',
  'sensitivities', 'free_notes', 'ai_analysis',
  'harvest_start', 'harvest_end', 'status', 'rating', 'hardiness_zone',
  'sweetness_score', 'acidity_score', 'firmness_score', 'size_score', 'aroma_score'
];

export default function ExportModal({ varieties, onClose }: ExportModalProps) {
  const [selectedVarieties, setSelectedVarieties] = useState<Set<string>>(new Set(varieties.map(v => v.id)));
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(ALL_FIELDS));
  const [format, setFormat] = useState<'json' | 'csv' | 'zip'>('json');
  const [isExporting, setIsExporting] = useState(false);

  const toggleVariety = (id: string) => {
    const newSet = new Set(selectedVarieties);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedVarieties(newSet);
  };

  const toggleField = (field: string) => {
    const newSet = new Set(selectedFields);
    if (newSet.has(field)) newSet.delete(field);
    else newSet.add(field);
    setSelectedFields(newSet);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const selectedV = varieties.filter(v => selectedVarieties.has(v.id));

      if (format === 'zip') {
        const zip = new JSZip();
        
        for (const v of selectedV) {
          const folderName = v.name.replace(/[/\\?%*:|"<>]/g, '-');
          const folder = zip.folder(folderName);
          
          const photos: Photo[] = v.photos ? JSON.parse(v.photos) : [];
          
          if (folder && photos.length > 0) {
            photos.forEach((photo, index) => {
              const extension = photo.type.split('/')[1] || 'jpg';
              folder.file(`photo_${index + 1}.${extension}`, photo.data, { base64: true });
            });
          }

          // Also include a small info file in each folder
          const info = {
            name: v.name,
            species: v.species,
            site: v.site,
            brix: v.brix,
            status: v.status
          };
          folder?.file('info.json', JSON.stringify(info, null, 2));
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bluevault_photos_${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const dataToExport = selectedV.map(v => {
          const obj: any = {};
          selectedFields.forEach(f => {
            if (f === 'ai_analysis' && v.ai_analysis) {
               try { obj[f] = JSON.parse(v.ai_analysis); } catch { obj[f] = v.ai_analysis; }
            } else {
               obj[f] = (v as any)[f];
            }
          });
          return obj;
        });

        let content = '';
        let type = '';
        let ext = '';

        if (format === 'json') {
          content = JSON.stringify(dataToExport, null, 2);
          type = 'application/json';
          ext = 'json';
        } else {
          const flattened = dataToExport.map(item => {
            const flat = { ...item };
            if (flat.ai_analysis) {
              flat.ai_analysis = JSON.stringify(flat.ai_analysis);
            }
            return flat;
          });
          content = Papa.unparse(flattened);
          type = 'text/csv';
          ext = 'csv';
        }

        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bluevault_export_${new Date().toISOString().split('T')[0]}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#151619] border border-[#2A2B30] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2B30]">
          <h2 className="text-xl font-bold text-white">Exporter les données</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#2A2B30] rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <h3 className="text-sm font-mono text-[#00FF9D] mb-3 uppercase tracking-wider">Format</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={format === 'json'} onChange={() => setFormat('json')} className="accent-[#00FF9D]" />
                <span className="text-gray-300">JSON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={format === 'csv'} onChange={() => setFormat('csv')} className="accent-[#00FF9D]" />
                <span className="text-gray-300">CSV</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={format === 'zip'} onChange={() => setFormat('zip')} className="accent-[#00FF9D]" />
                <span className="text-gray-300">ZIP (Photos)</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-mono text-[#00FF9D] mb-3 uppercase tracking-wider">
              Variétés ({selectedVarieties.size}/{varieties.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-[#0A0A0C] rounded-lg border border-[#2A2B30]">
              {varieties.map(v => (
                <label key={v.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer truncate">
                  <input type="checkbox" checked={selectedVarieties.has(v.id)} onChange={() => toggleVariety(v.id)} className="accent-[#00FF9D]" />
                  <span className="truncate">{v.name}</span>
                </label>
              ))}
            </div>
          </div>

          {format !== 'zip' && (
            <div>
              <h3 className="text-sm font-mono text-[#00FF9D] mb-3 uppercase tracking-wider">
                Champs ({selectedFields.size}/{ALL_FIELDS.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-[#0A0A0C] rounded-lg border border-[#2A2B30]">
                {ALL_FIELDS.map(f => (
                  <label key={f} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer truncate">
                    <input type="checkbox" checked={selectedFields.has(f)} onChange={() => toggleField(f)} className="accent-[#00FF9D]" />
                    <span className="truncate">{f}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#2A2B30] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Annuler
          </button>
          <button 
            onClick={handleExport} 
            disabled={isExporting || selectedVarieties.size === 0 || (format !== 'zip' && selectedFields.size === 0)} 
            className="flex items-center gap-2 px-6 py-2 bg-[#00FF9D] hover:bg-[#00CC7D] text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? 'Exportation...' : 'Exporter'}
          </button>
        </div>
      </div>
    </div>
  );
}
