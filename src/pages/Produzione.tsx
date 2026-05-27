import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy, where
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { TaskImbottigliamento, TaskEtichettatura, ArticoloMagazzino, Ricetta } from "@/types";
import { formatLitri, litriToBottiglie, cn } from "@/lib/utils";
import {
  FlaskConical, Tag, X, Plus, CheckCircle2, Clock,
  AlertCircle, ChevronDown, ChevronUp, Trash2
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

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

function StatoBadge({ stato }: { stato: string }) {
  switch (stato) {
    case "aperto": return <span className="badge-giallo"><Clock size={10} /> Aperto</span>;
    case "in_corso": return <span className="badge-blu"><AlertCircle size={10} /> In Corso</span>;
    case "completato": return <span className="badge-verde"><CheckCircle2 size={10} /> Completato</span>;
    case "annullato": return <span className="badge-grigio">Annullato</span>;
    default: return null;
  }
}

export default function Produzione() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"imbottigliamento" | "etichettatura">(
    searchParams.get("tab") === "etichettatura" ? "etichettatura" : "imbottigliamento"
  );

  // Data
  const [taskImb, setTaskImb] = useState<TaskImbottigliamento[]>([]);
  const [taskEt, setTaskEt] = useState<TaskEtichettatura[]>([]);
  const [articoli, setArticoli] = useState<ArticoloMagazzino[]>([]);
  const [ricette, setRicette] = useState<Ricetta[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal chiusura imbottigliamento
  const [showChiudi, setShowChiudi] = useState(false);
  const [taskSelezionato, setTaskSelezionato] = useState<TaskImbottigliamento | null>(null);
  const [bottiglieReali, setBottiglieReali] = useState("");

  // Modal nuova ricetta
  const [showRicetta, setShowRicetta] = useState(false);
  const [ricettaForm, setRicettaForm] = useState({
    nome: "", descrizione: "", tipoVino: "",
    componenti: [{ articoloId: "", nomeArticolo: "", quantitaPerBottiglia: "", unitaMisura: "pz" }]
  });

  // Modal nuova etichettatura
  const [showNuovaEt, setShowNuovaEt] = useState(false);
  const [etForm, setEtForm] = useState({ ricettaId: "", quantitaBottiglie: "", note: "" });

  const [saving, setSaving] = useState(false);

  async function loadAll() {
    const [imbSnap, etSnap, artSnap, ricSnap] = await Promise.all([
      getDocs(query(collection(db, "task_imbottigliamento"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "task_etichettatura"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "magazzino")),
      getDocs(collection(db, "ricette")),
    ]);

    setTaskImb(imbSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskImbottigliamento)));
    setTaskEt(etSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskEtichettatura)));
    setArticoli(artSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticoloMagazzino)));
    setRicette(ricSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Ricetta)));
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  // ── Chiudi task imbottigliamento ─────────────────────────
  async function handleChiudiTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskSelezionato) return;
    const bottiglie = parseInt(bottiglieReali);
    if (isNaN(bottiglie) || bottiglie <= 0) return;

    setSaving(true);
    try {
      const litriEffettivi = bottiglie * 0.75;

      // 1. Scala i litri dalla vasca
      await updateDoc(doc(db, "vasi_vinari", taskSelezionato.vasoId), {
        litriAttuali: (await getDocs(collection(db, "vasi_vinari")))
          .docs.find((d) => d.id === taskSelezionato.vasoId)?.data()?.litriAttuali - litriEffettivi,
        updatedAt: serverTimestamp(),
      });

      // 2. Scala bottiglie vuote dal magazzino materiali secchi (primo trovato)
      const bottigliaArt = articoli.find(
        (a) => a.tipo === "materiali_secchi" && a.nome.toLowerCase().includes("bottiglia")
      );
      if (bottigliaArt) {
        await updateDoc(doc(db, "magazzino", bottigliaArt.id), {
          quantita: Math.max(0, bottigliaArt.quantita - bottiglie),
          updatedAt: serverTimestamp(),
        });
      }

      // 3. Aggiunge al vetro nudo
      const vetroArt = articoli.find((a) => a.tipo === "vetro_nudo");
      if (vetroArt) {
        await updateDoc(doc(db, "magazzino", vetroArt.id), {
          quantita: vetroArt.quantita + bottiglie,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "magazzino"), {
          nome: `Vetro Nudo — ${taskSelezionato.nomeVaso}`,
          tipo: "vetro_nudo",
          quantita: bottiglie,
          unitaMisura: "bt",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 4. Aggiorna il task
      await updateDoc(doc(db, "task_imbottigliamento", taskSelezionato.id), {
        stato: "completato",
        bottiglieReali: bottiglie,
        litriEffettivi,
        completatoAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowChiudi(false);
      setTaskSelezionato(null);
      setBottiglieReali("");
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  // ── Salva ricetta ────────────────────────────────────────
  async function handleSalvaRicetta(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const componenti = ricettaForm.componenti
        .filter((c) => c.articoloId)
        .map((c) => ({
          articoloId: c.articoloId,
          nomeArticolo: articoli.find((a) => a.id === c.articoloId)?.nome || c.nomeArticolo,
          quantitaPerBottiglia: parseFloat(c.quantitaPerBottiglia || "0"),
          unitaMisura: c.unitaMisura,
        }));

      await addDoc(collection(db, "ricette"), {
        nome: ricettaForm.nome,
        descrizione: ricettaForm.descrizione,
        tipoVino: ricettaForm.tipoVino,
        componenti,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowRicetta(false);
      setRicettaForm({ nome: "", descrizione: "", tipoVino: "",
        componenti: [{ articoloId: "", nomeArticolo: "", quantitaPerBottiglia: "", unitaMisura: "pz" }] });
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  // ── Avvia etichettatura ──────────────────────────────────
  async function handleAvviaEtichettatura(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const ricetta = ricette.find((r) => r.id === etForm.ricettaId);
      if (!ricetta) return;
      const quantita = parseInt(etForm.quantitaBottiglie);

      // Scala dal vetro nudo
      const vetroArt = articoli.find((a) => a.tipo === "vetro_nudo");
      if (vetroArt && vetroArt.quantita >= quantita) {
        await updateDoc(doc(db, "magazzino", vetroArt.id), {
          quantita: vetroArt.quantita - quantita,
          updatedAt: serverTimestamp(),
        });
      }

      // Scala i materiali secchi per i componenti della ricetta
      for (const comp of ricetta.componenti) {
        const art = articoli.find((a) => a.id === comp.articoloId);
        if (art) {
          const totale = comp.quantitaPerBottiglia * quantita;
          await updateDoc(doc(db, "magazzino", art.id), {
            quantita: Math.max(0, art.quantita - totale),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Incrementa prodotto finito
      const finitoArt = articoli.find(
        (a) => a.tipo === "prodotto_finito" && a.nome === ricetta.nome
      );
      if (finitoArt) {
        await updateDoc(doc(db, "magazzino", finitoArt.id), {
          quantita: finitoArt.quantita + quantita,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "magazzino"), {
          nome: ricetta.nome,
          tipo: "prodotto_finito",
          quantita,
          unitaMisura: "bt",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Crea il task
      await addDoc(collection(db, "task_etichettatura"), {
        tipo: "etichettatura",
        stato: "completato",
        ricettaId: ricetta.id,
        nomeRicetta: ricetta.nome,
        quantitaBottiglie: quantita,
        note: etForm.note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completatoAt: serverTimestamp(),
        utenteId: user?.uid ?? "",
      });

      setShowNuovaEt(false);
      setEtForm({ ricettaId: "", quantitaBottiglie: "", note: "" });
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-wine-200 border-t-wine-700 rounded-full animate-spin" />
      </div>
    );
  }

  const vetroNudo = articoli.filter((a) => a.tipo === "vetro_nudo")
    .reduce((s, a) => s + a.quantita, 0);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="section-title">Produzione</h1>
          <p className="section-sub">
            Imbottigliamento e etichettatura · Vetro nudo disponibile:{" "}
            <strong>{vetroNudo.toLocaleString("it-IT")} bt</strong>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "imbottigliamento", label: "🫙 Imbottigliamento", count: taskImb.filter(t => t.stato === "aperto" || t.stato === "in_corso").length },
          { key: "etichettatura", label: "🏷️ Etichettatura & Ricette", count: ricette.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border",
              activeTab === tab.key
                ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-mono",
                activeTab === tab.key ? "bg-white/20" : "bg-stone-100 text-stone-500"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB IMBOTTIGLIAMENTO ──────────────────────────── */}
      {activeTab === "imbottigliamento" && (
        <div>
          <div className="text-xs text-stone-400 mb-4 font-body italic">
            💡 I task di imbottigliamento vengono creati dalla sezione "Cantina & Vasi" → "A Imbottiglia".
            Qui puoi gestire e chiudere i task aperti.
          </div>

          {taskImb.length === 0 ? (
            <div className="card-base flex flex-col items-center justify-center py-20 text-center">
              <FlaskConical size={40} className="text-stone-300 mb-4" />
              <p className="font-display text-lg text-stone-500 mb-1">Nessun task di imbottigliamento</p>
              <p className="text-sm text-stone-400">Vai in Cantina e premi "A Imbottiglia" su una vasca.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskImb.map((task) => (
                <div key={task.id} className="card-base p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-display text-base text-stone-800">{task.nomeVaso}</span>
                        <StatoBadge stato={task.stato} />
                      </div>
                      <div className="text-sm text-stone-500 space-x-4">
                        <span>📐 Pianificati: <strong>{formatLitri(task.litriPianificati)}</strong></span>
                        <span>🍾 Stimate: <strong>{task.bottiglieStimate.toLocaleString("it-IT")} bt</strong></span>
                        {task.bottiglieReali != null && (
                          <span className="text-emerald-700">
                            ✓ Reali: <strong>{task.bottiglieReali.toLocaleString("it-IT")} bt</strong>
                          </span>
                        )}
                      </div>
                      {task.note && <p className="text-xs text-stone-400 mt-1 italic">{task.note}</p>}
                    </div>

                    {(task.stato === "aperto" || task.stato === "in_corso") && (
                      <button
                        onClick={() => { setTaskSelezionato(task); setShowChiudi(true); }}
                        className="btn-primary text-sm flex items-center gap-2 shrink-0 ml-4"
                      >
                        <CheckCircle2 size={14} />
                        Chiudi Task
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB ETICHETTATURA ────────────────────────────── */}
      {activeTab === "etichettatura" && (
        <div>
          {/* Azioni */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowNuovaEt(true)}
              disabled={ricette.length === 0 || vetroNudo === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Tag size={16} /> Avvia Etichettatura
            </button>
            <button onClick={() => setShowRicetta(true)} className="btn-secondary flex items-center gap-2">
              <Plus size={16} /> Nuova Ricetta
            </button>
          </div>

          {vetroNudo === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5 text-sm text-amber-700">
              ⚠️ Nessun vetro nudo disponibile in magazzino. Prima esegui un imbottigliamento.
            </div>
          )}

          {/* Ricette */}
          <h2 className="font-display text-base text-stone-700 mb-3">Distinte Base / Ricette</h2>
          {ricette.length === 0 ? (
            <div className="card-base flex flex-col items-center justify-center py-14 text-center">
              <Tag size={36} className="text-stone-300 mb-4" />
              <p className="font-display text-lg text-stone-500 mb-1">Nessuna ricetta</p>
              <p className="text-sm text-stone-400">Crea la prima distinta base per definire i materiali necessari per etichetta.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ricette.map((r) => (
                <div key={r.id} className="card-base p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-display text-base text-stone-800">{r.nome}</div>
                      {r.tipoVino && (
                        <div className="text-xs text-stone-400 mt-0.5">{r.tipoVino}</div>
                      )}
                      {r.descrizione && (
                        <div className="text-xs text-stone-500 mt-1 italic">{r.descrizione}</div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {r.componenti.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">{c.nomeArticolo}</span>
                        <span className="font-mono text-stone-500">
                          {c.quantitaPerBottiglia} {c.unitaMisura}/bt
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Storico etichettature */}
          {taskEt.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-base text-stone-700 mb-3">Storico Etichettature</h2>
              <div className="space-y-2">
                {taskEt.map((t) => (
                  <div key={t.id} className="card-base px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-stone-700 text-sm">{t.nomeRicetta}</span>
                      <span className="text-stone-400 text-sm ml-3">
                        {t.quantitaBottiglie.toLocaleString("it-IT")} bt
                      </span>
                    </div>
                    <StatoBadge stato={t.stato} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Chiudi Task Imbottigliamento ─────────── */}
      <Modal
        open={showChiudi}
        onClose={() => { setShowChiudi(false); setTaskSelezionato(null); }}
        title="Chiudi Task Imbottigliamento"
      >
        <form onSubmit={handleChiudiTask} className="space-y-4">
          <div className="bg-stone-50 rounded-lg px-4 py-3">
            <div className="text-xs text-stone-500 mb-2">Riepilogo</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Vasca</span>
                <span className="font-medium">{taskSelezionato?.nomeVaso}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Litri pianificati</span>
                <span className="font-medium">{formatLitri(taskSelezionato?.litriPianificati ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Bottiglie stimate</span>
                <span className="font-medium">{taskSelezionato?.bottiglieStimate.toLocaleString("it-IT")} bt</span>
              </div>
            </div>
          </div>
          <div>
            <label className="label-base">Bottiglie Realmente Prodotte *</label>
            <input
              type="number" min="1" className="input-base"
              placeholder={String(taskSelezionato?.bottiglieStimate ?? "")}
              value={bottiglieReali}
              onChange={(e) => setBottiglieReali(e.target.value)} required
            />
            {bottiglieReali && (
              <div className="text-xs text-stone-400 mt-1">
                Litri effettivi: {(parseFloat(bottiglieReali) * 0.75).toFixed(1)} L
              </div>
            )}
          </div>
          <div className="bg-wine-50 border border-wine-100 rounded-lg px-4 py-3 text-xs text-wine-700">
            Alla chiusura: i litri verranno scalati dalla vasca, le bottiglie vuote e tappi
            scalati dai materiali secchi, e le bottiglie aggiunte al Vetro Nudo.
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button"
              onClick={() => { setShowChiudi(false); setTaskSelezionato(null); }}
              className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Chiudo…" : "✓ Chiudi e Conferma"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Nuova Ricetta ─────────────────────────── */}
      <Modal open={showRicetta} onClose={() => setShowRicetta(false)} title="Nuova Distinta Base / Ricetta">
        <form onSubmit={handleSalvaRicetta} className="space-y-4">
          <div>
            <label className="label-base">Nome Prodotto / Etichetta *</label>
            <input className="input-base" placeholder="es. Malies Rosso Riserva 2022"
              value={ricettaForm.nome}
              onChange={(e) => setRicettaForm({ ...ricettaForm, nome: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Tipo Vino</label>
              <input className="input-base" placeholder="es. Montepulciano"
                value={ricettaForm.tipoVino}
                onChange={(e) => setRicettaForm({ ...ricettaForm, tipoVino: e.target.value })} />
            </div>
            <div>
              <label className="label-base">Descrizione</label>
              <input className="input-base" placeholder="Opzionale"
                value={ricettaForm.descrizione}
                onChange={(e) => setRicettaForm({ ...ricettaForm, descrizione: e.target.value })} />
            </div>
          </div>

          {/* Componenti */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-base mb-0">Componenti (per bottiglia)</label>
              <button type="button" onClick={() =>
                setRicettaForm({
                  ...ricettaForm,
                  componenti: [...ricettaForm.componenti,
                    { articoloId: "", nomeArticolo: "", quantitaPerBottiglia: "", unitaMisura: "pz" }]
                })
              } className="text-xs text-wine-700 hover:text-wine-900 font-medium">
                + Aggiungi
              </button>
            </div>
            <div className="space-y-2">
              {ricettaForm.componenti.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className="input-base flex-1" value={c.articoloId}
                    onChange={(e) => {
                      const updated = [...ricettaForm.componenti];
                      updated[i] = { ...updated[i], articoloId: e.target.value };
                      setRicettaForm({ ...ricettaForm, componenti: updated });
                    }}>
                    <option value="">— Articolo —</option>
                    {articoli.filter((a) => a.tipo === "materiali_secchi").map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                  <input type="number" min="0" step="0.001" placeholder="Qty"
                    className="input-base w-20"
                    value={c.quantitaPerBottiglia}
                    onChange={(e) => {
                      const updated = [...ricettaForm.componenti];
                      updated[i] = { ...updated[i], quantitaPerBottiglia: e.target.value };
                      setRicettaForm({ ...ricettaForm, componenti: updated });
                    }} />
                  {ricettaForm.componenti.length > 1 && (
                    <button type="button" onClick={() => {
                      setRicettaForm({
                        ...ricettaForm,
                        componenti: ricettaForm.componenti.filter((_, j) => j !== i)
                      });
                    }} className="text-stone-300 hover:text-red-500 shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowRicetta(false)} className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvo…" : "Salva Ricetta"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Avvia Etichettatura ───────────────────── */}
      <Modal open={showNuovaEt} onClose={() => setShowNuovaEt(false)} title="Avvia Etichettatura">
        <form onSubmit={handleAvviaEtichettatura} className="space-y-4">
          <div className="bg-stone-50 rounded-lg px-4 py-3 text-sm">
            <span className="text-stone-500">Vetro nudo disponibile: </span>
            <span className="font-display text-lg text-stone-800">{vetroNudo.toLocaleString("it-IT")} bt</span>
          </div>
          <div>
            <label className="label-base">Ricetta / Etichetta *</label>
            <select className="input-base" value={etForm.ricettaId}
              onChange={(e) => setEtForm({ ...etForm, ricettaId: e.target.value })} required>
              <option value="">— Seleziona ricetta —</option>
              {ricette.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Numero Bottiglie *</label>
            <input type="number" min="1" max={vetroNudo} className="input-base"
              placeholder={`Max ${vetroNudo}`}
              value={etForm.quantitaBottiglie}
              onChange={(e) => setEtForm({ ...etForm, quantitaBottiglie: e.target.value })} required />
          </div>
          {etForm.ricettaId && etForm.quantitaBottiglie && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-xs text-emerald-700">
              <div className="font-medium mb-1">Materiali che verranno scalati:</div>
              {ricette.find((r) => r.id === etForm.ricettaId)?.componenti.map((c, i) => (
                <div key={i}>
                  • {c.nomeArticolo}: {(c.quantitaPerBottiglia * parseInt(etForm.quantitaBottiglie || "0")).toFixed(0)} {c.unitaMisura}
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="label-base">Note</label>
            <input className="input-base" placeholder="Opzionale"
              value={etForm.note}
              onChange={(e) => setEtForm({ ...etForm, note: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNuovaEt(false)} className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Avvio…" : "🏷️ Avvia Etichettatura"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
