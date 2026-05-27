import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy, where
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Cliente, Ordine, RigaOrdine, ArticoloMagazzino, StatoOrdine } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, X, User, ShoppingCart, ChevronRight, Package, Edit3, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";

function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 dialog-overlay" onClick={onClose} />
      <div className={cn(
        "relative z-10 bg-white rounded-2xl shadow-2xl w-full animate-slide-up border border-stone-200",
        wide ? "max-w-2xl" : "max-w-md"
      )}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h3 className="font-display text-lg text-stone-800">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[75vh]">{children}</div>
      </div>
    </div>
  );
}

function StatoBadge({ stato }: { stato: StatoOrdine }) {
  switch (stato) {
    case "bozza": return <span className="badge-grigio">Bozza</span>;
    case "confermato": return <span className="badge-blu">Confermato</span>;
    case "evaso": return <span className="badge-verde"><CheckCircle2 size={10} /> Evaso</span>;
    case "annullato": return <span className="badge-rosso">Annullato</span>;
  }
}

export default function Vendite() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"ordini" | "clienti">("ordini");

  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [prodotti, setProdotti] = useState<ArticoloMagazzino[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddCliente, setShowAddCliente] = useState(false);
  const [showNewOrdine, setShowNewOrdine] = useState(searchParams.get("new") === "1");
  const [showDettaglio, setShowDettaglio] = useState<Ordine | null>(null);
  const [saving, setSaving] = useState(false);

  const [clienteForm, setClienteForm] = useState({
    ragioneSociale: "", email: "", telefono: "", indirizzo: "", piva: "", note: ""
  });

  const [ordineForm, setOrdineForm] = useState({
    clienteId: "",
    righe: [{ prodottoId: "", nomeProdotto: "", quantita: "", prezzoUnitario: "" }],
    note: "",
  });

  async function loadAll() {
    const [cliSnap, ordSnap, artSnap] = await Promise.all([
      getDocs(query(collection(db, "clienti"), orderBy("ragioneSociale"))),
      getDocs(query(collection(db, "ordini"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "magazzino")),
    ]);
    setClienti(cliSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Cliente)));
    setOrdini(ordSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Ordine)));
    setProdotti(
      artSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as ArticoloMagazzino))
        .filter((a) => a.tipo === "prodotto_finito")
    );
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSalvaCliente(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "clienti"), {
        ...clienteForm, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setClienteForm({ ragioneSociale: "", email: "", telefono: "", indirizzo: "", piva: "", note: "" });
      setShowAddCliente(false);
      loadAll();
    } finally { setSaving(false); }
  }

  async function handleCreaOrdine(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const cliente = clienti.find((c) => c.id === ordineForm.clienteId);
      if (!cliente) return;

      const righe: RigaOrdine[] = ordineForm.righe
        .filter((r) => r.prodottoId && parseInt(r.quantita) > 0)
        .map((r) => ({
          prodottoId: r.prodottoId,
          nomeProdotto: prodotti.find((p) => p.id === r.prodottoId)?.nome || "",
          quantita: parseInt(r.quantita),
          prezzoUnitario: r.prezzoUnitario ? parseFloat(r.prezzoUnitario) : undefined,
        }));

      if (righe.length === 0) return;

      const totaleBottiglie = righe.reduce((s, r) => s + r.quantita, 0);
      const totaleValore = righe.reduce((s, r) => s + (r.quantita * (r.prezzoUnitario ?? 0)), 0);

      await addDoc(collection(db, "ordini"), {
        clienteId: cliente.id,
        nomeCliente: cliente.ragioneSociale,
        righe,
        stato: "bozza",
        dataOrdine: serverTimestamp(),
        note: ordineForm.note,
        totaleBottiglie,
        totaleValore,
        utenteId: user?.uid ?? "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setOrdineForm({
        clienteId: "",
        righe: [{ prodottoId: "", nomeProdotto: "", quantita: "", prezzoUnitario: "" }],
        note: "",
      });
      setShowNewOrdine(false);
      loadAll();
    } finally { setSaving(false); }
  }

  async function handleEvadi(ordine: Ordine) {
    setSaving(true);
    try {
      // Scala dal prodotto finito
      for (const riga of ordine.righe) {
        const art = prodotti.find((p) => p.id === riga.prodottoId);
        if (art) {
          await updateDoc(doc(db, "magazzino", art.id), {
            quantita: Math.max(0, art.quantita - riga.quantita),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await updateDoc(doc(db, "ordini", ordine.id), {
        stato: "evaso",
        dataEvasione: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowDettaglio(null);
      loadAll();
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-wine-200 border-t-wine-700 rounded-full animate-spin" />
      </div>
    );
  }

  const ordiniAperti = ordini.filter((o) => o.stato === "bozza" || o.stato === "confermato");

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="section-title">Vendite & Ordini</h1>
          <p className="section-sub">
            {ordiniAperti.length} ordini aperti · {clienti.length} clienti
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddCliente(true)} className="btn-secondary flex items-center gap-2">
            <User size={15} /> Nuovo Cliente
          </button>
          <button
            onClick={() => setShowNewOrdine(true)}
            disabled={clienti.length === 0 || prodotti.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={15} /> Nuovo Ordine
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "ordini", label: "📦 Ordini" },
          { key: "clienti", label: "👤 Clienti" },
        ].map((t) => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border",
              activeTab === t.key
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Ordini ──────────────────────────────────────── */}
      {activeTab === "ordini" && (
        <div>
          {ordini.length === 0 ? (
            <div className="card-base flex flex-col items-center justify-center py-20 text-center">
              <ShoppingCart size={40} className="text-stone-300 mb-4" />
              <p className="font-display text-lg text-stone-500">Nessun ordine</p>
            </div>
          ) : (
            <div className="card-base overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    {["Cliente", "Bottiglie", "Valore", "Stato", ""].map((h) => (
                      <th key={h} className={cn(
                        "px-5 py-3.5 text-xs font-medium text-stone-400 uppercase tracking-wider",
                        h === "Cliente" ? "text-left" : "text-right"
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {ordini.map((o) => (
                    <tr key={o.id} className="hover:bg-stone-50/50 transition-colors cursor-pointer"
                      onClick={() => setShowDettaglio(o)}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-stone-800">{o.nomeCliente}</div>
                        <div className="text-xs text-stone-400">
                          {o.dataOrdine?.toDate?.().toLocaleDateString("it-IT") || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        {o.totaleBottiglie.toLocaleString("it-IT")} bt
                      </td>
                      <td className="px-5 py-4 text-right">
                        {o.totaleValore ? formatCurrency(o.totaleValore) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right"><StatoBadge stato={o.stato} /></td>
                      <td className="px-5 py-4 text-right">
                        <ChevronRight size={14} className="text-stone-300 inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Clienti ─────────────────────────────────────── */}
      {activeTab === "clienti" && (
        <div>
          {clienti.length === 0 ? (
            <div className="card-base flex flex-col items-center justify-center py-20 text-center">
              <User size={40} className="text-stone-300 mb-4" />
              <p className="font-display text-lg text-stone-500">Nessun cliente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clienti.map((c) => {
                const storicoOrdini = ordini.filter((o) => o.clienteId === c.id);
                return (
                  <div key={c.id} className="card-base p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-display text-base text-stone-800">{c.ragioneSociale}</div>
                        {c.email && <div className="text-xs text-stone-500 mt-0.5">{c.email}</div>}
                        {c.telefono && <div className="text-xs text-stone-400">{c.telefono}</div>}
                        {c.piva && <div className="text-xs text-stone-400">P.IVA: {c.piva}</div>}
                      </div>
                      <span className="badge-grigio">{storicoOrdini.length} ord.</span>
                    </div>
                    {storicoOrdini.length > 0 && (
                      <div className="border-t border-stone-100 pt-3 mt-1">
                        <div className="text-xs text-stone-400 mb-2 uppercase tracking-wider">Ultimi ordini</div>
                        {storicoOrdini.slice(0, 3).map((o) => (
                          <div key={o.id} className="flex items-center justify-between text-xs py-1">
                            <span className="text-stone-600">{o.totaleBottiglie} bt</span>
                            <StatoBadge stato={o.stato} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Nuovo Cliente ─────────────────────────── */}
      <Modal open={showAddCliente} onClose={() => setShowAddCliente(false)} title="Nuovo Cliente">
        <form onSubmit={handleSalvaCliente} className="space-y-4">
          <div>
            <label className="label-base">Ragione Sociale *</label>
            <input className="input-base" placeholder="es. Enoteca Corsi"
              value={clienteForm.ragioneSociale}
              onChange={(e) => setClienteForm({ ...clienteForm, ragioneSociale: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Email</label>
              <input type="email" className="input-base" placeholder="info@enoteca.it"
                value={clienteForm.email}
                onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })} />
            </div>
            <div>
              <label className="label-base">Telefono</label>
              <input className="input-base" placeholder="+39 0000 000000"
                value={clienteForm.telefono}
                onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-base">Indirizzo</label>
            <input className="input-base" placeholder="Via Roma 1, Pescara"
              value={clienteForm.indirizzo}
              onChange={(e) => setClienteForm({ ...clienteForm, indirizzo: e.target.value })} />
          </div>
          <div>
            <label className="label-base">P.IVA</label>
            <input className="input-base" placeholder="IT00000000000"
              value={clienteForm.piva}
              onChange={(e) => setClienteForm({ ...clienteForm, piva: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddCliente(false)} className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvo…" : "Aggiungi Cliente"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Nuovo Ordine ──────────────────────────── */}
      <Modal open={showNewOrdine} onClose={() => setShowNewOrdine(false)} title="Nuovo Ordine" wide>
        <form onSubmit={handleCreaOrdine} className="space-y-4">
          <div>
            <label className="label-base">Cliente *</label>
            <select className="input-base" value={ordineForm.clienteId}
              onChange={(e) => setOrdineForm({ ...ordineForm, clienteId: e.target.value })} required>
              <option value="">— Seleziona cliente —</option>
              {clienti.map((c) => <option key={c.id} value={c.id}>{c.ragioneSociale}</option>)}
            </select>
          </div>

          {/* Righe prodotto */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-base mb-0">Prodotti *</label>
              <button type="button" onClick={() =>
                setOrdineForm({
                  ...ordineForm,
                  righe: [...ordineForm.righe,
                    { prodottoId: "", nomeProdotto: "", quantita: "", prezzoUnitario: "" }]
                })
              } className="text-xs text-wine-700 hover:text-wine-900 font-medium">
                + Riga
              </button>
            </div>
            <div className="space-y-2">
              {ordineForm.righe.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select className="input-base" value={r.prodottoId}
                      onChange={(e) => {
                        const updated = [...ordineForm.righe];
                        updated[i] = { ...updated[i], prodottoId: e.target.value };
                        setOrdineForm({ ...ordineForm, righe: updated });
                      }}>
                      <option value="">— Prodotto —</option>
                      {prodotti.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.quantita.toLocaleString("it-IT")} bt)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" min="1" placeholder="Qty bt"
                      className="input-base"
                      value={r.quantita}
                      onChange={(e) => {
                        const updated = [...ordineForm.righe];
                        updated[i] = { ...updated[i], quantita: e.target.value };
                        setOrdineForm({ ...ordineForm, righe: updated });
                      }} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" min="0" step="0.01" placeholder="€/bt"
                      className="input-base"
                      value={r.prezzoUnitario}
                      onChange={(e) => {
                        const updated = [...ordineForm.righe];
                        updated[i] = { ...updated[i], prezzoUnitario: e.target.value };
                        setOrdineForm({ ...ordineForm, righe: updated });
                      }} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {ordineForm.righe.length > 1 && (
                      <button type="button" onClick={() =>
                        setOrdineForm({
                          ...ordineForm,
                          righe: ordineForm.righe.filter((_, j) => j !== i)
                        })
                      } className="text-stone-300 hover:text-red-500">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totale */}
          {ordineForm.righe.some((r) => r.quantita && r.prezzoUnitario) && (
            <div className="bg-stone-50 rounded-lg px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Totale bottiglie</span>
                <span className="font-medium">
                  {ordineForm.righe.reduce((s, r) => s + parseInt(r.quantita || "0"), 0).toLocaleString("it-IT")} bt
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-stone-500">Valore totale</span>
                <span className="font-display text-base">
                  {formatCurrency(ordineForm.righe.reduce((s, r) =>
                    s + (parseInt(r.quantita || "0") * parseFloat(r.prezzoUnitario || "0")), 0))}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="label-base">Note</label>
            <textarea className="input-base resize-none" rows={2}
              value={ordineForm.note}
              onChange={(e) => setOrdineForm({ ...ordineForm, note: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNewOrdine(false)} className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Creo…" : "📦 Crea Ordine"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Dettaglio Ordine ──────────────────────── */}
      <Modal
        open={showDettaglio !== null}
        onClose={() => setShowDettaglio(null)}
        title={`Ordine — ${showDettaglio?.nomeCliente}`}
        wide
      >
        {showDettaglio && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <StatoBadge stato={showDettaglio.stato} />
              <span className="text-sm text-stone-500">
                {showDettaglio.dataOrdine?.toDate?.().toLocaleDateString("it-IT", {
                  day: "2-digit", month: "long", year: "numeric"
                })}
              </span>
            </div>

            {/* Righe */}
            <div className="card-base overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase tracking-wider">Prodotto</th>
                    <th className="text-right px-4 py-3 text-xs text-stone-400 uppercase tracking-wider">Qt</th>
                    <th className="text-right px-4 py-3 text-xs text-stone-400 uppercase tracking-wider">Prezzo</th>
                    <th className="text-right px-4 py-3 text-xs text-stone-400 uppercase tracking-wider">Subtot.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {showDettaglio.righe.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-stone-700">{r.nomeProdotto}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.quantita} bt</td>
                      <td className="px-4 py-3 text-right">{r.prezzoUnitario ? formatCurrency(r.prezzoUnitario) : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {r.prezzoUnitario ? formatCurrency(r.quantita * r.prezzoUnitario) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-200 bg-stone-50">
                    <td colSpan={3} className="px-4 py-3 text-sm font-medium text-stone-500 text-right">
                      Totale
                    </td>
                    <td className="px-4 py-3 text-right font-display text-base text-stone-800">
                      {showDettaglio.totaleValore ? formatCurrency(showDettaglio.totaleValore) : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {showDettaglio.note && (
              <div className="text-sm text-stone-500 italic">{showDettaglio.note}</div>
            )}

            {(showDettaglio.stato === "bozza" || showDettaglio.stato === "confermato") && (
              <div className="flex gap-3">
                <button onClick={() => setShowDettaglio(null)} className="btn-secondary flex-1">Chiudi</button>
                <button
                  onClick={() => handleEvadi(showDettaglio)}
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={15} />
                  {saving ? "Evasione…" : "Evadi Ordine"}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
