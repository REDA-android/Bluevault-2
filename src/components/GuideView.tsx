import React from 'react';
import { BookOpen, Target, ClipboardCheck, Layout, Camera, Info, Leaf, Sparkles } from 'lucide-react';

export default function GuideView() {
  const guide = {
    titre: "Guide de Caractérisation Variétale et Création de Fiches d'Identification",
    definition: "La caractérisation variétale consiste à décrire une variété végétale en se basant sur l'expression de ses caractères morphologiques, physiologiques et agronomiques (profil phénotypique) afin de générer des fiches de reconnaissance fiables.",
    objectifs: [
      "Protéger les droits des obtenteurs (DHS : Distinction, Homogénéité, Stabilité).",
      "Assurer la traçabilité et la certification des semences et plants.",
      "Faciliter le choix variétal pour les producteurs et les agronomes.",
      "Conserver et valoriser les ressources phytogénétiques dans les banques de gènes."
    ],
    demarche_methodologique: [
      {
        etape: 1,
        nom: "Choix du référentiel et des descripteurs",
        description: "Utilisation de listes de descripteurs standardisés (ex. principes directeurs de l'UPOV ou normes Bioversity International) adaptés spécifiquement à l'espèce étudiée."
      },
      {
        etape: 2,
        nom: "Mise en place de l'essai (Dispositif expérimental)",
        description: "Culture de la variété dans des conditions pédoclimatiques représentatives, avec des répétitions statistiques pour différencier l'effet génétique de l'effet environnemental."
      },
      {
        etape: 3,
        nom: "Phénotypage et collecte des données",
        description: "Observation et mesure des traits à des stades de développement précis (échelle BBCH). Enregistrement des données qualitatives (ex. couleur, forme) et quantitatives (ex. taille, poids)."
      },
      {
        etape: 4,
        nom: "Analyse et traitement des données",
        description: "Validation statistique de l'homogénéité et de la distinction de la variété pour synthétiser son profil phénotypique unique."
      }
    ]
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="text-accent" size={32} />
          <h1 className="text-3xl font-bold tracking-tight">{guide.titre}</h1>
        </div>
        <div className="bg-white border border-card-border rounded-2xl p-6 neo-shadow">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
              <Info className="text-accent" size={20} />
            </div>
            <p className="text-text-secondary italic leading-relaxed">
              "{guide.definition}"
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Target className="text-accent" size={20} />
            <h2 className="text-xl font-bold uppercase tracking-widest text-text-primary">Objectifs</h2>
          </div>
          <ul className="space-y-4">
            {guide.objectifs.map((obj, i) => (
              <li key={i} className="flex gap-3 items-start">
                <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-accent text-xs font-bold">{i + 1}</span>
                </div>
                <span className="text-text-secondary text-sm">{obj}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <ClipboardCheck className="text-accent" size={20} />
            <h2 className="text-xl font-bold uppercase tracking-widest text-text-primary">Démarche</h2>
          </div>
          <div className="space-y-6">
            {guide.demarche_methodologique.map((step) => (
              <div key={step.etape} className="relative pl-8 border-l-2 border-accent/20 pb-2 last:pb-0">
                <div className="absolute -left-[9px] top-0 w-4 h-4 bg-accent rounded-full border-4 border-white shadow-sm"></div>
                <h3 className="font-bold text-sm mb-1">{step.nom}</h3>
                <p className="text-text-secondary text-xs leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Layout className="text-accent" size={20} />
          <h2 className="text-xl font-bold uppercase tracking-widest text-text-primary">Modèle de Fiche</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-card-border rounded-xl p-5 neo-shadow">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Entête</h4>
            <ul className="text-[10px] text-text-secondary space-y-2">
              <li>• Espèce (Nom commun & scientifique)</li>
              <li>• Dénomination officielle & Synonymes</li>
              <li>• Obtenteur & Origine</li>
              <li>• Statut légal (COV)</li>
            </ul>
          </div>
          <div className="bg-white border border-card-border rounded-xl p-5 neo-shadow">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Morphologie</h4>
            <ul className="text-[10px] text-text-secondary space-y-2">
              <li>• Plante (Port, vigueur, hauteur)</li>
              <li>• Tige (Couleur, épaisseur, pilosité)</li>
              <li>• Feuille (Forme, marge, cloqûre)</li>
              <li>• Fleur (Couleur, époque, type)</li>
              <li>• Fruit (Forme, calibre, texture)</li>
            </ul>
          </div>
          <div className="bg-white border border-card-border rounded-xl p-5 neo-shadow">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Agronomie</h4>
            <ul className="text-[10px] text-text-secondary space-y-2">
              <li>• Cycle (Précocité)</li>
              <li>• Rendement & Stabilité</li>
              <li>• Résistances & Tolérances</li>
              <li>• Qualité (Brix, acidité, fermeté)</li>
              <li>• Conservation</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <Camera className="text-accent" size={20} />
          <h2 className="text-xl font-bold uppercase tracking-widest text-text-primary">Annexes Visuelles</h2>
        </div>
        <div className="bg-dark-bg text-white rounded-2xl p-8 neo-shadow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="aspect-square bg-white/5 rounded-xl border border-white/10 flex items-center justify-center mb-3">
                <Layout className="text-accent/50" size={24} />
              </div>
              <span className="text-[9px] uppercase tracking-widest text-text-secondary">Plante Entière</span>
            </div>
            <div className="text-center">
              <div className="aspect-square bg-white/5 rounded-xl border border-white/10 flex items-center justify-center mb-3">
                <Leaf className="text-accent/50" size={24} />
              </div>
              <span className="text-[9px] uppercase tracking-widest text-text-secondary">Feuille (R/V)</span>
            </div>
            <div className="text-center">
              <div className="aspect-square bg-white/5 rounded-xl border border-white/10 flex items-center justify-center mb-3">
                <Sparkles className="text-accent/50" size={24} />
              </div>
              <span className="text-[9px] uppercase tracking-widest text-text-secondary">Fleur</span>
            </div>
            <div className="text-center">
              <div className="aspect-square bg-white/5 rounded-xl border border-white/10 flex items-center justify-center mb-3">
                <Target className="text-accent/50" size={24} />
              </div>
              <span className="text-[9px] uppercase tracking-widest text-text-secondary">Fruit (Coupe)</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
