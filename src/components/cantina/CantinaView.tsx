// src/components/cantina/CantinaView.tsx
import React from 'react';
import { Wine, Plus, Activity } from 'lucide-react';
import { Tank } from '../../types';

interface Props {
  cantinaSubView: 'SERBATOI' | 'ANALISI_STORICO';
  setCantinaSubView: (v: 'SERBATOI' | 'ANALISI_STORICO') => void;
  tanks: Tank[];
  isAddingTank: boolean;
  setIsAddingTank: (v: boolean) => void;
  newTank: { name: string; capacity: number; currentLiters: number; wineType: string };
  setNewTank: React.Dispatch<React.SetStateAction<{ name: string; capacity: number; currentLiters: number; wineType: string }>>;
  handleCreateTank: (e: React.FormEvent) => void;
  activeAnalysisTank: Tank | null;
  setActiveAnalysisTank: React.Dispatch<React.SetStateAction<Tank | null>>;
  analysisData: { ph: string; so2: string; alcohol: string };
  setAnalysisData: React.Dispatch<React.SetStateAction<{ ph: string; so2: string; alcohol: string }>>;
  handleSaveAnalysis: (e: React.FormEvent) => void;
  activeBottlingTank: Tank | null;
  setActiveBottlingTank: React.Dispatch<React.SetStateAction<Tank | null>>;
  bottlingLiters: number;
  setBottlingLiters: React.Dispatch<React.SetStateAction<number>>;
  handleStartBottling: () => void;
}

export default function CantinaView({
  cantinaSubView,
  setCantinaSubView,
  tanks,
  isAddingTank,
  setIsAddingTank,
  newTank,
  setNewTank,
  handleCreateTank,
  activeAnalysisTank,
  setActiveAnalysisTank,
  analysisData,
  setAnalysisData,
  handleSaveAnalysis,
  activeBottlingTank,
  setActiveBottlingTank,
  bottlingLiters,
  setBottlingLiters,
  handleStartBottling,
}: Props) {
  // JSX originale della Cantina (modali inclusi)
  return (
    <div className="space-y-8 animate-fadeIn">
      {cantinaSubView === 'SERBATOI' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Cantina e Vasi Vinari</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Gestione dei serbatoi, volumi attuali e imbottigliamento lotti.</p>
            </div>
            <button
              onClick={() => setIsAddingTank(true)}
              className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Aggiungi Serbatoio
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tanks.map(tank => {
              const fillPercentage = Math.round((tank.currentLiters / tank.capacity) * 100);
              return (
                <div key={tank.id} className="bg-white rounded-xl border border-[#EBEBEF] shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
                  {/* ... copia tutto il contenuto della card serbatoio ... */}
                  {/* ASSICURATI di usare setActiveAnalysisTank, setActiveBottlingTank, ecc. */}
                </div>
              );
            })}
          </div>
        </>
      )}

      {cantinaSubView === 'ANALISI_STORICO' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-extrabold text-lg text-red-950">Analisi Chimiche di Laboratorio</h3>
          <p className="text-xs text-gray-500">Riepilogo delle ultime misurazioni memorizzate per ciascun vaso vinario.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-4">Serbatoio</th>
                  <th className="py-3 px-4">Vino contenuto</th>
                  <th className="py-3 px-4 text-center">pH</th>
                  <th className="py-3 px-4 text-center">SO₂ Libera (mg/l)</th>
                  <th className="py-3 px-4 text-center">Alcol % Vol</th>
                </tr>
              </thead>
              <tbody>
                {tanks.map(t => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-bold">{t.name}</td>
                    <td className="py-3 px-4 font-extrabold text-gray-700">{t.wineType}</td>
                    <td className="py-3 px-4 text-center font-bold text-gray-900">{t.ph || '-'}</td>
                    <td className="py-3 px-4 text-center font-bold text-gray-900">{t.so2 || '-'}</td>
                    <td className="py-3 px-4 text-center font-bold text-gray-900">{t.alcohol ? `${t.alcohol}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL AGGIUNTA SERBATOIO */}
      {isAddingTank && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-red-950">Aggiungi Serbatoio</h3>
              <button onClick={() => setIsAddingTank(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateTank} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Vasca/Serbatoio</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Vasca Acciaio A102"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                  value={newTank.name}
                  onChange={(e) => setNewTank({...newTank, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Capacità Totale (Litri)</label>
                  <input
                    type="number"
                    required
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                    value={newTank.capacity}
                    onChange={(e) => setNewTank({...newTank, capacity: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Litri Iniziali</label>
                  <input
                    type="number"
                    required
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                    value={newTank.currentLiters}
                    onChange={(e) => setNewTank({...newTank, currentLiters: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Varietà/Tipologia Vino</label>
                <input
                  type="text"
                  placeholder="Es. Aglianico del Taburno, Falanghina, ecc."
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                  value={newTank.wineType}
                  onChange={(e) => setNewTank({...newTank, wineType: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingTank(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANALISI CHIMICA */}
      {activeAnalysisTank && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-red-950">Laboratorio Interno</h3>
                <p className="text-xs text-gray-400 mt-0.5">{activeAnalysisTank.name}</p>
              </div>
              <button onClick={() => setActiveAnalysisTank(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveAnalysis} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">pH</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Es. 3.45"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                    value={analysisData.ph}
                    onChange={(e) => setAnalysisData({...analysisData, ph: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SO₂ Libera</label>
                  <input
                    type="number"
                    placeholder="Es. 35"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                    value={analysisData.so2}
                    onChange={(e) => setAnalysisData({...analysisData, so2: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grado %</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Es. 13.5"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                    value={analysisData.alcohol}
                    onChange={(e) => setAnalysisData({...analysisData, alcohol: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setActiveAnalysisTank(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Chiudi</button>
                <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMBOTTIGLIAMENTO (AVVIO PROCESSO) */}
      {activeBottlingTank && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6 text-sm">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-red-950">Nuovo Lotto Vetro Nudo</h3>
                <p className="text-xs text-amber-800 font-bold mt-0.5">Origine: {activeBottlingTank.name}</p>
              </div>
              <button onClick={() => setActiveBottlingTank(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Litri di vino da imbottigliare</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                  max={activeBottlingTank.currentLiters}
                  value={bottlingLiters}
                  onChange={(e) => setBottlingLiters(Number(e.target.value))}
                />
              </div>
              <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-950 font-bold">Stima Bottiglie in Uscita</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Basato su bottiglie da 0.75L</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-red-950">
                    {Math.floor(bottlingLiters / 0.75)}
                  </span>
                  <span className="text-xs text-gray-500 block">bottiglie</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setActiveBottlingTank(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                <button onClick={handleStartBottling} className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Inizia</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
