import React from 'react';
import { Wine, Package, ListTodo, ShoppingCart, Leaf } from 'lucide-react';
import { ActiveArea, TodoTask } from '../../types';

interface Props {
  activeTodosCount: number;
  onNavigate: (area: ActiveArea, subView?: string) => void;
}

export default function HubDashboard({ activeTodosCount, onNavigate }: Props) {
  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6 animate-fadeIn">
      <div className="text-center md:text-left border-b border-[#EBEBEF] pb-6 space-y-2">
        <div className="inline-flex items-center gap-3 bg-red-950/5 text-red-950 px-4 py-1.5 rounded-full border border-red-950/10">
          <Wine className="w-4 h-4" />
          <span className="text-xs font-black tracking-widest uppercase">Gestionale Aziendale</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-red-950">Vigne di Malies</h2>
        <p className="text-sm text-gray-500 max-w-xl">Benvenuto nel portale gestionale. Seleziona un'area di lavoro per accedere alle funzioni e ai dati dedicati.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Area Campagna */}
        <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-sm opacity-80 relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-emerald-200">
            Prossimamente
          </div>
          <div>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center mb-6 border border-emerald-100">
              <Leaf className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl text-gray-900">Area Campagna</h3>
            <p className="text-xs text-gray-400 mt-2">Quaderno di campagna, rilievi meteo e agronomia di precisione.</p>
          </div>
          <div className="pt-8">
            <button disabled className="w-full py-3 bg-gray-50 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed">
              Area in Sviluppo
            </button>
          </div>
        </div>

        {/* Card Cantina */}
        <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-red-950/20 hover:shadow-md transition-all shadow-sm group">
          <div>
            <div className="w-14 h-14 bg-red-50 text-red-900 rounded-xl flex items-center justify-center mb-6 border border-red-100">
              <Wine className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl text-red-950">Area Cantina</h3>
            <p className="text-xs text-gray-500 mt-2">Mappatura dei vasi vinari, parametri chimici di laboratorio e travaso delle masse.</p>
          </div>
          <div className="pt-8">
            <button
              onClick={() => onNavigate('CANTINA', 'SERBATOI')}
              className="w-full py-3 bg-red-950 hover:bg-red-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Entra in Cantina
            </button>
          </div>
        </div>

        {/* Card Magazzino */}
        <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-amber-950/20 hover:shadow-md transition-all shadow-sm group">
          <div>
            <div className="w-14 h-14 bg-amber-50 text-amber-800 rounded-xl flex items-center justify-center mb-6 border border-amber-100">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl text-amber-950">Area Magazzino</h3>
            <p className="text-xs text-gray-500 mt-2">Inventario dei materiali secchi, lotti in vetro nudo e imbottigliamento.</p>
          </div>
          <div className="pt-8">
            <button
              onClick={() => onNavigate('MAGAZZINO', 'INVENTARIO')}
              className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Entra nel Magazzino
            </button>
          </div>
        </div>

        {/* Card Vendite */}
        <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-blue-950/20 hover:shadow-md transition-all shadow-sm group">
          <div>
            <div className="w-14 h-14 bg-blue-50 text-blue-800 rounded-xl flex items-center justify-center mb-6 border border-blue-100">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl text-blue-950">Area Vendite</h3>
            <p className="text-xs text-gray-500 mt-2">Registro clienti, ordini pronti alla spedizione e storico vendite geografico.</p>
          </div>
          <div className="pt-8">
            <button
              onClick={() => onNavigate('VENDITE', 'CLIENTI')}
              className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Entra in Vendite
            </button>
          </div>
        </div>

        {/* Card Todo */}
        <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-purple-950/20 hover:shadow-md transition-all shadow-sm group">
          <div>
            <div className="w-14 h-14 bg-purple-50 text-purple-800 rounded-xl flex items-center justify-center mb-6 border border-purple-100">
              <ListTodo className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl text-purple-950">Area Cose da fare</h3>
            <p className="text-xs text-gray-500 mt-2">Task manager per creare promemoria interni agganciati a lotti di produzione o ordini.</p>
          </div>
          <div className="pt-8">
            <button
              onClick={() => onNavigate('TODO', 'ATTIVI')}
              className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Apri Promemoria ({activeTodosCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
