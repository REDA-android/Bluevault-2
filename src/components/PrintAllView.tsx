import React, { useEffect } from 'react';
import { Variety } from '../types';
import DetailView from './DetailView';

interface PrintAllViewProps {
  varieties: Variety[];
  onClose: () => void;
}

export default function PrintAllView({ varieties, onClose }: PrintAllViewProps) {
  useEffect(() => {
    // Small delay to allow images to load before printing
    const timer = setTimeout(() => {
      window.print();
    }, 1000);

    const handleAfterPrint = () => {
      onClose();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onClose]);

  return (
    <div className="bg-white min-h-screen">
      {varieties.map((variety, index) => (
        <div key={variety.id} className={index > 0 ? 'break-before-page' : ''}>
          <DetailView 
            variety={variety} 
            allVarieties={varieties}
            onBack={() => {}} 
            onEdit={() => {}} 
            onAnalyze={() => {}} 
            analyzing={false} 
            isPrintAllMode={true}
          />
        </div>
      ))}
    </div>
  );
}
