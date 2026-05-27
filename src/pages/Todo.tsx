import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { TaskGenerico, Ordine, TaskImbottigliamento, TaskEtichettatura } from "@/types";
import { cn } from "@/lib/utils";
import {
  Plus, X, CheckSquare, Square, Clock, AlertCircle,
  Link2, Trash2, Calendar, ChevronDown
} from "lucide-react";

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 dialog-overlay" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up border border-stone-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h3 className="font-display text-lg text-stone-800">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}

type StatoTask = "da_fare" | "in_corso" | "fatto";
type Priorita = "bassa" | "media" | "alta";

function PrioritaBadge({ p }: { p: Priorita }) {
  switch (p) {
    case "alta": return <span className="badge-rosso">🔴 Alta</span>;
    case "media": return <span className="badge-giallo">🟡 Media</span>;
    case "bassa": return <span className="badge-grigio">⚪ Bassa</span>;
  }
}

const STATO_LABELS: Record<StatoTask, string> = {
  da_fare: "Da fare",
  in_corso: "In corso",
  fatto: "Fatto ✓",
};

export default function Todo() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskGenerico[]>([]);
  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [taskImb, setTaskImb] = useState<TaskImbottigliamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filtro, setFiltro] = useState<StatoTask | "tutti">("tutti");
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    titolo: "",
    descrizione: "",
    stato: "da_fare" as StatoTask,
    priorita: "media" as Priorita,
    scadenza: "",
    entitaTipo: "" as "" | "ordine" | "imbottigliamento" | "etichettatura",
    entitaId: "",
  };
  const [form, setForm] = useState(emptyForm);

  async function loadAll() {
    const [taskSnap, ordSnap, imbSnap] = await Promise.all([
      getDocs(query(collection(db, "task_generici"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "ordini")),
      getDocs(collection(db, "task_imbottigliamento")),
    ]);
    setTasks(taskSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskGenerico)));
    setOrdini(ordSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Ordine)));
    setTaskImb(imbSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskImbottigliamento)));
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let entitaCollegata = undefined;
      if (form.entitaTipo && form.entitaId) {
        const label = form.entitaTipo === "ordine"
          ? ordini.find((o) => o.id === form.entitaId)?.nomeCliente
          : form.entitaTipo === "imbottigliamento"
          ? taskImb.find((t) => t.id === form.entitaId)?.nomeVaso
          : "";
        entitaCollegata = { tipo: form.entitaTipo, id: form.entitaId, label: label ?? "" };
      }

      await addDoc(collection(db, "task_generici"), {
        tipo: "generico",
        titolo: form.titolo,
        descrizione: form.descrizione,
        stato: form.stato,
        priorita: form.priorita,
        scadenza: form.scadenza ? new Date(form.scadenza) : null,
        entitaCollegata: entitaCollegata ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        utenteId: user?.uid ?? "",
      });

      setForm(emptyForm);
      setShowAdd(false);
      loadAll();
    } finally { setSaving(false); }
  }

  async function toggleStato(task: TaskGenerico) {
    const next: StatoTask =
      task.stato === "da_fare" ? "in_corso"
      : task.stato === "in_corso" ? "fatto"
      : "da_fare";

    await updateDoc(doc(db, "task_generici", task.id), {
      stato: next, updatedAt: serverTimestamp()
    });
    loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo task?")) return;
    await deleteDoc(doc(db, "task_generici", id));
    loadAll();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-wine-200 border-t-wine-700 rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = filtro === "tutti" ? tasks : tasks.filter((t) => t.stato === filtro);
  const counts = {
    da_fare: tasks.filter((t) => t.stato === "da_fare").length,
    in_corso: tasks.filter((t) => t.stato === "in_corso").length,
    fatto: tasks.filter((t) => t.stato === "fatto").length,
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="section-title">Cose da Fare</h1>
          <p className="section-sub">
            {counts.da_fare} da fare · {counts.in_corso} in corso · {counts.fatto} completati
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuovo Task
        </button>
      </div>

      {/* Filtri stato */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "tutti", label: "Tutti", count: tasks.length },
          { key: "da_fare", label: "Da fare", count: counts.da_fare },
          { key: "in_corso", label: "In corso", count: counts.in_corso },
          { key: "fatto", label: "Completati", count: counts.fatto },
        ].map((f) => (
          <button key={f.key}
            onClick={() => setFiltro(f.key as typeof filtro)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150",
              filtro === f.key
                ? "bg-stone-800 text-white border-stone-800"
                : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
            )}
          >
            {f.label}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full font-mono",
              filtro === f.key ? "bg-white/20" : "bg-stone-100 text-stone-400"
            )}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Lista task */}
      {filtered.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center py-20 text-center">
          <CheckSquare size={40} className="text-stone-300 mb-4" />
          <p className="font-display text-lg text-stone-500 mb-1">Nessun task</p>
          <p className="text-sm text-stone-400">Aggiungi il primo task per iniziare a tracciare le attività.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const isDone = task.stato === "fatto";
            const isScaduto = task.scadenza?.toDate && new Date(task.scadenza.toDate()) < new Date() && !isDone;

            return (
              <div
                key={task.id}
                className={cn(
                  "card-base px-5 py-4 flex items-start gap-4 group transition-all duration-200",
                  isDone && "opacity-60"
                )}
              >
                {/* Toggle stato */}
                <button
                  onClick={() => toggleStato(task)}
                  className={cn(
                    "mt-0.5 shrink-0 transition-colors",
                    isDone ? "text-emerald-500" : task.stato === "in_corso" ? "text-blue-500" : "text-stone-300 hover:text-wine-600"
                  )}
                >
                  {isDone ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn(
                      "font-medium text-stone-800 text-sm",
                      isDone && "line-through text-stone-400"
                    )}>
                      {task.titolo}
                    </span>
                    <PrioritaBadge p={task.priorita} />
                    {task.stato === "in_corso" && (
                      <span className="badge-blu">
                        <AlertCircle size={10} /> In corso
                      </span>
                    )}
                  </div>

                  {task.descrizione && (
                    <p className="text-xs text-stone-400 mb-2 line-clamp-2">{task.descrizione}</p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    {task.scadenza?.toDate && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        isScaduto ? "text-red-500" : "text-stone-400"
                      )}>
                        <Calendar size={11} />
                        {task.scadenza.toDate().toLocaleDateString("it-IT")}
                        {isScaduto && " ⚠️ Scaduto"}
                      </div>
                    )}
                    {task.entitaCollegata && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Link2 size={11} />
                        {task.entitaCollegata.tipo === "ordine" ? "Ordine" :
                         task.entitaCollegata.tipo === "imbottigliamento" ? "Imbottigliamento" : "Etichettatura"}
                        : {task.entitaCollegata.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stato testuale */}
                <div className="shrink-0 hidden group-hover:block">
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-stone-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className={cn(
                  "shrink-0 text-xs font-medium transition-all",
                  task.stato === "da_fare" ? "text-stone-400" :
                  task.stato === "in_corso" ? "text-blue-600" : "text-emerald-600",
                  "group-hover:hidden"
                )}>
                  {STATO_LABELS[task.stato]}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nuovo Task */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(emptyForm); }} title="Nuovo Task">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-base">Titolo *</label>
            <input className="input-base" placeholder="Cosa bisogna fare?"
              value={form.titolo}
              onChange={(e) => setForm({ ...form, titolo: e.target.value })} required />
          </div>
          <div>
            <label className="label-base">Descrizione</label>
            <textarea className="input-base resize-none" rows={2} placeholder="Dettagli opzionali"
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Priorità</label>
              <select className="input-base" value={form.priorita}
                onChange={(e) => setForm({ ...form, priorita: e.target.value as Priorita })}>
                <option value="bassa">⚪ Bassa</option>
                <option value="media">🟡 Media</option>
                <option value="alta">🔴 Alta</option>
              </select>
            </div>
            <div>
              <label className="label-base">Stato iniziale</label>
              <select className="input-base" value={form.stato}
                onChange={(e) => setForm({ ...form, stato: e.target.value as StatoTask })}>
                <option value="da_fare">Da fare</option>
                <option value="in_corso">In corso</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-base">Scadenza (opzionale)</label>
            <input type="date" className="input-base"
              value={form.scadenza}
              onChange={(e) => setForm({ ...form, scadenza: e.target.value })} />
          </div>

          {/* Collega entità */}
          <div className="border-t border-stone-100 pt-4">
            <label className="label-base">Collega a (opzionale)</label>
            <select className="input-base mb-2" value={form.entitaTipo}
              onChange={(e) => setForm({ ...form, entitaTipo: e.target.value as typeof form.entitaTipo, entitaId: "" })}>
              <option value="">— Nessun collegamento —</option>
              <option value="ordine">Ordine</option>
              <option value="imbottigliamento">Task Imbottigliamento</option>
            </select>

            {form.entitaTipo === "ordine" && (
              <select className="input-base" value={form.entitaId}
                onChange={(e) => setForm({ ...form, entitaId: e.target.value })}>
                <option value="">— Seleziona ordine —</option>
                {ordini.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nomeCliente} — {o.totaleBottiglie} bt
                  </option>
                ))}
              </select>
            )}

            {form.entitaTipo === "imbottigliamento" && (
              <select className="input-base" value={form.entitaId}
                onChange={(e) => setForm({ ...form, entitaId: e.target.value })}>
                <option value="">— Seleziona task —</option>
                {taskImb.filter((t) => t.stato !== "completato").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nomeVaso} — {t.bottiglieStimate.toLocaleString("it-IT")} bt stimate
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setForm(emptyForm); }}
              className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvo…" : "✓ Aggiungi Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
