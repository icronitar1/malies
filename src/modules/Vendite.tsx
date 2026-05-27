import React from 'react';
import { Users, Plus } from 'lucide-react';
import { Client, Order, InventoryItem } from '../types';

interface Props {
  venditeSubView: 'CLIENTI' | 'ORDINI';
  clients: Client[];
  orders: Order[];
  inventory: InventoryItem[];
  isAddingClient: boolean;
  setIsAddingClient: (v: boolean) => void;
  newClient: { name: string; email: string; phone: string; city: string };
  setNewClient: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string; city: string }>>;
  handleCreateClient: (e: React.FormEvent) => Promise<void>;
  isAddingOrder: boolean;
  setIsAddingOrder: (v: boolean) => void;
  newOrder: { clientId: string; productId: string; quantity: number };
  setNewOrder: React.Dispatch<React.SetStateAction<{ clientId: string; productId: string; quantity: number }>>;
  handleCreateOrder: (e: React.FormEvent) => Promise<void>;
  renderDate: (dateVal: any) => string;
}

export default function Vendite({
  venditeSubView,
  clients,
  orders,
  inventory,
  isAddingClient,
  setIsAddingClient,
  newClient,
  setNewClient,
  handleCreateClient,
  isAddingOrder,
  setIsAddingOrder,
  newOrder,
  setNewOrder,
  handleCreateOrder,
  renderDate,
}: Props) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {venditeSubView === 'CLIENTI' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Anagrafica Clienti</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Elenco dei clienti abilitati, recapiti e storico spedizioni.</p>
            </div>
            <button
              onClick={() => setIsAddingClient(true)}
              className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Users className="w-4 h-4" /> Nuovo Cliente
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(client => {
              const clientOrders = orders.filter(o => o.clientId === client.id);
              return (
                <div key={client.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-lg text-gray-900">{client.name}</h4>
                      <span className="text-[10px] bg-red-50 text-red-950 px-2 py-0.5 rounded font-bold border border-red-100">
                        {clientOrders.length} Spedizioni
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">Sede: {client.city || 'Non indicata'}</p>
                    <div className="text-xs text-gray-500 mt-3 space-y-1">
                      {client.phone && <p>📞 {client.phone}</p>}
                      {client.email && <p>✉️ {client.email}</p>}
                    </div>
                  </div>
                  {clientOrders.length > 0 && (
                    <div className="text-xs bg-[#FAF9F6] p-3 rounded-xl border border-gray-200/50 space-y-1">
                      <p className="font-extrabold text-gray-400 text-[10px] uppercase">Ultimi Acquisti:</p>
                      {clientOrders.slice(0, 2).map((o, idx) => (
                        <div key={idx} className="flex justify-between text-gray-600">
                          <span className="truncate max-w-[150px]">{o.productName.replace(' - Finito', '')}</span>
                          <span className="font-bold">{o.quantity} pz</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {venditeSubView === 'ORDINI' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Ordini ed Evasioni</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Storico delle bottiglie etichettate spedite dal magazzino.</p>
            </div>
            <button
              onClick={() => { setIsAddingOrder(true); }}
              className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuovo Ordine Spedito
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Destinatario</th>
                  <th className="py-3 px-4">Vino</th>
                  <th className="py-3 px-4 text-center">Quantità</th>
                  <th className="py-3 px-4 text-right">Stato</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3.5 px-4 font-bold">{renderDate(order.date)}</td>
                    <td className="py-3.5 px-4 font-extrabold text-gray-800">{order.clientName}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-700">{order.productName.replace(' - Finito', '')}</td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-gray-900">{order.quantity} btg</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-block bg-emerald-100 text-emerald-950 border border-emerald-200 font-extrabold px-2.5 py-1 rounded-full text-[9px] uppercase">
                        Merce Evasa
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL NUOVO CLIENTE */}
      {isAddingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-red-950">Aggiungi Cliente</h3>
              <button onClick={() => setIsAddingClient(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nominativo / Enoteca / Ristorante</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Ristorante da Mimmo"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Città</label>
                  <input
                    type="text"
                    placeholder="Es. Milano"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    value={newClient.city}
                    onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefono</label>
                  <input
                    type="text"
                    placeholder="Es. 02 5551234"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingClient(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUOVO ORDINE */}
      {isAddingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-red-950">Evasione Spedizione Ordine</h3>
              <button onClick={() => setIsAddingOrder(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Cliente</label>
                <select
                  required
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                  value={newOrder.clientId}
                  onChange={(e) => setNewOrder({...newOrder, clientId: e.target.value})}
                >
                  <option value="">Seleziona...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Prodotto Finito</label>
                <select
                  required
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                  value={newOrder.productId}
                  onChange={(e) => setNewOrder({...newOrder, productId: e.target.value})}
                >
                  <option value="">Seleziona...</option>
                  {inventory.filter(i => i.category === 'PRODOTTO_FINITO').map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.quantity} pz disponibili)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantità</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({...newOrder, quantity: Number(e.target.value)})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingOrder(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Spedisci</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
