import React, { useState } from 'react';
import { Photo } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Info } from 'lucide-react';

export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [showExif, setShowExif] = useState(false);

  if (!photos || photos.length === 0) return <div className="text-gray-500 italic text-sm p-4 text-center">Aucune photo</div>;

  const currentPhoto = index !== null ? photos[index] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-[#2A2B30]" onClick={() => setIndex(i)}>
            <img src={`data:${p.type};base64,${p.data}`} alt="Variety" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 font-mono text-xs tracking-widest uppercase">View</span>
            </div>
            {p.exif && (
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-md">
                <Info size={14} className="text-[#00FF9D]" />
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {index !== null && currentPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="text-white/50 font-mono text-sm">
                {index + 1} / {photos.length}
              </div>
              <div className="flex items-center gap-4">
                {currentPhoto.exif && (
                  <button onClick={() => setShowExif(!showExif)} className={`p-2 rounded-full transition-colors ${showExif ? 'bg-[#00FF9D] text-black' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                    <Info size={20} />
                  </button>
                )}
                <button onClick={() => setIndex(null)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <button className="absolute left-4 p-3 rounded-full bg-black/50 text-white hover:bg-[#00FF9D] hover:text-black transition-colors z-10" onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + photos.length) % photos.length); }}>
                <ChevronLeft size={24} />
              </button>
              
              <motion.img key={index} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} src={`data:${currentPhoto.type};base64,${currentPhoto.data}`} alt="Fullscreen" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />

              <button className="absolute right-4 p-3 rounded-full bg-black/50 text-white hover:bg-[#00FF9D] hover:text-black transition-colors z-10" onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % photos.length); }}>
                <ChevronRight size={24} />
              </button>

              <AnimatePresence>
                {showExif && currentPhoto.exif && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#151619]/90 backdrop-blur-md border border-[#2A2B30] p-4 rounded-xl shadow-2xl max-w-md w-full">
                    <h4 className="text-[#00FF9D] font-mono text-xs uppercase tracking-widest mb-3 border-b border-[#2A2B30] pb-2">EXIF Metadata</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {currentPhoto.exif.cameraMake && <div className="text-white/60">Make: <span className="text-white">{currentPhoto.exif.cameraMake}</span></div>}
                      {currentPhoto.exif.cameraModel && <div className="text-white/60">Model: <span className="text-white">{currentPhoto.exif.cameraModel}</span></div>}
                      {currentPhoto.exif.datetime && <div className="text-white/60 col-span-2">Date: <span className="text-white">{new Date(currentPhoto.exif.datetime).toLocaleString()}</span></div>}
                      {currentPhoto.exif.width && currentPhoto.exif.height && <div className="text-white/60 col-span-2">Resolution: <span className="text-white">{currentPhoto.exif.width}x{currentPhoto.exif.height}</span></div>}
                      {currentPhoto.exif.lat && currentPhoto.exif.lng && (
                        <div className="text-white/60 col-span-2">
                          GPS: <span className="text-white">{currentPhoto.exif.lat.toFixed(5)}, {currentPhoto.exif.lng.toFixed(5)}</span>
                        </div>
                      )}
                      {currentPhoto.geo && currentPhoto.geo.display && (
                        <div className="text-white/60 col-span-2 mt-1 pt-1 border-t border-white/10">
                          Location: <span className="text-white">{currentPhoto.geo.display}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
