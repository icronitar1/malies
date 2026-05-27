import React from 'react';
import { Tag, Plus, Package, Wine, Sliders } from 'lucide-react';
import { InventoryItem, BottlingProcess } from '../types';

interface Props {
  magazzinoSubView: 'INVENTARIO' | 'PROCESSI_ATTIVI';
  setMagazzinoSubView: (v: 'INVENTARIO' | 'PROCESSI_ATTIVI') => void;
  inventory: InventoryItem[];
  isLabelingModalOpen: boolean;
  setIsLabelingModalOpen: (v: boolean) => void;
  labelingSource: string;
  setLabelingSource: React.Dispatch<React.SetStateAction<string>>;
  labelingQty: number;
  setLabelingQty: React.Dispatch<React.SetStateAction<number>>;
  labelingRecipe: string;
  setLabelingRecipe: React.Dispatch<React.SetStateAction<string>>;
  handleLabelingProcess: (e: React.FormEvent) => Promise<void>;
  isAddingItem: boolean;
  setIsAddingItem: (v: boolean) => void;
  newItem: { name: string; category: 'MATERIALE_SECCO' | 'VETRO_NUDO' | 'PRODOTTO_FINITO'; quantity: number; unit: string };
  setNewItem: React.Dispatch<React.SetStateAction<{ name: string; category: 'MATERIALE_SECCO' | 'VETRO_NUDO' | 'PRODOTTO_FINITO'; quantity: number; unit: string }>>;
  handleCreateInventoryItem: (e: React.FormEvent) => Promise<void>;
  bottlings: BottlingProcess[];
  activeCompleteBottling: BottlingProcess | null;
  setActiveCompleteBottling: React.Dispatch<React.SetStateAction<BottlingProcess | null>>;
  actualBottlesCount: number;
  setActualBottlesCount: React.Dispatch<React.SetStateAction<number>>;
  handleCompleteBottling: () => Promise<void>;
  handleQuickAddStock: (itemId: string, currentQty: number, amount: number) => Promise<void>;
}

