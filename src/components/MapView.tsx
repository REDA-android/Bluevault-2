import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Variety } from '../types';
import { X, MapPin } from 'lucide-react';

// Fix Leaflet default icon issue in React
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  varieties: Variety[];
  onClose: () => void;
}

export default function MapView({ varieties, onClose }: MapViewProps) {
  const markers = useMemo(() => {
    const m: { lat: number, lng: number, variety: Variety, photo: any }[] = [];
    varieties.forEach(v => {
      if (v.photos) {
        try {
          const photos = JSON.parse(v.photos);
          photos.forEach((p: any) => {
            if (p.exif && p.exif.lat && p.exif.lng) {
              m.push({
                lat: p.exif.lat,
                lng: p.exif.lng,
                variety: v,
                photo: p
              });
            }
          });
        } catch (e) {
          console.error("Failed to parse photos for map", e);
        }
      }
    });
    return m;
  }, [varieties]);

  // Default center: France if no markers
  const center: [number, number] = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [46.603354, 1.888334];

  return (
    <div className="fixed inset-0 bg-[#E6E6E6] z-50 flex flex-col overflow-hidden">
      <div className="bg-[#151619] text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <MapPin className="text-[#00FF9D]" size={20} />
          <h2 className="font-mono text-sm uppercase tracking-widest">Carte des Variétés</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={5} className="w-full h-full z-0">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {markers.map((m, i) => (
            <Marker key={i} position={[m.lat, m.lng]} icon={customIcon}>
              <Popup className="rounded-xl overflow-hidden border-none shadow-xl">
                <div className="text-center p-1">
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 mb-2">
                    <img src={`data:${m.photo.type};base64,${m.photo.data}`} className="w-full h-full object-cover" alt={m.variety.name} />
                  </div>
                  <h3 className="font-bold text-sm text-gray-800">{m.variety.name}</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{m.variety.species || 'Inconnue'}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {markers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-xs border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={24} className="text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Aucune donnée GPS</h3>
              <p className="text-sm text-gray-500">
                Ajoutez des photos contenant des données de localisation (EXIF) pour les visualiser sur la carte.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
