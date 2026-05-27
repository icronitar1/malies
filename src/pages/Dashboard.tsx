import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { VasoVinario, ArticoloMagazzino, Ordine } from "@/types";
import { formatLitri, formatBottiglie } from "@/lib/utils";
import { Wine, Warehouse, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  vasiBuoni: number;
  vasiTotali: number;
  litriTotali: number;
  articoliSottoSoglia: number;
  vetroNudo: number;
  prodottoFinito: number;
  ordiniAperti: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [vasiSnap, magazzinoSnap, ordiniSnap] = await Promise.all([
          getDocs(collection(db, "vasi_vinari")),
          getDocs(collection(db, "magazzino")),
          getDocs(collection(db, "ordini")),
        ]);

        const vasi = vasiSnap.docs.map((d) => ({ id: d.id, ...d.data() } as VasoVinario));
        const articoli = magazzinoSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticoloMagazzino));
        const ordini = ordiniSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Ordine));

        const sottoSoglia = articoli.filter(
          (a) => a.sogliaMinimaAllerta != null && a.quantita < a.sogliaMinimaAllerta
        );

        const vetro = articoli
          .filter((a) => a.tipo === "vetro_nudo")
          .reduce((s, a) => s + a.quantita, 0);

        const finito = articoli
          .filter((a) => a.tipo === "prodotto_finito")
          .reduce((s, a) => s + a.quantita, 0);

        const ordAperti = ordini.filter(
          (o) => o.stato === "bozza" || o.stato === "confermato"
        ).length;

        setStats({
          vasiBuoni: vasi.filter((v) => v.litriAttuali > 0).length,
          vasiTotali: vasi.length,
          litriTotali: vasi.reduce((s, v) => s + v.litriAttuali, 0),
          articoliSottoSoglia: sottoSoglia.length,
          vetroNudo: vetro,
          prodottoFinito: finito,
          ordiniAperti: ordAperti,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-wine-200 border-t-wine-700 rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      label: "Litri in Cantina",
      value: stats ? formatLitri(stats.litriTotali) : "—",
      sub: stats ? `${stats.vasiBuoni} / ${stats.vasiTotali} vasi attivi` : "",
      icon: <Wine size={20} />,
      color: "bg-wine-700",
      to: "/cantina",
    },
    {
      label: "Vetro Nudo",
      value: stats ? formatBottiglie(stats.vetroNudo) : "—",
      sub: "Da etichettare",
      icon: <Warehouse size={20} />,
      color: "bg-terracotta-600",
      to: "/magazzino",
    },
    {
      label: "Prodotto Finito",
      value: stats ? formatBottiglie(stats.prodottoFinito) : "—",
      sub: "Pronto per vendita",
      icon: <TrendingUp size={20} />,
      color: "bg-emerald-700",
      to: "/magazzino",
    },
    {
      label: "Ordini Aperti",
      value: stats?.ordiniAperti ?? "—",
      sub: "In attesa di evasione",
      icon: <ShoppingCart size={20} />,
      color: "bg-blue-700",
      to: "/vendite",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title">Buongiorno, Malies 🍷</h1>
        <p className="section-sub">Panoramica della tua cantina in tempo reale.</p>
      </div>

      {/* Avvisi */}
      {stats && stats.articoliSottoSoglia > 0 && (
        <Link to="/magazzino" className="block mb-6">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4
                          hover:bg-amber-100 transition-colors duration-150">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-medium text-amber-800 text-sm">
                {stats.articoliSottoSoglia} articol{stats.articoliSottoSoglia === 1 ? "o" : "i"} sotto la soglia minima
              </span>
              <span className="text-amber-600 text-sm ml-2">→ Vai al Magazzino</span>
            </div>
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <div className="card-base p-5 hover:shadow-card-hover hover:-translate-y-0.5
                            transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center text-white shadow-sm`}>
                  {c.icon}
                </div>
                <span className="text-xs text-stone-400 font-body group-hover:text-wine-600 transition-colors">
                  →
                </span>
              </div>
              <div className="font-display text-2xl text-stone-800 mb-0.5">{c.value}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">{c.label}</div>
              <div className="text-xs text-stone-400 mt-1 font-body">{c.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="font-display text-lg text-stone-700 mb-4">Accesso Rapido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Avvia Imbottigliamento", to: "/produzione", emoji: "🫙" },
            { label: "Etichetta Bottiglie", to: "/produzione?tab=etichettatura", emoji: "🏷️" },
            { label: "Nuovo Ordine", to: "/vendite?new=1", emoji: "📦" },
          ].map((q) => (
            <Link key={q.label} to={q.to}>
              <div className="card-base px-5 py-4 flex items-center gap-4
                              hover:shadow-card-hover hover:-translate-y-0.5
                              transition-all duration-200 group cursor-pointer">
                <span className="text-2xl">{q.emoji}</span>
                <span className="text-sm font-medium text-stone-700 group-hover:text-wine-700 transition-colors">
                  {q.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
