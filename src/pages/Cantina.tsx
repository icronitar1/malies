import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, Timestamp
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { VasoVinario } from "@/types";
import { formatLitri, percentuale, litriToBottiglie, cn } from "@/lib/utils";
import {
  Plus, ArrowRightLeft, FlaskConical, Droplets, MoreHorizontal,
  X, ChevronRight, Pencil
} from "lucide-react";

// ── Modal wrapper ────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 dialog-overlay" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md
                      animate-slide-up border border-stone-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h3 className="font-display text-lg text-stone-800">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Barra di riempimento ────────────────────────────────────
function FillBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(percent, 100)}%`, background: color }}
      />
    </div>
  );
}

// ── Colori per i tipi di vino ───────────────────────────────
const WINE_COLORS: Record<string, { bg: string; fill: string }> = {
  "Rosso":     { bg: "bg-wine-100",       fill: "#ac2145" },
  "Bianco":    { bg: "bg-amber-50",       fill: "#d4a017" },
  "Rosato":    { bg: "bg-pink-50",        fill: "#e9687a" },
  "Spumante":  { bg: "bg-blue-50",        fill: "#4a7ecf" },
  "Altro":     { bg: "bg-stone-100",      fill: "#8e8e8e" },
};

function getWineColor(tipo: string) {
  return WINE_COLORS[tipo] ?? { bg: "bg-stone-100", fill: "#8e8e8e" };
}

export default function Cantina() {
  const { user } = useAuth();
  const [vasi, setVasi] = useState<VasoVinario[]>([]);
  const [loading, setLoading] = useState(true);

  // Modali
  const [showAddVaso, setShowAddVaso] = useState(false);
  const [showTrasferimento, setShowTrasferimento] = useState(false);
  const [showImbottigliamento, setShowImbottigliamento] = useState(false);
  const [selectedVaso, setSelectedVaso] = useState<VasoVinario | null>(null);

  // Form add vaso
  const [form, setForm] = useState({
    nome: "", capacitaTotale: "", litriAttuali: "",
    tipoVino: "Rosso", note: ""
  });

  // Form trasferimento
  const [trasfForm, setTrasfForm] = useState({
    aVasoId: "", litri: "", note: ""
  });

  // Form imbottigliamento
  const [imbForm, setImbForm] = useState({ litriPianificati: "", note: "" });
  const [saving, setSaving] = useState(false);

  async function loadVasi() {
    const snap = await getDocs(collection(db, "vasi_vinari"));
    setVasi(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VasoVinario)));
    setLoading(false);
  }

  useEffect(() => { loadVasi(); }, []);

  // ── Aggiunta vaso ────────────────────────────────────────
  async function handleAddVaso(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "vasi_vinari"), {
        nome: form.nome,
        capacitaTotale: parseFloat(form.capacitaTotale),
        litriAttuali: parseFloat(form.litriAttuali || "0"),
        tipoVino: form.tipoVino,
        note: form.note,
        colore: getWineColor(form.tipoVino).fill,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm({ nome: "", capacitaTotale: "", litriAttuali: "", tipoVino: "Rosso", note: "" });
      setShowAddVaso(false);
      loadVasi();
    } finally {
      setSaving(false);
    }
  }

  // ── Trasferimento ────────────────────────────────────────
  async function handleTrasferimento(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVaso) return;
    const litri = parseFloat(trasfForm.litri);
    if (litri <= 0 || litri > selectedVaso.litriAttuali) return;

    setSaving(true);
    try {
      const destinazione = vasi.find((v) => v.id === trasfForm.aVasoId);
      if (!destinazione) return;

      // Aggiorna sorgente
      await updateDoc(doc(db, "vasi_vinari", selectedVaso.id), {
        litriAttuali: selectedVaso.litriAttuali - litri,
        updatedAt: serverTimestamp(),
      });
      // Aggiorna destinazione
      await updateDoc(doc(db, "vasi_vinari", destinazione.id), {
        litriAttuali: destinazione.litriAttuali + litri,
        updatedAt: serverTimestamp(),
      });
      // Log trasferimento
      await addDoc(collection(db, "trasferimenti"), {
        daVasoId: selectedVaso.id,
        aVasoId: destinazione.id,
        litri,
        data: serverTimestamp(),
        note: trasfForm.note,
        utenteId: user?.uid ?? "",
      });

      setTrasfForm({ aVasoId: "", litri: "", note: "" });
      setShowTrasferimento(false);
      setSelectedVaso(null);
      loadVasi();
    } finally {
      setSaving(false);
    }
  }

  // ── Avvia Imbottigliamento ───────────────────────────────
  async function handleAvviaImbottigliamento(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVaso) return;
    const litri = parseFloat(imbForm.litriPianificati);
    if (litri <= 0 || litri > selectedVaso.litriAttuali) return;

    setSaving(true);
    try {
      const bottiglieStimate = litriToBottiglie(litri);

      await addDoc(collection(db, "task_imbottigliamento"), {
        tipo: "imbottigliamento",
        stato: "aperto",
        vasoId: selectedVaso.id,
        nomeVaso: selectedVaso.nome,
        litriPianificati: litri,
        bottiglieStimate,
        note: imbForm.note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        utenteId: user?.uid ?? "",
      });

      setImbForm({ litriPianificati: "", note: "" });
      setShowImbottigliamento(false);
      setSelectedVaso(null);
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

  const litriTotali = vasi.reduce((s, v) => s + v.litriAttuali, 0);
  const capacitaTotale = vasi.reduce((s, v) => s + v.capacitaTotale, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="section-title">Cantina & Vasi Vinari</h1>
          <p className="section-sub">
            {formatLitri(litriTotali)} su {formatLitri(capacitaTotale)} totali ·{" "}
            {percentuale(litriTotali, capacitaTotale)}% occupato
          </p>
        </div>
        <button
          onClick={() => setShowAddVaso(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nuovo Vaso
        </button>
      </div>

      {/* Griglia vasi */}
      {vasi.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-4">🛢️</div>
          <p className="font-display text-lg text-stone-600 mb-1">Nessun vaso registrato</p>
          <p className="text-sm text-stone-400">Aggiungi il primo vaso vinario per iniziare.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {vasi.map((vaso) => {
            const pct = percentuale(vaso.litriAttuali, vaso.capacitaTotale);
            const wc = getWineColor(vaso.tipoVino);
            return (
              <div
                key={vaso.id}
                className="card-base p-5 hover:shadow-card-hover transition-all duration-200"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-display text-lg text-stone-800 mb-0.5">{vaso.nome}</div>
                    <span className={cn(
                      "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                      wc.bg,
                      "text-stone-600 border border-stone-200"
                    )}>
                      {vaso.tipoVino}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-medium text-stone-700">{pct}%</div>
                    <div className="text-xs text-stone-400">{formatLitri(vaso.capacitaTotale)}</div>
                  </div>
                </div>

                {/* Fill bar */}
                <FillBar percent={pct} color={vaso.colore || wc.fill} />

                {/* Litri */}
                <div className="flex items-center gap-2 mt-3 mb-5">
                  <Droplets size={14} className="text-stone-400" />
                  <span className="font-display text-xl text-stone-800">
                    {formatLitri(vaso.litriAttuali)}
                  </span>
                  <span className="text-xs text-stone-400">/ {formatLitri(vaso.capacitaTotale)}</span>
                </div>

                {vaso.note && (
                  <p className="text-xs text-stone-400 italic mb-4 line-clamp-2">{vaso.note}</p>
                )}

                {/* Azioni */}
                <div className="flex gap-2 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => { setSelectedVaso(vaso); setShowTrasferimento(true); }}
                    disabled={vaso.litriAttuali === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 btn-secondary
                               text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowRightLeft size={13} />
                    Trasferisci
                  </button>
                  <button
                    onClick={() => { setSelectedVaso(vaso); setShowImbottigliamento(true); }}
                    disabled={vaso.litriAttuali === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 btn-primary
                               text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FlaskConical size={13} />
                    A Imbottiglia
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Aggiungi Vaso ────────────────────────── */}
      <Modal open={showAddVaso} onClose={() => setShowAddVaso(false)} title="Nuovo Vaso Vinario">
        <form onSubmit={handleAddVaso} className="space-y-4">
          <div>
            <label className="label-base">Nome Vaso *</label>
            <input className="input-base" placeholder="es. Vasca 1 – Barrique Nord"
              value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Capacità (L) *</label>
              <input type="number" min="1" className="input-base" placeholder="5000"
                value={form.capacitaTotale}
                onChange={(e) => setForm({ ...form, capacitaTotale: e.target.value })} required />
            </div>
            <div>
              <label className="label-base">Litri Attuali</label>
              <input type="number" min="0" className="input-base" placeholder="0"
                value={form.litriAttuali}
                onChange={(e) => setForm({ ...form, litriAttuali: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-base">Tipo Vino *</label>
            <select className="input-base" value={form.tipoVino}
              onChange={(e) => setForm({ ...form, tipoVino: e.target.value })}>
              {Object.keys(WINE_COLORS).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">Note</label>
            <textarea className="input-base resize-none" rows={2} placeholder="Opzionale"
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddVaso(false)} className="btn-secondary flex-1">
              Annulla
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvo…" : "Aggiungi Vaso"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Trasferimento ────────────────────────── */}
      <Modal
        open={showTrasferimento}
        onClose={() => { setShowTrasferimento(false); setSelectedVaso(null); }}
        title={`Trasferimento da ${selectedVaso?.nome}`}
      >
        <form onSubmit={handleTrasferimento} className="space-y-4">
          <div className="bg-cream-100 rounded-lg px-4 py-3 flex items-center gap-3">
            <Droplets size={16} className="text-wine-600" />
            <div>
              <div className="text-xs text-stone-500">Disponibili nel vaso sorgente</div>
              <div className="font-display text-lg text-stone-800">
                {formatLitri(selectedVaso?.litriAttuali ?? 0)}
              </div>
            </div>
          </div>
          <div>
            <label className="label-base">Vaso Destinazione *</label>
            <select className="input-base" value={trasfForm.aVasoId}
              onChange={(e) => setTrasfForm({ ...trasfForm, aVasoId: e.target.value })} required>
              <option value="">— Seleziona —</option>
              {vasi
                .filter((v) => v.id !== selectedVaso?.id)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome} ({formatLitri(v.capacitaTotale - v.litriAttuali)} liberi)
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label-base">Litri da Trasferire *</label>
            <input type="number" min="1" max={selectedVaso?.litriAttuali}
              className="input-base" placeholder="0"
              value={trasfForm.litri}
              onChange={(e) => setTrasfForm({ ...trasfForm, litri: e.target.value })} required />
          </div>
          <div>
            <label className="label-base">Note</label>
            <input className="input-base" placeholder="Opzionale"
              value={trasfForm.note}
              onChange={(e) => setTrasfForm({ ...trasfForm, note: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowTrasferimento(false); setSelectedVaso(null); }}
              className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Trasferisco…" : "Conferma Trasferimento"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: A Imbottiglia ────────────────────────── */}
      <Modal
        open={showImbottigliamento}
        onClose={() => { setShowImbottigliamento(false); setSelectedVaso(null); }}
        title={`Imbottigliamento — ${selectedVaso?.nome}`}
      >
        <form onSubmit={handleAvviaImbottigliamento} className="space-y-4">
          <div className="bg-wine-50 border border-wine-100 rounded-lg px-4 py-3">
            <div className="text-xs text-wine-700 mb-1 font-medium">Vaso selezionato</div>
            <div className="font-display text-lg text-wine-800">{selectedVaso?.nome}</div>
            <div className="text-sm text-wine-600">
              Disponibili: {formatLitri(selectedVaso?.litriAttuali ?? 0)}
            </div>
          </div>
          <div>
            <label className="label-base">Litri da Imbottigliare *</label>
            <input
              type="number" min="1" max={selectedVaso?.litriAttuali}
              step="0.1" className="input-base" placeholder="0"
              value={imbForm.litriPianificati}
              onChange={(e) => setImbForm({ ...imbForm, litriPianificati: e.target.value })} required
            />
          </div>

          {imbForm.litriPianificati && parseFloat(imbForm.litriPianificati) > 0 && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
              <div className="text-xs text-stone-500 mb-1">Bottiglie stimate (0.75 L cad.)</div>
              <div className="font-display text-2xl text-stone-800">
                {litriToBottiglie(parseFloat(imbForm.litriPianificati)).toLocaleString("it-IT")}
                <span className="text-sm font-body font-normal text-stone-400 ml-2">bottiglie</span>
              </div>
            </div>
          )}

          <div>
            <label className="label-base">Note operative</label>
            <textarea className="input-base resize-none" rows={2} placeholder="Opzionale"
              value={imbForm.note}
              onChange={(e) => setImbForm({ ...imbForm, note: e.target.value })} />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700">
            ℹ️ Il task di imbottigliamento verrà creato come <strong>aperto</strong>. I litri verranno
            scalati dalla vasca solo alla chiusura del task, inserendo le bottiglie reali prodotte.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button"
              onClick={() => { setShowImbottigliamento(false); setSelectedVaso(null); }}
              className="btn-secondary flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Avvio…" : "🫙 Avvia Imbottigliamento"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