export default function Magazzino({
  magazzinoSubView,
  setMagazzinoSubView,
  inventory,
  isLabelingModalOpen,
  setIsLabelingModalOpen,
  labelingSource,
  setLabelingSource,
  labelingQty,
  setLabelingQty,
  labelingRecipe,
  setLabelingRecipe,
  handleLabelingProcess,
  isAddingItem,
  setIsAddingItem,
  newItem,
  setNewItem,
  handleCreateInventoryItem,
  bottlings,
  activeCompleteBottling,
  setActiveCompleteBottling,
  actualBottlesCount,
  setActualBottlesCount,
  handleCompleteBottling,
  handleQuickAddStock,
}: Props) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {magazzinoSubView === 'INVENTARIO' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Gestione Magazzino</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Giacenze materiali secchi, lotti in vetro nudo ed etichettatura in tempo reale.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsLabelingModalOpen(true)}
                className="w-full sm:w-auto bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-amber-800 transition flex items-center justify-center gap-2 shadow-sm animate-pulse"
              >
                <Tag className="w-4 h-4" /> Etichetta Vetro Nudo
              </button>
              <button
                onClick={() => setIsAddingItem(true)}
                className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Aggiungi Articolo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categoria 1: Materiale Secco */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-extrabold text-base text-red-950 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-800" />
                  1. Materiali Secchi
                </h3>
              </div>
              <div className="space-y-3">
                {inventory.filter(i => i.category === 'MATERIALE_SECCO').map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
                    <div>
                      <p className="font-bold text-gray-800">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">{item.quantity} {item.unit}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickAddStock(item.id, item.quantity, 500)}
                        className="bg-white border border-gray-200 text-[10px] px-2 py-1 rounded font-bold shadow-sm"
                      >
                        +500
                      </button>
                      <button
                        onClick={() => handleQuickAddStock(item.id, item.quantity, -100)}
                        className="bg-white border border-gray-200 text-[10px] px-2 py-1 rounded font-bold shadow-sm"
                      >
                        -100
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categoria 2: Vetro Nudo */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-extrabold text-base text-red-950 flex items-center gap-2">
                  <Wine className="w-4 h-4 text-amber-800" />
                  2. Vetro Nudo (Imbottigliato)
                </h3>
              </div>
              <div className="space-y-3">
                {inventory.filter(i => i.category === 'VETRO_NUDO').map(item => (
                  <div key={item.id} className="bg-amber-50/10 p-3 rounded-lg border border-amber-100 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-amber-950">{item.name}</p>
                      <p className="text-[10px] text-amber-800 font-bold uppercase mt-0.5">{item.quantity} pz</p>
                    </div>
                    <button
                      onClick={() => {
                        setLabelingSource(item.id);
                        setLabelingQty(item.quantity);
                        setIsLabelingModalOpen(true);
                      }}
                      className="bg-amber-800 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-md"
                    >
                      Confez.
                    </button>
                  </div>
                ))}
                {inventory.filter(i => i.category === 'VETRO_NUDO').length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">Nessun lotto in vetro nudo.</p>
                )}
              </div>
            </div>

            {/* Categoria 3: Prodotto Finito */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-extrabold text-base text-red-950 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-800" />
                  3. Prodotto Finito (Pronto)
                </h3>
              </div>
              <div className="space-y-3">
                {inventory.filter(i => i.category === 'PRODOTTO_FINITO').map(item => (
                  <div key={item.id} className="bg-emerald-50/10 p-3 rounded-lg border border-emerald-100 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-emerald-950">{item.name}</p>
                      <p className="text-[10px] text-emerald-800 font-bold uppercase mt-0.5">{item.quantity} pz</p>
                    </div>
                    <span className="text-[9px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-extrabold border border-emerald-200 uppercase">Vendibile</span>
                  </div>
                ))}
                {inventory.filter(i => i.category === 'PRODOTTO_FINITO').length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">Nessun vino confezionato pronto.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {magazzinoSubView === 'PROCESSI_ATTIVI' && (
        <div className="space-y-4 text-sm">
          <h3 className="font-extrabold text-lg text-red-950">Lotti in Processo di Imbottigliamento</h3>
          <p className="text-xs text-gray-500">Masse di vino prelevate dalle vasche di cui va confermato il volume reale e i consumabili usati.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bottlings.map(process => (
              <div key={process.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
                <div>
                  <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    process.status === 'IN_CORSO' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {process.status}
                  </span>
                  <h4 className="font-extrabold text-base text-gray-900 mt-2">{process.wineType}</h4>
                  <p className="text-xs text-gray-500">Origine: {process.tankName} • {process.litersUsed} Litri</p>
                </div>
                {process.status === 'IN_CORSO' && (
                  <button
                    onClick={() => {
                      setActiveCompleteBottling(process);
                      setActualBottlesCount(process.estimatedBottles);
                    }}
                    className="w-full bg-red-950 text-white font-bold text-xs py-2 rounded-lg"
                  >
                    Completa & Carica Magazzino
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL CHIUSURA IMBOTTIGLIAMENTO */}
      {activeCompleteBottling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-red-950">Registra Quantità Effettiva</h3>
                <p className="text-xs text-gray-400 mt-0.5">La massa vino verrà scalata dalla vasca d'origine</p>
              </div>
              <button onClick={() => setActiveCompleteBottling(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bottiglie da 0.75L prodotte</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900 font-bold"
                  value={actualBottlesCount}
                  onChange={(e) => setActualBottlesCount(Number(e.target.value))}
                />
              </div>
              <div className="bg-[#FAF9F6] border border-gray-200 rounded-xl p-4 text-xs space-y-2">
                <p className="font-extrabold text-gray-800 uppercase tracking-wider">Distinta Base Scaricata</p>
                <div className="flex justify-between text-gray-600">
                  <span>Vetro Vuoto:</span>
                  <span className="font-bold text-gray-900">-{actualBottlesCount} pz</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tappi Sughero:</span>
                  <span className="font-bold text-gray-900">-{actualBottlesCount} pz</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setActiveCompleteBottling(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                <button onClick={handleCompleteBottling} className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Conferma</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ETICHETTATURA */}
      {isLabelingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-red-950">Etichettatura e Confezionamento</h3>
                <p className="text-xs text-gray-400 mt-0.5">Seleziona la ricetta e trasforma il Vetro Nudo</p>
              </div>
              <button onClick={() => setIsLabelingModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleLabelingProcess} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Lotto Vetro Nudo</label>
                <select
                  required
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                  value={labelingSource}
                  onChange={(e) => {
                    setLabelingSource(e.target.value);
                    const selected = inventory.find(i => i.id === e.target.value);
                    if (selected) setLabelingQty(selected.quantity);
                  }}
                >
                  <option value="">Seleziona...</option>
                  {inventory.filter(i => i.category === 'VETRO_NUDO').map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.quantity} pz)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantità</label>
                  <input
                    type="number"
                    required
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    value={labelingQty}
                    onChange={(e) => setLabelingQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Linea / Ricetta</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                    value={labelingRecipe}
                    onChange={(e) => setLabelingRecipe(e.target.value)}
                  >
                    <option value="Linea Classica Malies">Linea Classica Malies</option>
                    <option value="Linea Riserva Oro">Linea Riserva Oro</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsLabelingModalOpen(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                <button type="submit" className="flex-1 bg-amber-800 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-amber-950">Procedi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGGIUNTA ARTICOLO MANUALE */}
      {isAddingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-red-950">Nuovo Articolo Magazzino</h3>
              <button onClick={() => setIsAddingItem(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateInventoryItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Articolo</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Capsule Oro lucido"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value as any})}
                  >
                    <option value="MATERIALE_SECCO">Materiale Secco</option>
                    <option value="VETRO_NUDO">Vetro Nudo</option>
                    <option value="PRODOTTO_FINITO">Prodotto Finito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unità</label>
                  <input
                    type="text"
                    required
                    placeholder="pz, kg, bottiglie"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantità Iniziale</label>
                <input
                  type="number"
                  required
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingItem(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
