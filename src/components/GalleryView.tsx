import React, { useState } from 'react';
import { Variety } from '../types';
import { X, ZoomIn } from 'lucide-react';

interface GalleryViewProps {
  varieties: Variety[];
  onSelectVariety: (variety: Variety) => void;
}

export default function GalleryView({ varieties, onSelectVariety }: GalleryViewProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string, varietyName: string } | null>(null);

  const allPhotos = varieties.flatMap(v => {
    if (!v.photos) return [];
    try {
      const parsed = JSON.parse(v.photos);
      return parsed.map((p: any) => ({ ...p, variety: v }));
    } catch {
      return [];
    }
  });

  if (allPhotos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <ZoomIn size={48} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Aucune photo</h2>
        <p>Ajoutez des photos à vos variétés pour les voir ici.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-mono">Galerie</h2>
        <p className="text-gray-500 text-sm mt-1">{allPhotos.length} photos au total</p>
      </div>

      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {allPhotos.map((photo, idx) => (
          <div key={idx} className="break-inside-avoid relative group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
            <img 
              src={photo.data} 
              alt={`Photo de ${photo.variety.name}`} 
              className="w-full h-auto object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
              onClick={() => setSelectedImage({ url: photo.data, varietyName: photo.variety.name })}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
              <span className="text-white font-medium text-sm truncate">{photo.variety.name}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onSelectVariety(photo.variety); }}
                className="text-xs bg-[#00FF9D] text-black px-2 py-1 rounded font-bold hover:bg-[#00CC7D] transition-colors"
              >
                Voir
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-[#00FF9D] transition-colors p-2">
            <X size={32} />
          </button>
          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center">
            <img src={selectedImage.url} alt={selectedImage.varietyName} className="max-w-full max-h-[85vh] object-contain rounded-lg" referrerPolicy="no-referrer" />
            <p className="text-white mt-4 font-mono text-lg">{selectedImage.varietyName}</p>
          </div>
        </div>
      )}
    </div>
  );
}
