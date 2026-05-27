import React from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { TodoTask, BottlingProcess, Order } from '../types';

interface Props {
  todoSubView: 'ATTIVI' | 'COMPLETATI';
  setTodoSubView: (v: 'ATTIVI' | 'COMPLETATI') => void;
  todos: TodoTask[];
  isAddingTodo: boolean;
  setIsAddingTodo: (v: boolean) => void;
  newTodo: { title: string; dueDate: string; relatedEntityId: string; relatedEntityType: '' | 'IMBOTTIGLIAMENTO' | 'ORDINE' };
  setNewTodo: React.Dispatch<React.SetStateAction<{ title: string; dueDate: string; relatedEntityId: string; relatedEntityType: '' | 'IMBOTTIGLIAMENTO' | 'ORDINE' }>>;
  handleCreateTodo: (e: React.FormEvent) => Promise<void>;
  toggleTodoStatus: (task: TodoTask) => Promise<void>;
  handleDeleteTodo: (id: string) => Promise<void>;
  bottlings: BottlingProcess[];
  orders: Order[];
  renderDate: (dateVal: any) => string;
}

export default function Todo({
  todoSubView,
  setTodoSubView,
  todos,
  isAddingTodo,
  setIsAddingTodo,
  newTodo,
  setNewTodo,
  handleCreateTodo,
  toggleTodoStatus,
  handleDeleteTodo,
  bottlings,
  orders,
  renderDate,
}: Props) {
  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Area Cose da fare</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Gestione dei task interni e note operative della cantina.</p>
        </div>
        <button
          onClick={() => setIsAddingTodo(true)}
          className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuovo Promemoria
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {todos
          .filter(t => (todoSubView === 'ATTIVI' ? t.status !== 'COMPLETATO' : t.status === 'COMPLETATO'))
          .map(task => (
            <div
              key={task.id}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                task.status === 'COMPLETATO'
                  ? 'bg-[#FAFAFC] border-gray-200 opacity-60'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTodoStatus(task)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                    task.status === 'COMPLETATO'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 hover:border-red-950 bg-white'
                  }`}
                >
                  {task.status === 'COMPLETATO' && <Check className="w-3.5 h-3.5" />}
                </button>
                <div>
                  <p className={`font-extrabold text-sm ${task.status === 'COMPLETATO' ? 'line-through text-gray-400' : 'text-gray-950'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2.5 mt-1.5 text-[10px]">
                    {task.dueDate && <span className="text-gray-400">Scadenza: {renderDate(task.dueDate)}</span>}
                    {task.relatedEntityId && (
                      <span className="text-blue-800 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        🔗 {task.relatedEntityName || 'Processo Collegato'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteTodo(task.id)}
                className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
      </div>

      {/* MODAL CREAZIONE TODO */}
      {isAddingTodo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-red-950">Nuovo Promemoria Aziendale</h3>
              <button onClick={() => setIsAddingTodo(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateTodo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cosa c'è da fare?</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Sostituire filtri a cartuccia"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Scadenza</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    value={newTodo.dueDate}
                    onChange={(e) => setNewTodo({...newTodo, dueDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo Associazione</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                    value={newTodo.relatedEntityType}
                    onChange={(e) => setNewTodo({...newTodo, relatedEntityType: e.target.value as any})}
                  >
                    <option value="">Nessuna associazione</option>
                    <option value="IMBOTTIGLIAMENTO">Processo Imbottigliamento</option>
                    <option value="ORDINE">Ordine Spedizione</option>
                  </select>
                </div>
              </div>

              {newTodo.relatedEntityType === 'IMBOTTIGLIAMENTO' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Lotto Imbottigliamento</label>
                  <select
                    required
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                    value={newTodo.relatedEntityId}
                    onChange={(e) => setNewTodo({...newTodo, relatedEntityId: e.target.value})}
                  >
                    <option value="">Seleziona lotto attivo...</option>
                    {bottlings.filter(b => b.status === 'IN_CORSO').map(b => (
                      <option key={b.id} value={b.id}>{b.tankName} - {b.wineType}</option>
                    ))}
                  </select>
                </div>
              )}

              {newTodo.relatedEntityType === 'ORDINE' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Ordine Cliente</label>
                  <select
                    required
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                    value={newTodo.relatedEntityId}
                    onChange={(e) => setNewTodo({...newTodo, relatedEntityId: e.target.value})}
                  >
                    <option value="">Seleziona ordine...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>Spedizione a {o.clientName} ({o.quantity} pz)</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingTodo(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
