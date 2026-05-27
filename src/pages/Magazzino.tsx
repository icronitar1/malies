import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "@/firebase";
import { ArticoloMagazzino, TipoMagazzino } from "@/types";
import { cn } from "@/lib/utils";
import { Plus, AlertTriangle, X, Package, Edit3 } from "lucide-react";

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 dialog-overlay" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up border border-stone-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h3 className="font-display text-lg text-stone-800">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const TIPO_LABELS: Record<TipoMagazzino, string> = {
  materiali_secchi: "Materiali Secchi",
  vetro_nudo: "Vetro Nudo (Da Etichettare)",
  prodotto_finito: "Prodotto Finito / Etichettato",
};

const TIPO_COLORS: Record<TipoMagazzino, string> = {
  materiali_secchi: "bg-terracotta-50 border-terracotta-200 text-terracotta-800",
  vetro_nudo: "bg-blue-50 border-blue-200 text-blue-800",
  prodotto_finito: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

export default function Magazzino() {
  const [articoli, setArticoli] = useState<ArticoloMagazzino[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TipoMagazzino>("materiali_secchi");
  const [showAdd, setShowAdd] = useState(false);
  const [editingArticolo, setEditingArticolo] = useState<ArticoloMagazzino | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    nome: "", tipo: "materiali_secchi" as TipoMagazzino,
    quantita: "", unitaMisura: "pz", sogliaMinimaAllerta: "", note: ""
  };
  const [form, setForm] = useState(emptyForm);

  async function loadArticoli() {
    const snap = await getDocs(collection(db, "magazzino"));
    setArticoli(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticoloMagazzino)));
    setLoading(false);
  }

  useEffect(() => { loadArticoli(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        nome: form.nome,
        tipo: form.tipo,
        quantita: parseFloat(form.quantita || "0"),
        unitaMisura: form.unitaMisura,
        sogliaMinimaAllerta: form.sogliaMinimaAllerta ? parseFloat(form.sogliaMinimaAllerta) : null,
        note: form.note,
        updatedAt: serverTimestamp(),
      };

      if (editingArticolo) {
        await updateDoc(doc(db, "magazzino", editingArticolo.id), data);
      } else {
        await addDoc(collection(db, "magazzino"), {
          ...data, createdAt: serverTimestamp(),
        });
      }

      setForm(emptyForm);
      setShowAdd(false);
      setEditingArticolo(null);
      loadArticoli();
    } finally {
      setSaving(false);
    }
  }

  function openEdit(a: ArticoloMagazzino) {
    setEditingArticolo(a);
    setForm({
      nome: a.nome, tipo: a.tipo,
      quantita: String(a.quantita),
      unitaMisura: a.unitaMisura,
      sogliaMinimaAllerta: a.sogliaMinimaAllerta != null ? String(a.sogliaMinimaAllerta) : "",
      note: a.note ?? "",
    });
    setShowAdd(true);
  }

  const filtered = articoli.filter((a) => a.tipo === activeTab);
  const tabs: TipoMagazzino[] = ["materiali_secchi", "vetro_nudo", "prodotto_finito"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-wine-200 border-t-wine-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="section-title">Magazzino</h1>
          <p className="section-sub">Gestione scorte materiali, vetro nudo e prodotto finito.</p>
        </div>
        <button onClick={() => { setEditingArticolo(null); setForm(emptyForm); setShowAdd(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuovo Articolo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => {
          const count = articoli.filter((a) => a.tipo === t).length;
          const alerts = articoli.filter(
            (a) => a.tipo === t && a.sogliaMinimaAllerta != null && a.quantita < a.sogliaMinimaAllerta
          ).length;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border",
                activeTab === t
                  ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-800"
              )}
            >
              {TIPO_LABELS[t]}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-mono",
                activeTab === t ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"
              )}>
                {count}
              </span>
              {alerts > 0 && (
                <AlertTriangle size={12} className="text-amber-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tabella articoli */}
      {filtered.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center py-20 text-center">
          <Package size={40} className="text-stone-300 mb-4" />
          <p className="font-display text-lg text-stone-500 mb-1">Nessun articolo</p>
          <p className="text-sm text-stone-400">Aggiungi il primo articolo per questa categoria.</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-stone-400 uppercase tracking-wider">
                  Articolo
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-stone-400 uppercase tracking-wider">
                  Quantità
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-stone-400 uppercase tracking-wider">
                  Soglia Min.
                </th>
                <th className="text-center px-5 py-3.5 text-xs font-medium text-stone-400 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map((a) => {
                const sottoSoglia =
                  a.sogliaMinimaAllerta != null && a.quantita < a.sogliaMinimaAllerta;
                return (
                  <tr key={a.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-stone-800">{a.nome}</div>
                      {a.note && <div className="text-xs text-stone-400 mt-0.5">{a.note}</div>}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-medium text-stone-700">
                      {a.quantita.toLocaleString("it-IT")} {a.unitaMisura}
                    </td>
                    <td className="px-5 py-4 text-right text-stone-500">
                      {a.sogliaMinimaAllerta != null
                        ? `${a.sogliaMinimaAllerta.toLocaleString("it-IT")} ${a.unitaMisura}`
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {sottoSoglia ? (
                        <span className="badge-giallo">
                          <AlertTriangle size={10} /> Allerta
                        </span>
                      ) : (
                        <span className="badge-verde">
                          ✓ OK
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(a)} className="btn-ghost p-1.5 text-stone-400">
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingArticolo(null); setForm(emptyForm); }}
        title={editingArticolo ? `Modifica: ${editingArticolo.nome}` : "Nuovo Articolo Magazzino"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-base">Nome Articolo *</label>
            <input className="input-base" placeholder="es. Bottiglie Bordolese 0.75L"
              value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div>
            <label className="label-base">Categoria *</label>
            <select className="input-base" value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoMagazzino })}>
              {tabs.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Quantità *</label>
              <input type="number" min="0" step="0.01" className="input-base" placeholder="0"
                value={form.quantita}
                onChange={(e) => setForm({ ...form, quantita: e.target.value })} required />
            </div>
            <div>
              <label className="label-base">Unità di Misura</label>
              <select className="input-base" value={form.unitaMisura}
                onChange={(e) => setForm({ ...form, unitaMisura: e.target.value })}>
                {["pz", "bt", "kg", "g", "m", "fogli", "rotoli"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-base">Soglia Minima Allerta</label>
            <input type="number" min="0" step="0.01" className="input-base" placeholder="Lascia vuoto per nessun allerta"
              value={form.sogliaMinimaAllerta}
              onChange={(e) => setForm({ ...form, sogliaMinimaAllerta: e.target.value })} />
          </div>
          <div>
            <label className="label-base">Note</label>
            <input className="input-base" placeholder="Opzionale"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button"
              onClick={() => { setShowAdd(false); setEditingArticolo(null); setForm(emptyForm); }}
              className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvo…" : editingArticolo ? "Salva Modifiche" : "Aggiungi Articolo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
