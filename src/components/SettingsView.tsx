import React from 'react';
import { Trash2, Database, Download } from 'lucide-react';

interface SettingsViewProps {
  onClearData: () => void;
  onLoadSampleData: () => void;
}

export default function SettingsView({ onClearData, onLoadSampleData }: SettingsViewProps) {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-mono">Paramètres</h2>
        <p className="text-gray-500 text-sm mt-1">Gérez vos données locales.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Database size={20} className="text-blue-500" />
            Données de démonstration
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Chargez un jeu de données de démonstration pour tester les fonctionnalités de l'application. 
            Attention, cela ajoutera ces données à votre collection actuelle.
          </p>
          <button 
            onClick={onLoadSampleData}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Charger les données
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
          <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
            <Trash2 size={20} />
            Zone de danger
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Supprimez définitivement toutes les variétés de votre base de données locale. 
            Cette action est irréversible. Pensez à exporter vos données avant.
          </p>
          <button 
            onClick={() => {
              if (window.confirm("Êtes-vous sûr de vouloir supprimer TOUTES vos données ? Cette action est irréversible.")) {
                onClearData();
              }
            }}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={18} />
            Effacer toutes les données
          </button>
        </div>
      </div>
    </div>
  );
}
