import React, { useState, useRef, useEffect } from 'react';
import { Variety, Photo } from '../types';
import { extractExif, reverseGeocode, toBase64, getAI } from '../utils';
import { Camera, X, Check, Trash2, Sparkles, Loader2, MapPin, HelpCircle, Save, Info } from 'lucide-react';

const TooltipLabel = ({ label, tooltip }: { label: string, tooltip: string }) => (
  <div className="flex items-center gap-1 mb-1 relative group">
    <label className="block text-xs font-semibold text-gray-600">{label}</label>
    <HelpCircle size={12} className="text-gray-400 cursor-help" />
    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 bg-[#151619] text-white text-[10px] p-2 rounded-lg shadow-xl z-50 border border-[#2A2B30]">
      {tooltip}
      <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-[#151619]"></div>
    </div>
  </div>
);

interface FormViewProps {
  initialData?: Variety | null;
  onSave: (data: Partial<Variety>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function FormView({ initialData, onSave, onCancel, onDelete }: FormViewProps) {
  const [formData, setFormData] = useState<Partial<Variety>>(initialData || { name: '' });
  const [photos, setPhotos] = useState<Photo[]>(initialData?.photos ? JSON.parse(initialData.photos) : []);
  const [loadingAI, setLoadingAI] = useState<'aroma' | 'sensitivities' | null>(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialData) {
      const draft = localStorage.getItem('bluevault_draft');
      if (draft) {
        setShowDraftPrompt(true);
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (!initialData && !showDraftPrompt) {
      const timer = setTimeout(() => {
        if (formData.name || photos.length > 0) {
          localStorage.setItem('bluevault_draft', JSON.stringify({ formData, photos }));
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData, photos, initialData, showDraftPrompt]);

  const restoreDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem('bluevault_draft') || '{}');
      if (draft.formData) setFormData(draft.formData);
      if (draft.photos) setPhotos(draft.photos);
    } catch (e) {}
    setShowDraftPrompt(false);
  };

  const discardDraft = () => {
    localStorage.removeItem('bluevault_draft');
    setShowDraftPrompt(false);
  };

  const validate = (name: string, value: any) => {
    let error = '';
    if (name === 'name' && !value) error = 'Le nom est obligatoire';
    if (name === 'brix' && value && (isNaN(Number(value)) || Number(value) < 0)) error = 'Brix doit être un nombre positif';
    if (name === 'fruit_size' && value && (isNaN(Number(value)) || Number(value) < 0)) error = 'Le calibre doit être un nombre positif';
    if (name === 'yield_estimate' && value && (isNaN(Number(value)) || Number(value) < 0)) error = 'Le rendement doit être un nombre positif';
    
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) newErrors[name] = error;
      else delete newErrors[name];
      return newErrors;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validate(name, value);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let newSite = formData.site;

    const newPhotos = await Promise.all(
      files.map(async (f: File) => {
        const b64 = await toBase64(f);
        const exif = await extractExif(f);
        let geo = null;
        if (exif?.lat && exif?.lng) {
          geo = await reverseGeocode(exif.lat, exif.lng);
          if (geo && !newSite) {
            newSite = [geo.city, geo.region, geo.country].filter(Boolean).join(', ');
          }
        }
        return { data: b64, type: f.type, exif, geo };
      })
    );
    
    setPhotos([...photos, ...newPhotos]);
    if (newSite !== formData.site) {
      setFormData(prev => ({ ...prev, site: newSite }));
    }
  };

  const removePhoto = (index: number) => {
    setPhotoToDelete(index);
  };

  const confirmRemovePhoto = () => {
    if (photoToDelete !== null) {
      setPhotos(photos.filter((_, i) => i !== photoToDelete));
      setPhotoToDelete(null);
    }
  };

  const suggestField = async (field: 'aroma' | 'sensitivities') => {
    if (!formData.name) return;
    setLoadingAI(field);
    try {
      const prompt = `Suggère des ${field === 'aroma' ? 'arômes typiques' : 'sensibilités connues (maladies, ravageurs, stress)'} pour la variété de myrtille "${formData.name}" (Espèce: ${formData.species || 'inconnue'}). Réponds uniquement avec une liste de 3 à 5 mots-clés séparés par des virgules, sans texte supplémentaire.`;
      const response = await getAI().models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt
      });
      const suggestion = response.text?.trim() || '';
      if (suggestion) {
        setFormData(prev => ({ ...prev, [field]: prev[field] ? `${prev[field]}, ${suggestion}` : suggestion }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setErrors(prev => ({ ...prev, name: 'Le nom est obligatoire' }));
      return;
    }
    if (Object.keys(errors).length > 0) return;
    
    if (!initialData) localStorage.removeItem('bluevault_draft');
    onSave({ ...formData, photos: JSON.stringify(photos) });
  };

  const handleCancel = () => {
    if (!initialData) localStorage.removeItem('bluevault_draft');
    onCancel();
  };

  return (
    <div className="flex flex-col h-full bg-[#E6E6E6] text-[#151619]">
      <div className="bg-[#151619] text-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <button onClick={handleCancel} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors"><X size={20} /></button>
        <h2 className="font-mono text-sm uppercase tracking-widest">{initialData ? 'Éditer Variété' : 'Nouvelle Variété'}</h2>
        <button onClick={handleSubmit} disabled={!formData.name} className="p-2 bg-[#00FF9D] text-black hover:bg-[#00CC7D] rounded-full transition-colors disabled:opacity-50">
          <Check size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
        {showDraftPrompt && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
              <Save size={16} /> Un brouillon non sauvegardé a été trouvé.
            </div>
            <div className="flex gap-2">
              <button onClick={restoreDraft} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors">Restaurer</button>
              <button onClick={discardDraft} className="flex-1 bg-white border border-blue-200 text-blue-600 text-xs font-bold py-2 rounded-lg hover:bg-blue-50 transition-colors">Ignorer</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Identité & Localisation</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nom de la variété *</label>
              <input required name="name" value={formData.name || ''} onChange={handleChange} className={`w-full bg-gray-50 border ${errors.name ? 'border-red-500' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D] focus:ring-1 focus:ring-[#00FF9D]`} placeholder="Ex: Duke" />
              {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Espèce</label>
                <input name="species" value={formData.species || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="V. corymbosum" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Obtenteur</label>
                <input name="breeder" value={formData.breeder || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><MapPin size={12}/> Site / Localisation</label>
              <input name="site" value={formData.site || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Parcelle A, ou auto-rempli via GPS" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Phénologie & Plante</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date de floraison</label>
                <input type="date" name="flowering_date" value={formData.flowering_date || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date de maturité</label>
                <input type="date" name="maturity_date" value={formData.maturity_date || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" />
              </div>
              <div>
                <TooltipLabel label="Précocité" tooltip="Période de récolte par rapport à la saison standard (ex: Très précoce, Tardive)." />
                <select name="precocity" value={formData.precocity || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]">
                  <option value="">Sélectionner...</option>
                  <option value="Très précoce">Très précoce</option>
                  <option value="Précoce">Précoce</option>
                  <option value="Saison">Saison</option>
                  <option value="Tardive">Tardive</option>
                  <option value="Très tardive">Très tardive</option>
                </select>
              </div>
              <div>
                <TooltipLabel label="Vigueur" tooltip="Force et vitesse de croissance végétative de la plante." />
                <input name="vigor" value={formData.vigor || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Forte" />
              </div>
              <div>
                <TooltipLabel label="Port (Habit)" tooltip="Architecture de la plante (ex: Érigé, Demi-érigé, Étalé)." />
                <input name="habit" value={formData.habit || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Érigé, Étalé" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rendement estimé (kg/pl)</label>
                <input type="number" step="0.1" min="0" name="yield_estimate" value={formData.yield_estimate || ''} onChange={handleChange} className={`w-full bg-gray-50 border ${errors.yield_estimate ? 'border-red-500' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]`} />
                {errors.yield_estimate && <p className="text-[10px] text-red-500 mt-1">{errors.yield_estimate}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Fruit & Qualité</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Calibre (mm)</label>
                <input type="number" step="0.1" min="0" name="fruit_size" value={formData.fruit_size || ''} onChange={handleChange} className={`w-full bg-gray-50 border ${errors.fruit_size ? 'border-red-500' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]`} />
                {errors.fruit_size && <p className="text-[10px] text-red-500 mt-1">{errors.fruit_size}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Brix (°Bx)</label>
                <input type="number" step="0.1" min="0" name="brix" value={formData.brix || ''} onChange={handleChange} className={`w-full bg-gray-50 border ${errors.brix ? 'border-red-500' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]`} />
                {errors.brix && <p className="text-[10px] text-red-500 mt-1">{errors.brix}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Couleur</label>
                <input name="color" value={formData.color || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Bleu clair" />
              </div>
              <div>
                <TooltipLabel label="Pruine (Bloom)" tooltip="Couche cireuse naturelle protectrice sur le fruit, lui donnant un aspect bleuté." />
                <input name="bloom" value={formData.bloom || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Forte, Persistante" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Forme</label>
                <input name="fruit_shape" value={formData.fruit_shape || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Aplatie, Sphérique" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fermeté</label>
                <input name="firmness" value={formData.firmness || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Très ferme" />
              </div>
              <div>
                <TooltipLabel label="Acidité" tooltip="Niveau d'acidité perçu en bouche, influençant l'équilibre gustatif avec le sucre (Brix)." />
                <input name="acidity" value={formData.acidity || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Faible, Équilibrée" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-600">Arômes</label>
                <button type="button" onClick={() => suggestField('aroma')} disabled={!formData.name || loadingAI === 'aroma'} className="text-xs text-[#00CC7D] flex items-center gap-1 hover:underline disabled:opacity-50">
                  {loadingAI === 'aroma' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Suggérer (IA)
                </button>
              </div>
              <input name="aroma" value={formData.aroma || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Myrtille sauvage, floral..." />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-600">Sensibilités</label>
                <button type="button" onClick={() => suggestField('sensitivities')} disabled={!formData.name || loadingAI === 'sensitivities'} className="text-xs text-[#00CC7D] flex items-center gap-1 hover:underline disabled:opacity-50">
                  {loadingAI === 'sensitivities' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Suggérer (IA)
                </button>
              </div>
              <input name="sensitivities" value={formData.sensitivities || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D]" placeholder="Ex: Botrytis, Rouille..." />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Notes Libres</h3>
          <textarea 
            name="free_notes" 
            value={formData.free_notes || ''} 
            onChange={handleChange} 
            rows={4}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF9D] resize-none" 
            placeholder="Observations supplémentaires, notes de dégustation..." 
          />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Photos ({photos.length})</h3>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs bg-[#151619] text-white px-3 py-1.5 rounded-md flex items-center gap-2 hover:bg-[#2A2B30] transition-colors">
              <Camera size={14} /> Ajouter
            </button>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} multiple accept="image/*" className="hidden" />
          </div>
          
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden group border border-gray-200 bg-gray-50">
                  <div className="aspect-square">
                    <img src={`data:${p.type};base64,${p.data}`} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute top-1 left-1 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-help group/tooltip">
                    <Info size={14} />
                    <div className="absolute top-full left-0 mt-1 hidden group-hover/tooltip:block w-48 bg-[#151619] text-white text-[10px] p-2 rounded-lg shadow-xl z-50 border border-[#2A2B30]">
                      {p.exif?.cameraModel && <div className="truncate">📷 {p.exif.cameraModel}</div>}
                      {p.exif?.datetime && <div className="truncate">🕒 {new Date(p.exif.datetime).toLocaleString()}</div>}
                      {p.geo?.display && <div className="truncate text-[#00CC7D]">📍 {p.geo.display}</div>}
                      {p.exif?.lat && !p.geo?.display && <div className="truncate text-[#00CC7D]">📍 GPS: {p.exif.lat.toFixed(4)}, {p.exif.lng?.toFixed(4)}</div>}
                      {(!p.exif?.cameraModel && !p.exif?.datetime && !p.exif?.lat) && <div className="text-gray-400">Aucune donnée EXIF</div>}
                    </div>
                  </div>
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                  <div className="p-2 text-[10px] text-gray-600 font-mono space-y-1">
                    {p.exif?.cameraModel && <div className="truncate" title={p.exif.cameraModel}>📷 {p.exif.cameraModel}</div>}
                    {p.exif?.datetime && <div className="truncate">🕒 {new Date(p.exif.datetime).toLocaleDateString()}</div>}
                    {p.geo?.display && <div className="truncate text-[#00CC7D]" title={p.geo.display}>📍 {p.geo.city || p.geo.country || 'GPS'}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              Aucune photo ajoutée
            </div>
          )}
        </div>

        {initialData && onDelete && (
          <button type="button" onClick={onDelete} className="w-full py-3 flex items-center justify-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-sm font-medium border border-red-100 mt-8">
            <Trash2 size={16} /> Supprimer la variété
          </button>
        )}
        </div>
      </div>

      {photoToDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Supprimer la photo ?</h4>
            <p className="text-xs text-gray-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setPhotoToDelete(null)} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={confirmRemovePhoto} className="flex-1 py-2 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
